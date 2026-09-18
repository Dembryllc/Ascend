import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { logger } from 'firebase-functions'
import { randomInt } from 'node:crypto'
import {
  getFirestore,
  FieldValue,
  Timestamp,
  type DocumentData,
  type Firestore,
} from 'firebase-admin/firestore'

// Classroom creation and enrolment, moved off the client.
//
// Both operations used to be client-side writes authorised by firestore.rules,
// and neither can actually be expressed there:
//
//  - Creating a classroom means proving its join code is unique, which means
//    reading every other classroom's code. A rule cannot run that query, and a
//    client that could would be reading the whole product's rosters.
//  - Joining a classroom means proving the caller knows the join code. The
//    code is never written into the document being changed, and a rule cannot
//    see the values a client filtered its query by, so the old rule checked
//    only that the caller was adding *themselves* — which every attacker also
//    is. Any signed-in account could enrol in any classroom in the product.
//
// Here the code is checked against the stored one before anything is written,
// which is the check that was missing. Both run as admin and bypass rules, so
// firestore.rules now denies classroom creation outright and no longer carries
// a self-add branch.

const JOIN_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const JOIN_CODE_LENGTH = 6
const JOIN_CODE_ATTEMPTS = 8

// Firestore caps a batch at 500 writes. Teachers assign their whole library on
// join, so a large library needs chunking.
const BATCH_LIMIT = 450

// A 6-character code out of a 32-character alphabet is ~1e9 possibilities, so
// guessing one is slow — but it is not rate-limited by anything else, and the
// prize is a real classroom's roster and PDFs. Wrong guesses are counted on the
// caller's own user document; the window is rolling and a success clears it.
const MAX_FAILED_JOINS = 10
const JOIN_WINDOW_MS = 60 * 60 * 1000

function generateJoinCode(): string {
  return Array.from(
    { length: JOIN_CODE_LENGTH },
    () => JOIN_CODE_ALPHABET[randomInt(JOIN_CODE_ALPHABET.length)],
  ).join('')
}

async function generateUniqueJoinCode(db: Firestore): Promise<string> {
  for (let i = 0; i < JOIN_CODE_ATTEMPTS; i += 1) {
    const joinCode = generateJoinCode()
    const existing = await db.collection('classrooms').where('joinCode', '==', joinCode).limit(1).get()
    if (existing.empty) return joinCode
  }
  throw new HttpsError('internal', 'Could not create a unique join code. Please try again.')
}

function requireUid(auth: { uid: string } | undefined): string {
  if (!auth?.uid) throw new HttpsError('unauthenticated', 'Sign in required.')
  return auth.uid
}

async function requireRole(
  db: Firestore,
  uid: string,
  role: 'teacher' | 'student',
): Promise<DocumentData> {
  const snap = await db.collection('users').doc(uid).get()
  const data = snap.data()
  if (!data) {
    throw new HttpsError('failed-precondition', 'Your account is still being set up. Please try again in a moment.')
  }
  if (data.role !== role) {
    throw new HttpsError('permission-denied', `Only a ${role} account can do this.`)
  }
  return data
}

/**
 * Creates the calling teacher's classroom with a server-generated join code.
 *
 * One per teacher: getClassroomByTeacher reads docs[0] and the UI only offers
 * creation when none exists, so a second classroom would be invisible anyway.
 */
export const createClassroom = onCall(async (request) => {
  const uid = requireUid(request.auth)
  const db = getFirestore()
  await requireRole(db, uid, 'teacher')

  const name = typeof request.data?.name === 'string' ? request.data.name.trim() : ''
  if (!name) throw new HttpsError('invalid-argument', 'A class name is required.')
  if (name.length > 100) throw new HttpsError('invalid-argument', 'That class name is too long.')

  const existing = await db.collection('classrooms').where('teacherId', '==', uid).limit(1).get()
  if (!existing.empty) {
    const doc = existing.docs[0]
    const data = doc.data()
    return {
      id: doc.id,
      name: data.name as string,
      teacherId: uid,
      joinCode: data.joinCode as string,
      studentIds: (data.studentIds ?? []) as string[],
    }
  }

  const joinCode = await generateUniqueJoinCode(db)
  const ref = await db.collection('classrooms').add({
    name,
    teacherId: uid,
    joinCode,
    studentIds: [],
    createdAt: FieldValue.serverTimestamp(),
  })

  logger.info(`Classroom ${ref.id} created for teacher ${uid}.`)
  return { id: ref.id, name, teacherId: uid, joinCode, studentIds: [] as string[] }
})

/**
 * Enrols the calling student in the classroom matching `joinCode`.
 *
 * Three writes, and all three matter — the same set removeStudentFromClassroom
 * has to undo:
 *  - classrooms.studentIds, which every teacher-side read is scoped by.
 *  - the student's own users/{uid}.classroomId, without which
 *    validAnnotationClassroomLink rejects every annotation they write.
 *  - assignedStudentIds on the teacher's existing books, which is what gives
 *    the student anything to read.
 */
export const joinClassroom = onCall(async (request) => {
  const uid = requireUid(request.auth)
  const db = getFirestore()
  const profile = await requireRole(db, uid, 'student')

  const raw = typeof request.data?.joinCode === 'string' ? request.data.joinCode : ''
  const joinCode = raw.toUpperCase().trim()
  if (joinCode.length !== JOIN_CODE_LENGTH) {
    throw new HttpsError('invalid-argument', 'Invalid join code. Check the code with your teacher.')
  }

  const throttle = (profile.joinThrottle ?? {}) as { failed?: number; since?: Timestamp }
  const since = throttle.since?.toMillis() ?? 0
  const withinWindow = Date.now() - since < JOIN_WINDOW_MS
  const failed = withinWindow ? (throttle.failed ?? 0) : 0
  if (failed >= MAX_FAILED_JOINS) {
    throw new HttpsError(
      'resource-exhausted',
      'Too many incorrect join codes. Please wait an hour, or ask your teacher for the code.',
    )
  }

  const match = await db.collection('classrooms').where('joinCode', '==', joinCode).limit(1).get()
  if (match.empty) {
    await db.collection('users').doc(uid).update({
      joinThrottle: {
        failed: failed + 1,
        since: withinWindow && throttle.since
          ? throttle.since
          : Timestamp.now(),
      },
    })
    throw new HttpsError('not-found', 'Invalid join code. Check the code with your teacher.')
  }

  const classroomDoc = match.docs[0]
  const classroomId = classroomDoc.id
  const teacherId = classroomDoc.data().teacherId as string

  const batch = db.batch()
  batch.update(classroomDoc.ref, { studentIds: FieldValue.arrayUnion(uid) })
  batch.update(db.collection('users').doc(uid), {
    classroomId,
    joinThrottle: FieldValue.delete(),
  })
  await batch.commit()

  // Assign the teacher's existing library. Best-effort and deliberately after
  // the commit above: a student who is enrolled but holds no books yet is a
  // recoverable state (the teacher can assign one), whereas a student holding
  // books they are not enrolled in is the hole this whole change closes.
  const booksSnap = await db.collection('books').where('uploadedBy', '==', teacherId).get()
  for (let i = 0; i < booksSnap.docs.length; i += BATCH_LIMIT) {
    const chunk = booksSnap.docs.slice(i, i + BATCH_LIMIT)
    const bookBatch = db.batch()
    chunk.forEach((bookDoc) => {
      bookBatch.update(bookDoc.ref, { assignedStudentIds: FieldValue.arrayUnion(uid) })
    })
    await bookBatch.commit()
  }

  logger.info(`Student ${uid} joined classroom ${classroomId}.`)
  return { classroomId, name: classroomDoc.data().name as string }
})
