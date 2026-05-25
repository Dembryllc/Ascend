import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  query,
  where,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from './config'
import type { Annotation, ReactionType } from '@/types'

function toAnnotation(id: string, data: Record<string, unknown>): Annotation {
  return {
    id,
    studentId:    data.studentId    as string,
    bookId:       data.bookId       as string,
    pageNumber:   data.pageNumber   as number,
    reactionType: data.reactionType as ReactionType,
    noteText:     data.noteText     as string,
    selectedText: typeof data.selectedText === 'string' ? data.selectedText : '',
    timestamp:    (data.timestamp as { toDate(): Date })?.toDate() ?? new Date(),
  }
}

export async function saveAnnotation(
  studentId: string,
  bookId: string,
  pageNumber: number,
  reactionType: ReactionType,
  noteText: string,
  selectedText = '',
): Promise<Annotation> {
  const ref = await addDoc(collection(db, 'annotations'), {
    studentId,
    bookId,
    pageNumber,
    reactionType,
    noteText,
    selectedText,
    timestamp: serverTimestamp(),
  })
  return { id: ref.id, studentId, bookId, pageNumber, reactionType, noteText, selectedText, timestamp: new Date() }
}

export async function updateAnnotation(
  annotationId: string,
  reactionType: ReactionType,
  noteText: string,
  selectedText?: string,
): Promise<void> {
  const payload: {
    reactionType: ReactionType
    noteText: string
    selectedText?: string
    timestamp: ReturnType<typeof serverTimestamp>
  } = {
    reactionType,
    noteText,
    timestamp: serverTimestamp(),
  }
  if (selectedText !== undefined) payload.selectedText = selectedText
  await updateDoc(doc(db, 'annotations', annotationId), payload)
}

export async function deleteAnnotation(annotationId: string): Promise<void> {
  await deleteDoc(doc(db, 'annotations', annotationId))
}

export async function getAnnotationsByStudentAndBook(
  studentId: string,
  bookId: string,
): Promise<Annotation[]> {
  const q = query(
    collection(db, 'annotations'),
    where('studentId', '==', studentId),
  )
  const snap = await getDocs(q)
  return snap.docs
    .map((d) => toAnnotation(d.id, d.data()))
    .filter((ann) => ann.bookId === bookId)
    .sort((a, b) => a.pageNumber - b.pageNumber)
}

export async function getAnnotationsByStudent(studentId: string): Promise<Annotation[]> {
  const q = query(
    collection(db, 'annotations'),
    where('studentId', '==', studentId),
  )
  const snap = await getDocs(q)
  return snap.docs
    .map((d) => toAnnotation(d.id, d.data()))
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
}

export async function getAnnotationsByClassAndBook(
  studentIds: string[],
  bookId: string,
): Promise<Annotation[]> {
  if (studentIds.length === 0) return []
  const q = query(
    collection(db, 'annotations'),
    where('bookId', '==', bookId),
  )
  const snap = await getDocs(q)
  const allowedStudentIds = new Set(studentIds.slice(0, 30))
  return snap.docs
    .map((d) => toAnnotation(d.id, d.data()))
    .filter((ann) => allowedStudentIds.has(ann.studentId))
    .sort((a, b) => a.pageNumber - b.pageNumber)
}
