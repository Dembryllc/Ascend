import {
  createUserWithEmailAndPassword,
  getRedirectResult,
  GoogleAuthProvider,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  updateProfile,
  type User,
} from 'firebase/auth'
import { doc, setDoc, updateDoc, getDoc, serverTimestamp, collection, query, where, getDocs } from 'firebase/firestore'
import { auth, db } from './config'
import type { UserRole, UserProfile } from '@/types'
import { joinClassroomByCode } from './classrooms'
import { getStoredAttribution } from '@/utils/attribution'

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

    const trialEndsAt = (role === 'teacher' || role === 'individual')
      ? new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
      : null
    // Marketing attribution (e.g. the LinkedIn/Instagram launch push) — read once here,
    // not resolved further downstream. Only meaningful for trial signups; the AC sync
    // Cloud Function (functions/src/activecampaign.ts) decides what to do with it.
    const attribution = trialEndsAt ? getStoredAttribution() : null

    await setDoc(doc(db, 'users', user.uid), {
      uid: user.uid,
      // Student emails are not stored in Firestore (FERPA PII minimization — Auth only).
      // Teacher and individual emails are stored for billing and account recovery.
      ...(role !== 'student' ? { email } : {}),
      displayName,
      role,
      classroomId: null,
      subscriptionStatus: 'free',
      ...(trialEndsAt ? { trialEndsAt } : {}),
      ...(attribution?.source ? { signupSource: attribution.source } : {}),
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

export async function loginWithGoogle(role: UserRole = 'teacher'): Promise<{ user: User; isNewUser: boolean }> {
  sessionStorage.setItem('google-signup-role', role)
  const provider = new GoogleAuthProvider()
  try {
    const credential = await signInWithPopup(auth, provider)
    const user = credential.user
    const existingProfile = await getUserProfile(user.uid)
    if (existingProfile) {
      sessionStorage.removeItem('google-signup-role')
      return { user, isNewUser: false }
    }
    await writeGoogleProfile(user, role)
    sessionStorage.removeItem('google-signup-role')
    return { user, isNewUser: true }
  } catch (err: unknown) {
    const code = (err as { code?: string }).code
    if (code === 'auth/popup-blocked') {
      await signInWithRedirect(auth, provider)
      // Page navigates away — this line is never reached
    }
    throw err
  }
}

// Used on the Login page — signs in with Google but never auto-creates a profile.
// Returns true if an existing profile was found, false if the user has no account yet.
export async function signInWithGoogleOnly(): Promise<boolean> {
  const provider = new GoogleAuthProvider()
  try {
    const credential = await signInWithPopup(auth, provider)
    const profile = await getUserProfile(credential.user.uid)
    if (!profile) {
      await signOut(auth)
      return false
    }
    return true
  } catch (err: unknown) {
    const code = (err as { code?: string }).code
    if (code === 'auth/popup-blocked') {
      await signInWithRedirect(auth, provider)
      // Page navigates away — this line is never reached
    }
    throw err
  }
}

export async function logoutUser(): Promise<void> {
  await signOut(auth)
}

export async function finalizeGoogleSignIn(user: User): Promise<void> {
  const existing = await getUserProfile(user.uid)
  if (existing) return
  const role = (sessionStorage.getItem('google-signup-role') ?? 'teacher') as UserRole
  sessionStorage.removeItem('google-signup-role')
  await writeGoogleProfile(user, role)
}

// Shared profile-write logic for Google sign-up (popup and redirect paths).
async function writeGoogleProfile(user: User, role: UserRole): Promise<void> {
  const email = user.email
  if (!email) throw new Error('Your Google account has no email address. Please use a Google account with an email.')
  const isStudent = role === 'student'
  const hasTrial = role === 'teacher' || role === 'individual'
  const attribution = hasTrial ? getStoredAttribution() : null
  await setDoc(doc(db, 'users', user.uid), {
    uid: user.uid,
    // FERPA: student email stays in Firebase Auth only, never Firestore.
    ...(isStudent ? {} : { email }),
    displayName: user.displayName ?? (isStudent ? 'Student' : email),
    role,
    classroomId: null,
    subscriptionStatus: 'free',
    ...(hasTrial ? { trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) } : {}),
    ...(attribution?.source ? { signupSource: attribution.source } : {}),
    createdAt: serverTimestamp(),
  })
}

export async function handleGoogleRedirectResult(): Promise<boolean> {
  const result = await getRedirectResult(auth)
  if (!result?.user) return false
  await finalizeGoogleSignIn(result.user)
  return true
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
