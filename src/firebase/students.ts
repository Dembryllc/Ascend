import { collection, getDocs, query, where } from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { db, functions } from './config'
import type { UserProfile } from '@/types'

export interface DeleteStudentCounts {
  annotations: number
  organizers: number
  readingProgress: number
  writingResponses: number
  writingFeedback: number
  writingTasks: number
  books: number
  classroomMemberships: number
  bookAssignments: number
}

interface DeleteStudentResult {
  dryRun: boolean
  counts: DeleteStudentCounts
  displayName: string
}

/**
 * Permanently deletes a student's account and everything attached to it.
 *
 * This has to be a Cloud Function: the Firebase client SDK can only delete the
 * *currently signed-in* user, so a teacher cannot remove a student's login from
 * the browser at all. Before this existed the only way to finish the job was
 * opening the Firebase Console by hand. See functions/src/deleteStudent.ts for
 * the authorisation rules — they are enforced there, not here.
 *
 * Call with dryRun first to find out what it would remove; the confirmation
 * dialog names the count before the teacher commits.
 */
export async function deleteStudentAccount(
  studentId: string,
  dryRun = false,
): Promise<DeleteStudentResult> {
  const call = httpsCallable<{ studentId: string; dryRun: boolean }, DeleteStudentResult>(
    functions,
    'deleteStudentAccount',
  )
  try {
    const result = await call({ studentId, dryRun })
    return result.data
  } catch (err: unknown) {
    // CI deploys hosting and Firestore rules but NOT Cloud Functions, so this
    // UI can reach production a deploy ahead of the function behind it. Say
    // that plainly instead of showing a bare "internal error" that looks like
    // the teacher's data is in a bad state — nothing has been deleted here.
    if ((err as { code?: string })?.code === 'functions/not-found') {
      throw new Error(
        'Account deletion is not switched on for this site yet. Nothing was deleted. '
        + 'The deleteStudentAccount Cloud Function still needs deploying.',
        { cause: err },
      )
    }
    throw err
  }
}

/** Total records a delete would destroy — what the confirmation dialog names. */
export function totalStudentRecords(counts: DeleteStudentCounts): number {
  return counts.annotations
    + counts.organizers
    + counts.readingProgress
    + counts.writingResponses
    + counts.writingTasks
    + counts.books
}

/**
 * Students this teacher has un-enrolled but not deleted.
 *
 * Removal deliberately severs every link between teacher and student — the
 * classroom roster, the student's own classroomId, and every book assignment —
 * so without the provenance `removeStudentFromClassroom` writes there is
 * nothing left to list them by, and no way to finish deleting them afterwards.
 */
export async function getRemovedStudents(teacherId: string): Promise<UserProfile[]> {
  const snap = await getDocs(query(
    collection(db, 'users'),
    where('removedByTeacherId', '==', teacherId),
  ))
  return snap.docs
    .map((d) => {
      const data = d.data()
      return {
        ...data,
        uid: d.id,
        createdAt: data.createdAt?.toDate() ?? new Date(),
        removedAt: data.removedAt?.toDate() ?? undefined,
      } as UserProfile
    })
    // A student who rejoins a class clears their own provenance, but guard
    // anyway: a stale row here would offer to delete someone else's student.
    .filter((profile) => !profile.classroomId)
    .sort((a, b) => a.displayName.localeCompare(b.displayName))
}
