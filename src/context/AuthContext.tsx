import { createContext, useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { onAuthStateChanged, type User } from 'firebase/auth'
import { auth } from '@/firebase/config'
import { getUserProfile, handleGoogleRedirectResult } from '@/firebase/auth'
import type { UserProfile } from '@/types'

interface AuthContextValue {
  user: User | null
  profile: UserProfile | null
  loading: boolean
  error: string | null
  refreshProfile: () => Promise<UserProfile | null>
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  profile: null,
  loading: true,
  error: null,
  refreshProfile: async () => null,
})

// A brand-new account is signed in by createUserWithEmailAndPassword *before*
// registerUser has written the Firestore profile — and a student join code adds two
// more round-trips (code lookup + classroom join) before the write lands. The first
// profile read therefore legitimately comes back empty. Re-read a few times before
// concluding the profile is missing, otherwise ProtectedRoute shows "Account setup
// incomplete" for an account whose profile saved perfectly well.
const PROFILE_RETRY_DELAYS_MS = [400, 800, 1600]

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const userRef = useRef<User | null>(null)
  // Bumped whenever a newer profile load supersedes an older one, so a slow
  // retry loop can never overwrite a fresher result with a stale null.
  const loadGenRef = useRef(0)

  const refreshProfile = useCallback(async (): Promise<UserProfile | null> => {
    const current = userRef.current ?? auth.currentUser
    if (!current) return null
    try {
      const p = await getUserProfile(current.uid)
      if (p) {
        loadGenRef.current += 1
        setProfile(p)
        setLoading(false)
      }
      return p
    } catch (err: unknown) {
      console.error('Failed to refresh profile:', err)
      return null
    }
  }, [])

  // Handle the case where signInWithPopup fell back to redirect mode (popup-blocked
  // browsers, mobile Safari). When the page reloads after the OAuth redirect, the
  // signInWithPopup promise is gone — getRedirectResult recovers the result and
  // ensures the Firestore profile gets written if this was a new teacher signing up.
  useEffect(() => {
    handleGoogleRedirectResult()
      .then((handled) => { if (handled) refreshProfile() })
      .catch((err) => console.error('Redirect result error:', err))
  }, [refreshProfile])

  useEffect(() => {
    const unsub = onAuthStateChanged(
      auth,
      async (firebaseUser) => {
        userRef.current = firebaseUser
        loadGenRef.current += 1
        const gen = loadGenRef.current
        const isCurrent = () => loadGenRef.current === gen

        setUser(firebaseUser)
        setError(null)

        if (!firebaseUser) {
          setProfile(null)
          setLoading(false)
          return
        }

        try {
          let p = await getUserProfile(firebaseUser.uid)
          for (const delayMs of PROFILE_RETRY_DELAYS_MS) {
            if (p || !isCurrent()) break
            await wait(delayMs)
            if (!isCurrent()) break
            p = await getUserProfile(firebaseUser.uid)
          }
          if (!isCurrent()) return
          setProfile(p)
        } catch (err: unknown) {
          console.error('Failed to load user profile:', err)
          if (!isCurrent()) return
          setError(err instanceof Error ? err.message : 'Failed to load profile')
          setProfile(null)
        }
        setLoading(false)
      },
      (err) => {
        // onAuthStateChanged error callback — e.g. network failure
        console.error('Auth state error:', err)
        setError(err.message)
        setLoading(false)
      },
    )
    return unsub
  }, [])

  return (
    <AuthContext.Provider value={{ user, profile, loading, error, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export { AuthContext }
