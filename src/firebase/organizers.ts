import {
  collection,
  doc,
  addDoc,
  updateDoc,
  getDocs,
  query,
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
    isTeacherExample: data.isTeacherExample === true,
    createdAt:    (data.createdAt as { toDate(): Date })?.toDate() ?? new Date(),
    updatedAt:    (data.updatedAt as { toDate(): Date })?.toDate() ?? new Date(),
  }
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
  isTeacherExample = false,
): Promise<string> {
  if (responseId) {
    await updateDoc(doc(db, 'organizers', responseId), {
      scaffoldLevel,
      fields,
      completed,
      updatedAt: serverTimestamp(),
    })
    return responseId
  }
  const ref = await addDoc(collection(db, 'organizers'), {
    studentId,
    bookId,
    classroomId,
    templateId,
    scaffoldLevel,
    fields,
    completed,
    ...(isTeacherExample ? { isTeacherExample: true } : {}),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return ref.id
}

export async function getTeacherOrganizerExample(bookId: string): Promise<OrganizerResponse | null> {
  const snap = await getDocs(query(
    collection(db, 'organizers'),
    where('bookId', '==', bookId),
    where('isTeacherExample', '==', true),
  ))
  if (snap.empty) return null
  const d = snap.docs[0]
  return toResponse(d.id, d.data())
}

export async function getTeacherOrganizerExampleById(teacherId: string, bookId: string): Promise<OrganizerResponse | null> {
  const snap = await getDocs(query(
    collection(db, 'organizers'),
    where('studentId', '==', teacherId),
    where('bookId', '==', bookId),
    where('isTeacherExample', '==', true),
  ))
  if (snap.empty) return null
  const d = snap.docs[0]
  return toResponse(d.id, d.data())
}
