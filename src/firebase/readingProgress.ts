import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  runTransaction,
  serverTimestamp,
  where,
} from 'firebase/firestore'
import { db } from './config'
import type { ReadingProgress } from '@/types'

type ProgressData = Record<string, unknown>

function progressDocId(studentId: string, bookId: string) {
  return `${studentId}_${bookId}`
}

function toDate(value: unknown) {
  return (value as { toDate?: () => Date } | undefined)?.toDate?.() ?? new Date()
}

function toReadingProgress(id: string, data: ProgressData): ReadingProgress {
  return {
    id,
    studentId: data.studentId as string,
    bookId: data.bookId as string,
    classroomId: typeof data.classroomId === 'string' ? data.classroomId : null,
    lastReadPage: typeof data.lastReadPage === 'number' ? data.lastReadPage : 1,
    highestPageRead: typeof data.highestPageRead === 'number' ? data.highestPageRead : 1,
    totalPages: typeof data.totalPages === 'number' ? data.totalPages : 0,
    completionPercent: typeof data.completionPercent === 'number' ? data.completionPercent : 0,
    totalSecondsRead: typeof data.totalSecondsRead === 'number' ? data.totalSecondsRead : 0,
    completed: data.completed === true,
    lastReadAt: toDate(data.lastReadAt),
    createdAt: toDate(data.createdAt),
  }
}

export async function getReadingProgress(studentId: string, bookId: string): Promise<ReadingProgress | null> {
  const snap = await getDoc(doc(db, 'readingProgress', progressDocId(studentId, bookId)))
  if (!snap.exists()) return null
  return toReadingProgress(snap.id, snap.data())
}

export async function getReadingProgressByStudent(studentId: string): Promise<ReadingProgress[]> {
  const q = query(collection(db, 'readingProgress'), where('studentId', '==', studentId))
  const snap = await getDocs(q)
  return snap.docs
    .map((d) => toReadingProgress(d.id, d.data()))
    .sort((a, b) => b.lastReadAt.getTime() - a.lastReadAt.getTime())
}

export async function getReadingProgressByClassroom(classroomId: string): Promise<ReadingProgress[]> {
  const q = query(collection(db, 'readingProgress'), where('classroomId', '==', classroomId))
  const snap = await getDocs(q)
  return snap.docs
    .map((d) => toReadingProgress(d.id, d.data()))
    .sort((a, b) => b.lastReadAt.getTime() - a.lastReadAt.getTime())
}

export async function recordReadingProgress({
  studentId,
  bookId,
  classroomId,
  pageNumber,
  totalPages,
  secondsRead = 0,
  completed = false,
}: {
  studentId: string
  bookId: string
  classroomId?: string | null
  pageNumber: number
  totalPages: number
  secondsRead?: number
  completed?: boolean
}): Promise<ReadingProgress> {
  const ref = doc(db, 'readingProgress', progressDocId(studentId, bookId))
  return runTransaction(db, async (transaction) => {
    const snap = await transaction.get(ref)
    const existing = snap.exists() ? toReadingProgress(snap.id, snap.data()) : null
    const safeTotalPages = Math.max(0, totalPages)
    const safePage = Math.max(1, Math.min(pageNumber, safeTotalPages || pageNumber))
    const highestPageRead = Math.max(existing?.highestPageRead ?? 1, safePage)
    const pagePercent = safeTotalPages > 0 ? Math.round((highestPageRead / safeTotalPages) * 100) : 0
    const completionPercent = completed ? 100 : Math.max(existing?.completionPercent ?? 0, Math.min(100, pagePercent))
    const totalSecondsRead = Math.max(0, (existing?.totalSecondsRead ?? 0) + Math.max(0, Math.round(secondsRead)))
    const isCompleted = completed || existing?.completed === true || completionPercent >= 100

    const payload = {
      studentId,
      bookId,
      classroomId: classroomId ?? null,
      lastReadPage: safePage,
      highestPageRead,
      totalPages: safeTotalPages,
      completionPercent,
      totalSecondsRead,
      completed: isCompleted,
      lastReadAt: serverTimestamp(),
      ...(existing ? {} : { createdAt: serverTimestamp() }),
    }

    transaction.set(ref, payload, { merge: true })

    return {
      id: ref.id,
      studentId,
      bookId,
      classroomId: classroomId ?? null,
      lastReadPage: safePage,
      highestPageRead,
      totalPages: safeTotalPages,
      completionPercent,
      totalSecondsRead,
      completed: isCompleted,
      lastReadAt: new Date(),
      createdAt: existing?.createdAt ?? new Date(),
    }
  })
}
