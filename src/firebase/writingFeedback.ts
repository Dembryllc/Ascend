import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from './config'
import type { WritingFeedback } from '@/types'

function toFeedback(id: string, data: Record<string, unknown>): WritingFeedback {
  return {
    id,
    studentId:   data.studentId   as string,
    taskId:      data.taskId      as string,
    classroomId: data.classroomId as string,
    teacherId:   data.teacherId   as string,
    comment:     (data.comment as string) ?? '',
    reviewed:    Boolean(data.reviewed),
    updatedAt:   (data.updatedAt as { toDate(): Date })?.toDate() ?? new Date(),
  }
}

function feedbackId(studentId: string, taskId: string): string {
  return `${studentId}_${taskId}`
}

export async function getWritingFeedback(studentId: string, taskId: string): Promise<WritingFeedback | null> {
  const snap = await getDoc(doc(db, 'writingFeedback', feedbackId(studentId, taskId)))
  if (!snap.exists()) return null
  return toFeedback(snap.id, snap.data())
}

/** A learner's feedback across all tasks — used to badge the home cards. */
export async function getWritingFeedbackByStudent(studentId: string): Promise<WritingFeedback[]> {
  const snap = await getDocs(query(collection(db, 'writingFeedback'), where('studentId', '==', studentId)))
  return snap.docs.map((d) => toFeedback(d.id, d.data()))
}

/** All feedback in a classroom (single-field query) — teacher filters by task. */
export async function getWritingFeedbackForClassroom(classroomId: string): Promise<WritingFeedback[]> {
  const snap = await getDocs(query(collection(db, 'writingFeedback'), where('classroomId', '==', classroomId)))
  return snap.docs.map((d) => toFeedback(d.id, d.data()))
}

export async function saveWritingFeedback(
  exists: boolean,
  studentId: string,
  taskId: string,
  classroomId: string,
  teacherId: string,
  comment: string,
  reviewed: boolean,
): Promise<void> {
  const id = feedbackId(studentId, taskId)
  if (exists) {
    await updateDoc(doc(db, 'writingFeedback', id), {
      comment,
      reviewed,
      updatedAt: serverTimestamp(),
    })
    return
  }
  await setDoc(doc(db, 'writingFeedback', id), {
    studentId,
    taskId,
    classroomId,
    teacherId,
    comment,
    reviewed,
    updatedAt: serverTimestamp(),
  })
}
