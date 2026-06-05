import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  type User,
} from 'firebase/auth'
import { doc, setDoc, updateDoc, getDoc, serverTimestamp, collection, query, where, getDocs } from 'firebase/firestore'
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
      // Student emails are not stored in Firestore — kept in Firebase Auth only (FERPA PII minimization).
      // Teacher emails are stored so the Stripe checkout can be pre-filled.
      ...(role === 'teacher' ? { email } : {}),
      displayName,
      role,
      classroomId: null,
      subscriptionStatus: 'free',
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

export async function loginWithGoogle(): Promise<{ user: User; isNewUser: boolean }> {
  const provider = new GoogleAuthProvider()
  const credential = await signInWithPopup(auth, provider)
  const user = credential.user

  const existingProfile = await getUserProfile(user.uid)
  if (existingProfile) {
    return { user, isNewUser: false }
  }

  // New user — create a teacher profile (Google sign-in is teacher-only)
  const googleEmail = user.email
  if (!googleEmail) throw new Error('Your Google account has no email address. Please use a Google account with an email.')
  const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
  await setDoc(doc(db, 'users', user.uid), {
    uid: user.uid,
    email: googleEmail,
    displayName: user.displayName ?? googleEmail ?? 'Teacher',
    role: 'teacher' as UserRole,
    classroomId: null,
    subscriptionStatus: 'free',
    trialEndsAt,
    createdAt: serverTimestamp(),
  })

  return { user, isNewUser: true }
}

export async function logoutUser(): Promise<void> {
  await signOut(auth)
}

export async function updateTeacherDisplayName(uid: string, displayName: string): Promise<void> {
  const trimmed = displayName.trim()
  if (!trimmed) throw new Error('Display name cannot be empty.')
  await Promise.all([
    auth.currentUser ? updateProfile(auth.currentUser, { displayName: trimmed }) : Promise.resolve(),
    updateDoc(doc(db, 'users', uid), { displayName: trimmed }),
  ])
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
