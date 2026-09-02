import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  writeBatch,
  arrayUnion,
  arrayRemove,
  query,
  where,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from './config'
import type { Classroom } from '@/types'

function generateJoinCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

async function generateUniqueJoinCode(): Promise<string> {
  for (let i = 0; i < 8; i += 1) {
    const joinCode = generateJoinCode()
    const existing = await getDocs(query(collection(db, 'classrooms'), where('joinCode', '==', joinCode)))
    if (existing.empty) return joinCode
  }
  throw new Error('Could not create a unique join code. Please try again.')
}

export async function createClassroom(name: string, teacherId: string): Promise<Classroom> {
  const joinCode = await generateUniqueJoinCode()
  const ref = await addDoc(collection(db, 'classrooms'), {
    name,
    teacherId,
    joinCode,
    studentIds: [],
    createdAt: serverTimestamp(),
  })
  return { id: ref.id, name, teacherId, joinCode, studentIds: [], createdAt: new Date() }
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

export async function joinClassroomByCode(studentId: string, joinCode: string): Promise<string> {
  const q = query(collection(db, 'classrooms'), where('joinCode', '==', joinCode.toUpperCase().trim()))
  const snap = await getDocs(q)
  if (snap.empty) throw new Error('Invalid join code. Check the code with your teacher.')

  const classroomDoc = snap.docs[0]
  const classroomId = classroomDoc.id
  const teacherId = classroomDoc.data().teacherId as string

  const batch = writeBatch(db)
  batch.update(doc(db, 'classrooms', classroomId), { studentIds: arrayUnion(studentId) })
  batch.update(doc(db, 'users', studentId), { classroomId })
  await batch.commit()

  // Add student to all books already uploaded by this classroom's teacher
  const booksSnap = await getDocs(query(collection(db, 'books'), where('uploadedBy', '==', teacherId)))
  if (!booksSnap.empty) {
    const bookBatch = writeBatch(db)
    booksSnap.docs.forEach((bookDoc) => {
      bookBatch.update(bookDoc.ref, { assignedStudentIds: arrayUnion(studentId) })
    })
    await bookBatch.commit()
  }

  return classroomId
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
