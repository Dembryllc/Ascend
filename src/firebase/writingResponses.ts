import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from './config'
import type { ScaffoldLevel, WritingResponse } from '@/types'

function toResponse(id: string, data: Record<string, unknown>): WritingResponse {
  return {
    id,
    studentId:     data.studentId    as string,
    taskId:        data.taskId       as string,
    classroomId:   typeof data.classroomId === 'string' ? data.classroomId : null,
    templateId:    data.templateId   as string,
    scaffoldLevel: (data.scaffoldLevel as ScaffoldLevel) ?? 'guided',
    fields:        (data.fields as Record<string, string>) ?? {},
    completed:     Boolean(data.completed),
    createdAt:     (data.createdAt as { toDate(): Date })?.toDate() ?? new Date(),
    updatedAt:     (data.updatedAt as { toDate(): Date })?.toDate() ?? new Date(),
  }
}

/** Deterministic id lets us fetch by id — no composite index required. */
function responseId(studentId: string, taskId: string): string {
  return `${studentId}_${taskId}`
}

export async function getWritingResponse(
  studentId: string,
  taskId: string,
): Promise<WritingResponse | null> {
  const snap = await getDoc(doc(db, 'writingResponses', responseId(studentId, taskId)))
  if (!snap.exists()) return null
  return toResponse(snap.id, snap.data())
}

/** All of a learner's responses — used to compute status badges on the home. */
export async function getWritingResponsesByStudent(studentId: string): Promise<WritingResponse[]> {
  const snap = await getDocs(query(
    collection(db, 'writingResponses'),
    where('studentId', '==', studentId),
  ))
  return snap.docs.map((d) => toResponse(d.id, d.data()))
}

/**
 * All responses in a classroom (single-field query so no composite index).
 * The teacher filters these to a specific task client-side. Personal tasks
 * carry classroomId null, so they never appear here — they stay private.
 */
export async function getWritingResponsesForClassroom(classroomId: string): Promise<WritingResponse[]> {
  const snap = await getDocs(query(
    collection(db, 'writingResponses'),
    where('classroomId', '==', classroomId),
  ))
  return snap.docs.map((d) => toResponse(d.id, d.data()))
}

export async function saveWritingResponse(
  exists: boolean,
  studentId: string,
  taskId: string,
  classroomId: string | null,
  templateId: string,
  scaffoldLevel: ScaffoldLevel,
  fields: Record<string, string>,
  completed: boolean,
): Promise<void> {
  const id = responseId(studentId, taskId)
  if (exists) {
    await updateDoc(doc(db, 'writingResponses', id), {
      scaffoldLevel,
      fields,
      completed,
      updatedAt: serverTimestamp(),
    })
    return
  }
  await setDoc(doc(db, 'writingResponses', id), {
    studentId,
    taskId,
    classroomId,
    templateId,
    scaffoldLevel,
    fields,
    completed,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
}

/** Best-effort cleanup when a learner deletes their own personal task. */
export async function deleteWritingResponse(studentId: string, taskId: string): Promise<void> {
  await deleteDoc(doc(db, 'writingResponses', responseId(studentId, taskId)))
}
