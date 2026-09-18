import {
  collection,
  doc,
  getDoc,
  getDocs,
  writeBatch,
  arrayRemove,
  query,
  where,
} from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { db, functions } from './config'
import type { Classroom } from '@/types'

/**
 * Creates the signed-in teacher's classroom.
 *
 * Server-side (functions/src/classroom.ts) because the join code has to be
 * unique across every classroom in the product, and checking that means
 * reading classrooms this teacher has no business reading. firestore.rules
 * denies classroom creation to clients outright — this is the only way in.
 */
export async function createClassroom(name: string): Promise<Classroom> {
  const call = httpsCallable<
    { name: string },
    { id: string; name: string; teacherId: string; joinCode: string; studentIds: string[] }
  >(functions, 'createClassroom')
  const { data } = await call({ name })
  return { ...data, createdAt: new Date() }
}

export async function getClassroomByTeacher(teacherId: string): Promise<Classroom | null> {
  const q = query(collection(db, 'classrooms'), where('teacherId', '==', teacherId))
  const snap = await getDocs(q)
  if (snap.empty) return null
  const d = snap.docs[0]
  const data = d.data()
  return {
    id: d.id,
    ...data,
    createdAt: data.createdAt?.toDate() ?? new Date(),
  } as Classroom
}

export async function getClassroom(classroomId: string): Promise<Classroom | null> {
  const snap = await getDoc(doc(db, 'classrooms', classroomId))
  if (!snap.exists()) return null
  const data = snap.data()
  return { id: snap.id, ...data, createdAt: data.createdAt?.toDate() ?? new Date() } as Classroom
}

/**
 * Enrols the signed-in student in the classroom matching `joinCode`.
 *
 * Server-side (functions/src/classroom.ts) because a Firestore rule cannot see
 * the join code: it is never written into the document being changed, and a
 * rule cannot read the values a client filtered its query by. The old rule
 * could therefore only check that the caller was adding themselves — which
 * every attacker also is — so any signed-in account could enrol in any
 * classroom in the product. The callable checks the code before it writes.
 */
export async function joinClassroomByCode(joinCode: string): Promise<string> {
  const call = httpsCallable<{ joinCode: string }, { classroomId: string; name: string }>(
    functions,
    'joinClassroom',
  )
  const { data } = await call({ joinCode })
  return data.classroomId
}

/**
 * Removes a student from a teacher's classroom without touching the student's
 * own work. Un-enrolment, not deletion: their annotations, organizers and
 * writing stay theirs, and the teacher simply stops being able to read them —
 * every teacher-side rule is scoped by classroom membership or book assignment.
 *
 * All three writes matter:
 *  - `classrooms.studentIds` is what teacher-side reads are scoped by.
 *  - The student's own `classroomId` must be cleared too, or they are left in a
 *    broken state: validAnnotationClassroomLink rejects every annotation written
 *    against a classroom they are no longer a member of, so they would silently
 *    stop being able to annotate anything.
 *  - `joinClassroomByCode` assigns the teacher's whole library on join, so
 *    removal has to undo that or a removed student keeps read access to the
 *    teacher's PDFs.
 */
export async function removeStudentFromClassroom(
  studentId: string,
  classroomId: string,
  teacherId: string,
): Promise<void> {
  const batch = writeBatch(db)
  batch.update(doc(db, 'classrooms', classroomId), { studentIds: arrayRemove(studentId) })
  batch.update(doc(db, 'users', studentId), { classroomId: null })
  await batch.commit()

  const booksSnap = await getDocs(query(collection(db, 'books'), where('uploadedBy', '==', teacherId)))
  const assigned = booksSnap.docs.filter((d) => (d.data().assignedStudentIds ?? []).includes(studentId))
  if (assigned.length > 0) {
    const bookBatch = writeBatch(db)
    assigned.forEach((d) => bookBatch.update(d.ref, { assignedStudentIds: arrayRemove(studentId) }))
    await bookBatch.commit()
  }
}
