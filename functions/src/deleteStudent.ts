import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { logger } from 'firebase-functions'
import * as admin from 'firebase-admin'

/**
 * Deletes a student account and everything attached to it.
 *
 * This lives in a Cloud Function rather than the client for a reason that is
 * not negotiable: the Firebase client SDK can only delete *the currently
 * signed-in user*. A teacher cannot delete a student's login from the browser
 * at all, which is why the only way to finish removing a student used to be
 * opening the Firebase Console by hand.
 *
 * Running here also means NO client-side Firestore rule has to be widened to
 * let a teacher delete another user's documents. The Admin SDK bypasses rules,
 * so the authorisation lives in one reviewable place: canDelete() below.
 *
 * Pass `dryRun: true` to get the same counts without deleting anything — the
 * confirmation dialog uses it so it can name the damage before the teacher
 * commits to it.
 */

// Every collection keyed by the learner's own uid on a `studentId` field.
// writingFeedback is included deliberately: it is written BY a teacher but is
// *about* this student, so it is part of their record and goes with them.
const STUDENT_ID_COLLECTIONS = [
  'annotations',
  'organizers',
  'readingProgress',
  'writingResponses',
  'writingFeedback',
] as const

// Firestore caps a batch at 500 writes.
const BATCH_LIMIT = 450

// Storage requests carry no deadline of their own, so an unreachable bucket
// leaves deleteFiles() pending until the whole function times out — and the
// teacher is told the deletion failed when the account is in fact still there.
// Same reason deleteTeacherBook races its own cleanup.
const STORAGE_CLEANUP_TIMEOUT_MS = 8000

type Counts = Record<string, number>

async function deleteByQuery(
  query: admin.firestore.Query,
  dryRun: boolean,
): Promise<number> {
  const snap = await query.get()
  if (snap.empty) return 0
  if (dryRun) return snap.size

  const db = admin.firestore()
  for (let i = 0; i < snap.docs.length; i += BATCH_LIMIT) {
    const batch = db.batch()
    snap.docs.slice(i, i + BATCH_LIMIT).forEach((d) => batch.delete(d.ref))
    await batch.commit()
  }
  return snap.size
}

/**
 * Two ways a teacher is allowed to delete a student, and only two:
 *
 *  1. The student is currently on the roster of a classroom this teacher owns.
 *  2. This teacher is the one who removed them from their classroom.
 *
 * (2) exists because removal clears `classroomId`, `studentIds` and every book
 * assignment — after it there is no link left between teacher and student at
 * all. Without the provenance that `removeStudentFromClassroom` now writes, a
 * teacher who un-enrolled someone first could never finish deleting them, which
 * is the exact dead end this whole function was built to fix.
 */
async function canDelete(
  callerUid: string,
  student: admin.firestore.DocumentData,
): Promise<boolean> {
  const classroomId = student.classroomId
  if (typeof classroomId === 'string' && classroomId.length > 0) {
    const classroom = await admin.firestore().collection('classrooms').doc(classroomId).get()
    return classroom.exists && classroom.data()?.teacherId === callerUid
  }
  return student.removedByTeacherId === callerUid
}

export const deleteStudentAccount = onCall(async (request) => {
  const callerUid = request.auth?.uid
  if (!callerUid) {
    throw new HttpsError('unauthenticated', 'Sign in required.')
  }

  const studentId = request.data?.studentId
  if (typeof studentId !== 'string' || studentId.length === 0) {
    throw new HttpsError('invalid-argument', 'studentId is required.')
  }
  if (studentId === callerUid) {
    // Deleting yourself through the teacher path would leave a classroom with
    // no owner and every one of its students unreachable.
    throw new HttpsError('failed-precondition', 'You cannot delete your own account here.')
  }
  const dryRun = request.data?.dryRun === true

  const db = admin.firestore()

  const callerSnap = await db.collection('users').doc(callerUid).get()
  if (callerSnap.data()?.role !== 'teacher') {
    throw new HttpsError('permission-denied', 'Only a teacher can remove a student account.')
  }

  const studentSnap = await db.collection('users').doc(studentId).get()
  if (!studentSnap.exists) {
    throw new HttpsError('not-found', 'That student account no longer exists.')
  }
  const student = studentSnap.data() as admin.firestore.DocumentData

  // Teachers and individual (self-serve, paying) accounts are never somebody
  // else's to delete, whatever the classroom links say.
  if (student.role !== 'student') {
    throw new HttpsError('permission-denied', 'Only a student account can be deleted this way.')
  }

  if (!(await canDelete(callerUid, student))) {
    throw new HttpsError('permission-denied', 'This student is not in a classroom you own.')
  }

  const counts: Counts = {}
  for (const collection of STUDENT_ID_COLLECTIONS) {
    counts[collection] = await deleteByQuery(
      db.collection(collection).where('studentId', '==', studentId),
      dryRun,
    )
  }

  // Personal (classroomId null) writing tasks the learner started themselves.
  counts.writingTasks = await deleteByQuery(
    db.collection('writingTasks').where('createdBy', '==', studentId),
    dryRun,
  )

  // Books the student uploaded themselves, plus their PDFs. Storage is deleted
  // by prefix rather than by parsing each download URL: student uploads all
  // live under student-books/{uid}/ (see uploadStudentBook).
  counts.books = await deleteByQuery(
    db.collection('books').where('uploadedBy', '==', studentId),
    dryRun,
  )

  // Memberships in other people's documents. Scoped by array-contains rather
  // than by this teacher's own classroom: the account is going away, so a uid
  // left behind in any roster or assignment list is just garbage.
  const classroomSnap = await db.collection('classrooms').where('studentIds', 'array-contains', studentId).get()
  const assignedSnap = await db.collection('books').where('assignedStudentIds', 'array-contains', studentId).get()
  counts.classroomMemberships = classroomSnap.size
  counts.bookAssignments = assignedSnap.size

  if (!dryRun) {
    const refs = [
      ...classroomSnap.docs.map((d) => ({ ref: d.ref, field: 'studentIds' })),
      ...assignedSnap.docs.map((d) => ({ ref: d.ref, field: 'assignedStudentIds' })),
    ]
    for (let i = 0; i < refs.length; i += BATCH_LIMIT) {
      const batch = db.batch()
      refs.slice(i, i + BATCH_LIMIT).forEach(({ ref, field }) => {
        batch.update(ref, { [field]: admin.firestore.FieldValue.arrayRemove(studentId) })
      })
      await batch.commit()
    }
  }

  if (dryRun) {
    return { dryRun: true, counts, displayName: student.displayName ?? '' }
  }

  // Auth before the profile document, and the profile document last. Both are
  // deliberate: while users/{studentId} still exists this call can be retried
  // and will still authorise, so a failure anywhere above is recoverable. Once
  // the profile is gone there is nothing left to authorise against, so it goes
  // when everything else has already succeeded.
  try {
    await admin.auth().deleteUser(studentId)
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code
    if (code !== 'auth/user-not-found') {
      logger.error(`Failed to delete auth user ${studentId}:`, err)
      throw new HttpsError('internal', 'Their data was removed but the login could not be deleted. Try again.')
    }
    logger.info(`Auth user ${studentId} was already gone; continuing.`)
  }

  await db.collection('users').doc(studentId).delete()

  // Their uploaded PDFs, last and strictly best effort. It runs AFTER the
  // account is gone, and against a clock, for the same reason deleteTeacherBook
  // does: the Firestore documents are the source of truth and are already
  // deleted by this point, so a slow or unreachable bucket must not be able to
  // fail — or stall — the deletion the teacher actually asked for. A stranded
  // blob is litter; a half-deleted account is a bug.
  if (counts.books > 0) {
    await Promise.race([
      admin.storage().bucket()
        .deleteFiles({ prefix: `student-books/${studentId}/` })
        .catch((err: unknown) => logger.warn(`Storage cleanup failed for student ${studentId}:`, err)),
      new Promise((resolve) => setTimeout(resolve, STORAGE_CLEANUP_TIMEOUT_MS)),
    ])
  }

  logger.info(`Teacher ${callerUid} deleted student ${studentId}`, counts)
  return { dryRun: false, counts, displayName: student.displayName ?? '' }
})
