import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { onAuthStateChanged, type User } from 'firebase/auth'
import { auth } from '@/firebase/config'
import { getUserProfile } from '@/firebase/auth'
import type { UserProfile } from '@/types'

interface AuthContextValue {
    user: User | null
    profile: UserProfile | null
    loading: boolean
    error: string | null
}

const AuthContext = createContext<AuthContextValue>({ user: null, profile: null, loading: true, error: null })

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null)
    const [profile, setProfile] = useState<UserProfile | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

  useEffect(() => {
        const unsub = onAuthStateChanged(
                auth,
                async (firebaseUser) => {
                          setUser(firebaseUser)
                          setError(null)
                          if (firebaseUser) {
                                      try {
                                                    const p = await getUserProfile(firebaseUser.uid)
                                                    setProfile(p)
                                      } catch (err: unknown) {
                                                    console.error('Failed to load user profile:', err)
                                                    setError(err instanceof Error ? err.message : 'Failed to load profile')
                                                    setProfile(null)
                                      }
                          } else {
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

  return <AuthContext.Provider value={{ user, profile, loading, error }}>{children}</AuthContext.Provider>AuthContext.Provider>
    }

export function useAuth() {
    return useContext(AuthContext)
}
