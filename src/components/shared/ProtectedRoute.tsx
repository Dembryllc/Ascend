import { useEffect, useRef, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/auth-context'
import { logoutUser } from '@/firebase/auth'
import { homeForRole } from '@/types'
import type { UserRole } from '@/types'

interface Props {
  children: React.ReactNode
  requiredRole?: UserRole | UserRole[]
}

function LoadingScreen({ label }: { label: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8F9FC]">
      <div className="text-center">
        <div className="inline-block w-10 h-10 border-4 border-[#4A90D9] border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-[#4B5563] text-base">{label}</p>
      </div>
    </div>
  )
}

export default function ProtectedRoute({ children, requiredRole }: Props) {
  const { user, profile, loading, refreshProfile } = useAuth()
  const navigate = useNavigate()
  // Last-resort re-check: a profile written moments ago (registration, Google
  // sign-up) may not have been visible to the auth listener's read. Try once more
  // here before telling anyone their account setup failed.
  const [recheckedUid, setRecheckedUid] = useState<string | null>(null)
  const recheckStartedForRef = useRef<string | null>(null)

  const uid = user?.uid ?? null
  const missingProfile = !loading && !!uid && !profile

  useEffect(() => {
    if (!missingProfile || !uid || recheckStartedForRef.current === uid) return
    recheckStartedForRef.current = uid
    let cancelled = false
    refreshProfile().finally(() => {
      if (!cancelled) setRecheckedUid(uid)
    })
    return () => { cancelled = true }
  }, [missingProfile, uid, refreshProfile])

  async function handleRetry() {
    setRecheckedUid(null)
    await refreshProfile()
    setRecheckedUid(uid)
  }

  if (loading) return <LoadingScreen label="Loading…" />

  if (!user) return <Navigate to="/login" replace />

  const allowedRoles = requiredRole
    ? (Array.isArray(requiredRole) ? requiredRole : [requiredRole])
    : null

  if (allowedRoles && !profile && recheckedUid !== uid) {
    return <LoadingScreen label="Finishing account setup…" />
  }

  // Authenticated but still no Firestore profile after a re-check — registration
  // really did fail mid-flight. Show a recovery screen rather than entering an
  // infinite redirect loop.
  if (allowedRoles && !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8F9FC] p-4">
        <div className="bg-white rounded-2xl border border-[#F3F4F6] shadow-sm max-w-md w-full p-6 text-center">
          <h2 className="text-xl font-bold text-[#1A1D23] mb-2">Account setup incomplete</h2>
          <p className="text-[#4B5563] text-sm mb-6">
            Your account was created, but we couldn't load your profile. Try again — if it keeps
            happening, sign out and sign back in with the same email and password.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={handleRetry}
              className="bg-[#4A90D9] text-white font-bold px-5 py-3 rounded-xl hover:bg-[#357ABD] transition-colors"
            >
              Try again
            </button>
            <button
              onClick={() => logoutUser().then(() => navigate('/login'))}
              className="border border-[#D1D5DB] text-[#1A1D23] font-semibold px-5 py-3 rounded-xl hover:bg-[#F9FAFB] transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (allowedRoles && profile && !allowedRoles.includes(profile.role)) {
    return <Navigate to={homeForRole(profile.role)} replace />
  }

  return <>{children}</>
}
