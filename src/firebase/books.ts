import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  writeBatch,
  arrayUnion,
  query,
  where,
  serverTimestamp,
} from 'firebase/firestore'
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage'
import { db, storage } from './config'
import type { Book } from '@/types'

// Cap on the best-effort Storage cleanup after a book's Firestore records are
// already deleted. See the note at the end of deleteTeacherBook.
const STORAGE_CLEANUP_TIMEOUT_MS = 5000

export async function uploadBook(
  file: File,
  title: string,
  author: string,
  readingLevel: string,
  assignmentPrompt: string,
  successCriteria: string,
  teacherId: string,
  onProgress?: (pct: number) => void,
  organizerTemplateId?: string,
  organizerScaffoldDefault?: 'guided' | 'independent',
  organizerStudentCanSwitch?: boolean,
  organizerPrompt?: string,
): Promise<Book> {
  const cleanAssignmentPrompt = assignmentPrompt.trim()
  const cleanSuccessCriteria = successCriteria.trim()
  const cleanOrganizerPrompt = organizerPrompt?.trim() ?? ''
  // Filed under the teacher's uid so Storage rules can scope deletion to its
  // owner — a flat books/ path gives them nothing to check.
  const storageRef = ref(storage, `books/${teacherId}/${Date.now()}_${file.name}`)
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
      readingLevel: readingLevel || null,
      assignmentPrompt: cleanAssignmentPrompt || null,
      successCriteria: cleanSuccessCriteria || null,
      storageUrl,
      uploadedBy: teacherId,
      assignedStudentIds: [],
      createdAt: serverTimestamp(),
      ...(organizerTemplateId ? {
        organizerTemplateId,
        organizerScaffoldDefault: organizerScaffoldDefault ?? 'guided',
        organizerStudentCanSwitch: organizerStudentCanSwitch ?? true,
        organizerPrompt: cleanOrganizerPrompt || null,
      } : {}),
    })
  } catch (err) {
    await deleteObject(storageRef).catch(() => undefined)
    throw err
  }

  return {
    id: docRef.id,
    title,
    author,
    readingLevel,
    assignmentPrompt: cleanAssignmentPrompt,
    successCriteria: cleanSuccessCriteria,
    storageUrl,
    uploadedBy: teacherId,
    assignedStudentIds: [],
    createdAt: new Date(),
    organizerTemplateId,
    organizerScaffoldDefault,
    organizerStudentCanSwitch,
    organizerPrompt: cleanOrganizerPrompt,
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
  if (studentIds.length === 0) return
  await updateDoc(doc(db, 'books', bookId), { assignedStudentIds: arrayUnion(...studentIds) })
}

export async function uploadStudentBook(
  file: File,
  title: string,
  author: string,
  readingLevel: string,
  studentId: string,
  onProgress?: (pct: number) => void,
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
    readingLevel,
    storageUrl,
    uploadedBy: studentId,
    assignedStudentIds: [studentId],
    createdAt: new Date(),
  }
}

export async function deleteStudentBook(bookId: string, storageUrl: string, studentId: string): Promise<void> {
  await deleteDoc(doc(db, 'books', bookId))
  try {
    const fileRef = ref(storage, storageUrl)
    await deleteObject(fileRef)
  } catch {
    // Storage object may already be gone — Firestore doc deletion is the source of truth
  }
  // Cascade: remove annotations and reading progress for this student+book
  const annSnap = await getDocs(query(
    collection(db, 'annotations'),
    where('studentId', '==', studentId),
    where('bookId', '==', bookId),
  ))
  if (!annSnap.empty) {
    const batch = writeBatch(db)
    annSnap.docs.forEach((d) => batch.delete(d.ref))
    await batch.commit()
  }
  await deleteDoc(doc(db, 'readingProgress', `${studentId}_${bookId}`)).catch(() => {})
}

/**
 * Counts what deleting a teacher's book would take with it, so the confirmation
 * can name the cost before the teacher commits to it.
 *
 * Scoped to `assignedStudentIds` for the same reason `deleteTeacherBook` is —
 * see the note there.
 */
export async function countBookStudentRecords(book: Book): Promise<number> {
  const perStudent = await Promise.all(
    book.assignedStudentIds.map((studentId) =>
      getDocs(query(
        collection(db, 'annotations'),
        where('bookId', '==', book.id),
        where('studentId', '==', studentId),
      )).then((snap) => snap.size).catch(() => 0)
    )
  )
  return perStudent.reduce((sum, n) => sum + n, 0)
}

/**
 * Deletes a teacher's book and the student records that only exist because of it.
 *
 * Order matters: the annotation, organizer and readingProgress delete rules all
 * authorise the teacher by reading the *book* document (isAssignedBookTeacher),
 * so the book doc has to be the last Firestore delete. Removing it first would
 * strand every child record permanently.
 *
 * The cascade walks `assignedStudentIds` rather than querying annotations by
 * bookId alone: a bookId-only query returns documents belonging to students who
 * are no longer assigned, which the read rule rejects — and one rejected document
 * fails the whole query. Notes belonging to a since-removed student are therefore
 * left alone, which is also the behaviour we want: their work is not the
 * teacher's to delete once they are off the roster.
 */
export async function deleteTeacherBook(book: Book): Promise<void> {
  for (const studentId of book.assignedStudentIds) {
    const annSnap = await getDocs(query(
      collection(db, 'annotations'),
      where('bookId', '==', book.id),
      where('studentId', '==', studentId),
    ))
    if (!annSnap.empty) {
      const batch = writeBatch(db)
      annSnap.docs.forEach((d) => batch.delete(d.ref))
      await batch.commit()
    }
    // organizers and readingProgress both use a deterministic
    // `${studentId}_${bookId}` id, so neither needs a query.
    await deleteDoc(doc(db, 'organizers', `${studentId}_${book.id}`)).catch(() => {})
    await deleteDoc(doc(db, 'readingProgress', `${studentId}_${book.id}`)).catch(() => {})
  }

  await deleteDoc(doc(db, 'books', book.id))

  // Last, and strictly best-effort. The Firestore document is the source of
  // truth and is already gone by this point, so the blob cleanup must never
  // decide the outcome — nor be able to stall it. Storage requests have no
  // deadline of their own: an unreachable bucket leaves this pending forever,
  // which strands the teacher's confirmation dialog on "Deleting…". Books
  // uploaded before storage paths carried the teacher's uid have no rule that
  // permits their removal either, and simply stay behind.
  await Promise.race([
    deleteObject(ref(storage, book.storageUrl)).catch(() => undefined),
    new Promise((resolve) => setTimeout(resolve, STORAGE_CLEANUP_TIMEOUT_MS)),
  ])
}
