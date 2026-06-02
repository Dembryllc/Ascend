import {
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type User,
} from 'firebase/auth'
import { doc, setDoc, getDoc, serverTimestamp, collection, query, where, getDocs } from 'firebase/firestore'
import { auth, db } from './config'
import type { UserRole, UserProfile } from '@/types'
import { joinClassroomByCode } from './classrooms'

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

  try {
    // Validate join code while signed in, before committing the profile.
    // Invalid code → throw here so the auth account is cleaned up and user can retry.
    if (role === 'student' && classroomJoinCode?.trim()) {
      const found = await resolveJoinCode(classroomJoinCode.trim())
      if (!found) throw new Error('Invalid class join code. Please check the code with your teacher.')
    }

    const trialEndsAt = role === 'teacher'
      ? new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
      : null

    await setDoc(doc(db, 'users', user.uid), {
      uid: user.uid,
      email,
      displayName,
      role,
      classroomId: null,
      ...(trialEndsAt ? { trialEndsAt } : {}),
      createdAt: serverTimestamp(),
    })
  } catch (err) {
    console.error('Registration failed — profile write error:', err)
    await user.delete().catch(() => {})
    throw err
  }

  // Non-critical: join the classroom after the profile exists.
  // Any failure here is recoverable — the student can join later via the onboarding checklist.
  if (role === 'student' && classroomJoinCode?.trim()) {
    try {
      await joinClassroomByCode(user.uid, classroomJoinCode.trim())
    } catch (err) {
      console.warn('Classroom join during registration failed; user can join later:', err)
    }
  }

  return user
}

export async function loginUser(email: string, password: string): Promise<User> {
  const credential = await signInWithEmailAndPassword(auth, email, password)
  return credential.user
}

export async function logoutUser(): Promise<void> {
  await signOut(auth)
}

export async function sendPasswordReset(email: string, redirectUrl?: string): Promise<void> {
  const normalizedEmail = email.trim().toLowerCase()

  if (!redirectUrl) {
    await sendPasswordResetEmail(auth, normalizedEmail)
    return
  }

  try {
    await sendPasswordResetEmail(auth, normalizedEmail, {
      url: redirectUrl,
      handleCodeInApp: false,
    })
  } catch (err: unknown) {
    const code = typeof err === 'object' && err && 'code' in err ? String((err as { code?: string }).code) : ''
    if (code === 'auth/unauthorized-continue-uri' || code === 'auth/unauthorized-domain') {
      await sendPasswordResetEmail(auth, normalizedEmail)
      return
    }
    throw err
  }
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const snap = await getDoc(doc(db, 'users', uid))
  if (!snap.exists()) return null
  const data = snap.data()
  return {
    ...data,
    createdAt: data.createdAt?.toDate() ?? new Date(),
    trialEndsAt: data.trialEndsAt?.toDate() ?? undefined,
  } as UserProfile
}

async function resolveJoinCode(joinCode: string): Promise<string | null> {
  const q = query(collection(db, 'classrooms'), where('joinCode', '==', joinCode.toUpperCase()))
  const snap = await getDocs(q)
  if (snap.empty) return null
  return snap.docs[0].id
}
