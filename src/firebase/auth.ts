import {
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type User,
} from 'firebase/auth'
import { doc, setDoc, getDoc, serverTimestamp, collection, query, where, getDocs, updateDoc, arrayUnion } from 'firebase/firestore'
import { auth, db } from './config'
import type { UserRole, UserProfile } from '@/types'

export async function registerUser(
  email: string,
  password: string,
  displayName: string,
  role: UserRole,
  classroomJoinCode?: string,
): Promise<User> {
  const credential = await createUserWithEmailAndPassword(auth, email, password)
  const user = credential.user

  await updateProfile(user, { displayName })

  let classroomId: string | null = null

  if (role === 'student' && classroomJoinCode) {
    classroomId = await resolveJoinCode(classroomJoinCode)
    if (!classroomId) throw new Error('Invalid class join code. Please check with your teacher.')
    await addStudentToClassroom(user.uid, classroomId)
  }

  await setDoc(doc(db, 'users', user.uid), {
    uid: user.uid,
    email,
    displayName,
    role,
    classroomId,
    createdAt: serverTimestamp(),
  })

  return user
}

export async function loginUser(email: string, password: string): Promise<User> {
  const credential = await signInWithEmailAndPassword(auth, email, password)
  return credential.user
}

export async function logoutUser(): Promise<void> {
  await signOut(auth)
}

export async function sendPasswordReset(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email)
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const snap = await getDoc(doc(db, 'users', uid))
  if (!snap.exists()) return null
  const data = snap.data()
  return {
    ...data,
    createdAt: data.createdAt?.toDate() ?? new Date(),
  } as UserProfile
}

async function resolveJoinCode(joinCode: string): Promise<string | null> {
  const q = query(collection(db, 'classrooms'), where('joinCode', '==', joinCode.toUpperCase()))
  const snap = await getDocs(q)
  if (snap.empty) return null
  return snap.docs[0].id
}

async function addStudentToClassroom(studentId: string, classroomId: string): Promise<void> {
  await updateDoc(doc(db, 'classrooms', classroomId), {
    studentIds: arrayUnion(studentId),
  })
}
