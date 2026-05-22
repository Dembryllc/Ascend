import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  arrayUnion,
  query,
  where,
  serverTimestamp,
} from 'firebase/firestore'
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage'
import { db, storage } from './config'
import type { Book } from '@/types'

export async function uploadBook(
  file: File,
  title: string,
  author: string,
  readingLevel: string,
  teacherId: string,
  onProgress?: (pct: number) => void,
): Promise<Book> {
  const storageRef = ref(storage, `books/${Date.now()}_${file.name}`)
  const task = uploadBytesResumable(storageRef, file)

  const storageUrl = await new Promise<string>((resolve, reject) => {
    task.on(
      'state_changed',
      (snap) => onProgress?.(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
      reject,
      async () => resolve(await getDownloadURL(task.snapshot.ref)),
    )
  })

  const docRef = await addDoc(collection(db, 'books'), {
    title,
    author,
    readingLevel: readingLevel || null,
    storageUrl,
    uploadedBy: teacherId,
    assignedStudentIds: [],
    createdAt: serverTimestamp(),
  })

  return {
    id: docRef.id,
    title,
    author,
    readingLevel,
    storageUrl,
    uploadedBy: teacherId,
    assignedStudentIds: [],
    createdAt: new Date(),
  }
}

export async function getBooksByTeacher(teacherId: string): Promise<Book[]> {
  const q = query(collection(db, 'books'), where('uploadedBy', '==', teacherId))
  const snap = await getDocs(q)
  return snap.docs.map((d) => {
    const data = d.data()
    return { id: d.id, ...data, createdAt: data.createdAt?.toDate() ?? new Date() } as Book
  })
}

export async function getBooksByStudent(studentId: string): Promise<Book[]> {
  const q = query(collection(db, 'books'), where('assignedStudentIds', 'array-contains', studentId))
  const snap = await getDocs(q)
  return snap.docs.map((d) => {
    const data = d.data()
    return { id: d.id, ...data, createdAt: data.createdAt?.toDate() ?? new Date() } as Book
  })
}

export async function getBook(bookId: string): Promise<Book | null> {
  const snap = await getDoc(doc(db, 'books', bookId))
  if (!snap.exists()) return null
  const data = snap.data()
  return { id: snap.id, ...data, createdAt: data.createdAt?.toDate() ?? new Date() } as Book
}

export async function assignBookToStudent(bookId: string, studentId: string): Promise<void> {
  await updateDoc(doc(db, 'books', bookId), { assignedStudentIds: arrayUnion(studentId) })
}

export async function assignBookToClass(bookId: string, studentIds: string[]): Promise<void> {
  await updateDoc(doc(db, 'books', bookId), { assignedStudentIds: arrayUnion(...studentIds) })
}
