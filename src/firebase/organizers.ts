import {
  collection,
  doc,
  updateDoc,
  getDocs,
  query,
  setDoc,
  where,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from './config'
import type { OrganizerResponse, ScaffoldLevel } from '@/types'

function toResponse(id: string, data: Record<string, unknown>): OrganizerResponse {
  return {
    id,
    studentId:    data.studentId    as string,
    bookId:       data.bookId       as string,
    classroomId:  typeof data.classroomId === 'string' ? data.classroomId : null,
    templateId:   data.templateId   as string,
    scaffoldLevel: (data.scaffoldLevel as ScaffoldLevel) ?? 'guided',
    fields:       (data.fields as Record<string, string>) ?? {},
    completed:    Boolean(data.completed),
    createdAt:    (data.createdAt as { toDate(): Date })?.toDate() ?? new Date(),
    updatedAt:    (data.updatedAt as { toDate(): Date })?.toDate() ?? new Date(),
  }
}

// Teacher-side lookup. Must filter on classroomId, not studentId/bookId: the organizers
// read rule grants teachers access only through its classroomId branch, so a
// studentId+bookId query is rejected with permission-denied for a teacher every time —
// even when it would match zero documents, because the denial is based on the query shape
// rather than the result set. getOrganizerResponse below is the student's own path.
export async function getOrganizerResponseForTeacher(
  classroomId: string,
  studentId: string,
  bookId: string,
): Promise<OrganizerResponse | null> {
  const snap = await getDocs(query(
    collection(db, 'organizers'),
    where('classroomId', '==', classroomId),
  ))
  const match = snap.docs.find(
    (d) => d.data().studentId === studentId && d.data().bookId === bookId,
  )
  return match ? toResponse(match.id, match.data()) : null
}

export async function getOrganizerResponse(
  studentId: string,
  bookId: string,
): Promise<OrganizerResponse | null> {
  const snap = await getDocs(query(
    collection(db, 'organizers'),
    where('studentId', '==', studentId),
    where('bookId', '==', bookId),
  ))
  if (snap.empty) return null
  const d = snap.docs[0]
  return toResponse(d.id, d.data())
}

export async function getOrganizersByBook(bookId: string): Promise<OrganizerResponse[]> {
  const snap = await getDocs(query(
    collection(db, 'organizers'),
    where('bookId', '==', bookId),
  ))
  return snap.docs.map((d) => toResponse(d.id, d.data()))
}

export async function saveOrganizerResponse(
  responseId: string | null,
  studentId: string,
  bookId: string,
  classroomId: string | null,
  templateId: string,
  scaffoldLevel: ScaffoldLevel,
  fields: Record<string, string>,
  completed: boolean,
): Promise<string> {
  const id = responseId ?? `${studentId}_${bookId}`
  if (responseId) {
    await updateDoc(doc(db, 'organizers', id), {
      scaffoldLevel,
      fields,
      completed,
      updatedAt: serverTimestamp(),
    })
    return id
  }
  await setDoc(doc(db, 'organizers', id), {
    studentId,
    bookId,
    classroomId,
    templateId,
    scaffoldLevel,
    fields,
    completed,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return id
}
