import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  arrayUnion,
  query,
  where,
  serverTimestamp,
} from 'firebase/firestore'
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage'
import { db, storage } from './config'
import type { Book } from '@/types'

export async function uploadBook(
  file: File,
  title: string,
  author: string,
  readingLevel: string,
  assignmentPrompt: string,
  successCriteria: string,
  teacherId: string,
  onProgress?: (pct: number) => void,
  format: 'pdf' | 'docx' = 'pdf',
): Promise<Book> {
  const cleanAssignmentPrompt = assignmentPrompt.trim()
  const cleanSuccessCriteria = successCriteria.trim()
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

  let docRef
  try {
    docRef = await addDoc(collection(db, 'books'), {
      title,
      author,
      format,
      readingLevel: readingLevel || null,
      assignmentPrompt: cleanAssignmentPrompt || null,
      successCriteria: cleanSuccessCriteria || null,
      storageUrl,
      uploadedBy: teacherId,
      assignedStudentIds: [],
      createdAt: serverTimestamp(),
    })
  } catch (err) {
    await deleteObject(storageRef).catch(() => undefined)
    throw err
  }

  return {
    id: docRef.id,
    title,
    author,
    format,
    readingLevel,
    assignmentPrompt: cleanAssignmentPrompt,
    successCriteria: cleanSuccessCriteria,
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
  const [assignedSnap, ownedSnap] = await Promise.all([
    getDocs(query(collection(db, 'books'), where('assignedStudentIds', 'array-contains', studentId))),
    getDocs(query(collection(db, 'books'), where('uploadedBy', '==', studentId))),
  ])
  const bookMap = new Map<string, Book>()
  for (const snap of [assignedSnap, ownedSnap]) {
    for (const d of snap.docs) {
      if (!bookMap.has(d.id)) {
        const data = d.data()
        bookMap.set(d.id, { id: d.id, ...data, createdAt: data.createdAt?.toDate() ?? new Date() } as Book)
      }
    }
  }
  return Array.from(bookMap.values())
}

export async function getBook(bookId: string): Promise<Book | null> {
  const snap = await getDoc(doc(db, 'books', bookId))
  if (!snap.exists()) return null
  const data = snap.data()
  return { id: snap.id, ...data, createdAt: data.createdAt?.toDate() ?? new Date() } as Book
}

export async function getBookPdfBlob(storageUrl: string): Promise<Blob> {
  const response = await fetch(storageUrl)
  if (!response.ok) {
    throw new Error(`PDF download failed: ${response.status}`)
  }
  return response.blob()
}

export async function assignBookToStudent(bookId: string, studentId: string): Promise<void> {
  await updateDoc(doc(db, 'books', bookId), { assignedStudentIds: arrayUnion(studentId) })
}

export async function assignBookToClass(bookId: string, studentIds: string[]): Promise<void> {
  await updateDoc(doc(db, 'books', bookId), { assignedStudentIds: arrayUnion(...studentIds) })
}

export async function uploadStudentBook(
  file: File,
  title: string,
  author: string,
  readingLevel: string,
  studentId: string,
  onProgress?: (pct: number) => void,
  format: 'pdf' | 'docx' = 'pdf',
): Promise<Book> {
  const storageRef = ref(storage, `student-books/${studentId}/${Date.now()}_${file.name}`)
  const task = uploadBytesResumable(storageRef, file)

  const storageUrl = await new Promise<string>((resolve, reject) => {
    task.on(
      'state_changed',
      (snap) => onProgress?.(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
      reject,
      async () => resolve(await getDownloadURL(task.snapshot.ref)),
    )
  })

  let docRef
  try {
    docRef = await addDoc(collection(db, 'books'), {
      title,
      author,
      format,
      readingLevel: readingLevel || null,
      storageUrl,
      uploadedBy: studentId,
      uploadedByStudent: true,
      assignedStudentIds: [studentId],
      createdAt: serverTimestamp(),
    })
  } catch (err) {
    await deleteObject(storageRef).catch(() => undefined)
    throw err
  }

  return {
    id: docRef.id,
    title,
    author,
    format,
    readingLevel,
    storageUrl,
    uploadedBy: studentId,
    assignedStudentIds: [studentId],
    createdAt: new Date(),
  }
}

export async function deleteStudentBook(bookId: string, storageUrl: string): Promise<void> {
  await deleteDoc(doc(db, 'books', bookId))
  try {
    const fileRef = ref(storage, storageUrl)
    await deleteObject(fileRef)
  } catch {
    // Storage object may already be gone — Firestore doc deletion is the source of truth
  }
}
