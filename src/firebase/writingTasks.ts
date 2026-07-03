import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from './config'
import type { ScaffoldLevel, UserRole, WritingTask } from '@/types'

function toTask(id: string, data: Record<string, unknown>): WritingTask {
  return {
    id,
    title:            (data.title as string) ?? 'Untitled writing',
    prompt:           (data.prompt as string) ?? '',
    templateId:       data.templateId as string,
    scaffoldDefault:  (data.scaffoldDefault as ScaffoldLevel) ?? 'guided',
    studentCanSwitch: data.studentCanSwitch !== false,
    createdBy:        data.createdBy as string,
    creatorRole:      (data.creatorRole as UserRole) ?? 'teacher',
    classroomId:      typeof data.classroomId === 'string' ? data.classroomId : null,
    sampleFields:     (data.sampleFields as Record<string, string>) ?? null,
    sampleVisible:    Boolean(data.sampleVisible),
    createdAt:        (data.createdAt as { toDate(): Date })?.toDate() ?? new Date(),
  }
}

function byNewest(a: WritingTask, b: WritingTask): number {
  return b.createdAt.getTime() - a.createdAt.getTime()
}

export interface NewWritingTaskInput {
  title: string
  prompt: string
  templateId: string
  scaffoldDefault: ScaffoldLevel
  studentCanSwitch: boolean
  createdBy: string
  creatorRole: UserRole
  classroomId: string | null
}

export async function createWritingTask(input: NewWritingTaskInput): Promise<WritingTask> {
  const payload = {
    ...input,
    sampleFields: null,
    sampleVisible: false,
    createdAt: serverTimestamp(),
  }
  const ref = await addDoc(collection(db, 'writingTasks'), payload)
  return {
    id: ref.id,
    ...input,
    sampleFields: null,
    sampleVisible: false,
    createdAt: new Date(),
  }
}

export async function updateWritingTask(
  taskId: string,
  patch: Partial<Pick<WritingTask, 'title' | 'prompt' | 'scaffoldDefault' | 'studentCanSwitch'>>,
): Promise<void> {
  await updateDoc(doc(db, 'writingTasks', taskId), patch)
}

export async function saveWritingTaskSample(
  taskId: string,
  sampleFields: Record<string, string>,
  sampleVisible: boolean,
): Promise<void> {
  await updateDoc(doc(db, 'writingTasks', taskId), { sampleFields, sampleVisible })
}

export async function setSampleVisibility(taskId: string, sampleVisible: boolean): Promise<void> {
  await updateDoc(doc(db, 'writingTasks', taskId), { sampleVisible })
}

export async function deleteWritingTask(taskId: string): Promise<void> {
  await deleteDoc(doc(db, 'writingTasks', taskId))
}

export async function getWritingTask(taskId: string): Promise<WritingTask | null> {
  const snap = await getDoc(doc(db, 'writingTasks', taskId))
  if (!snap.exists()) return null
  return toTask(snap.id, snap.data())
}

/** Tasks a user authored — teacher's assignments, or a learner's personal tasks. */
export async function getWritingTasksByCreator(uid: string): Promise<WritingTask[]> {
  const snap = await getDocs(query(collection(db, 'writingTasks'), where('createdBy', '==', uid)))
  return snap.docs.map((d) => toTask(d.id, d.data())).sort(byNewest)
}

/** Teacher-assigned tasks for a classroom. */
export async function getWritingTasksForClassroom(classroomId: string): Promise<WritingTask[]> {
  const snap = await getDocs(query(collection(db, 'writingTasks'), where('classroomId', '==', classroomId)))
  return snap.docs.map((d) => toTask(d.id, d.data())).sort(byNewest)
}

/**
 * Everything a learner should see on their home: teacher-assigned tasks for
 * their classroom plus any personal tasks they created. De-duplicated (a
 * classroom student who also created a personal task won't see dupes).
 */
export async function getWritingTasksForLearner(
  uid: string,
  classroomId: string | null,
): Promise<WritingTask[]> {
  const [mine, assigned] = await Promise.all([
    getWritingTasksByCreator(uid),
    classroomId ? getWritingTasksForClassroom(classroomId) : Promise.resolve<WritingTask[]>([]),
  ])
  const seen = new Set<string>()
  const merged: WritingTask[] = []
  for (const task of [...assigned, ...mine]) {
    if (seen.has(task.id)) continue
    seen.add(task.id)
    merged.push(task)
  }
  return merged.sort(byNewest)
}
