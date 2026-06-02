import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  writeBatch,
  arrayUnion,
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

export async function createClassroom(name: string, teacherId: string): Promise<Classroom> {
  const joinCode = generateJoinCode()
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
