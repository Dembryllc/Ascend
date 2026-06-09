import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/auth-context'
import { logoutUser } from '@/firebase/auth'
import type { UserRole } from '@/types'

interface Props {
  children: React.ReactNode
  requiredRole?: UserRole
}

export default function ProtectedRoute({ children, requiredRole }: Props) {
  const { user, profile, loading } = useAuth()
  const navigate = useNavigate()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8F9FC]">
        <div className="text-center">
          <div className="inline-block w-10 h-10 border-4 border-[#4A90D9] border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-[#4B5563] text-base">Loading…</p>
        </div>
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />

  // Authenticated but no Firestore profile — registration failed mid-flight.
  // Show a recovery screen rather than entering an infinite redirect loop.
  if (requiredRole && !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8F9FC] p-4">
        <div className="bg-white rounded-2xl border border-[#F3F4F6] shadow-sm max-w-md w-full p-6 text-center">
          <h2 className="text-xl font-bold text-[#1A1D23] mb-2">Account setup incomplete</h2>
          <p className="text-[#4B5563] text-sm mb-6">
            Your account was created but the profile could not be saved. Please sign out and register again.
          </p>
          <button
            onClick={() => logoutUser().then(() => navigate('/login'))}
            className="bg-[#4A90D9] text-white font-bold px-5 py-3 rounded-xl hover:bg-[#357ABD] transition-colors"
          >
            Sign out and try again
          </button>
        </div>
      </div>
    )
  }

  if (requiredRole && profile?.role !== requiredRole) {
    return <Navigate to={profile?.role === 'teacher' ? '/teacher' : '/student'} replace />
  }

  return <>{children}</>
}
