import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { registerUser, loginWithGoogle } from '@/firebase/auth'
import type { UserRole } from '@/types'
import { BookOpen } from 'lucide-react'

function getAuthErrorMessage(err: unknown): string {
  const code = typeof err === 'object' && err !== null && 'code' in err
    ? String((err as { code: string }).code)
    : ''
  switch (code) {
    case 'auth/email-already-in-use':
      return 'An account with this email already exists. Try signing in instead.'
    case 'auth/invalid-email':
      return 'Please enter a valid email address.'
    case 'auth/weak-password':
      return 'Password must be at least 6 characters.'
    case 'auth/network-request-failed':
      return 'Connection failed. Check your internet and try again.'
    case 'auth/too-many-requests':
      return 'Too many attempts. Please wait a moment and try again.'
    default:
      return err instanceof Error ? err.message : 'Registration failed. Please try again.'
  }
}

export default function RegisterPage() {
  const navigate = useNavigate()
  const [role, setRole] = useState<UserRole>('student')
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleGoogleSignUp() {
    setError('')
    setLoading(true)
    try {
      await loginWithGoogle()
      navigate('/teacher')
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? ''
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        // dismissed — no error
      } else if (code === 'auth/popup-blocked') {
        setError('Pop-up was blocked. Please allow pop-ups for this site and try again.')
      } else if (code === 'auth/account-exists-with-different-credential') {
        setError('An account already exists with this email. Sign in with your email and password instead.')
      } else {
        setError('Google sign-up failed. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await registerUser(email, password, displayName, role, joinCode.trim() || undefined)
      navigate(role === 'teacher' ? '/teacher' : '/student')
    } catch (err: unknown) {
      setError(getAuthErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F8F9FC] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-md p-8">
        {/* Logo */}
        <div className="flex items-center gap-2 justify-center mb-6">
          <div className="bg-[#4A90D9] text-white p-2 rounded-xl">
            <BookOpen size={28} />
          </div>
          <span className="text-2xl font-bold text-[#1A1D23]">Easy Annotate</span>
        </div>

        <h1 className="text-xl font-bold text-center mb-1 text-[#1A1D23]">Create your account</h1>
        <p className="text-center text-[#4B5563] mb-6 text-sm">Join Easy Annotate to start reading and annotating</p>

        {/* Role toggle */}
        <div className="flex rounded-xl overflow-hidden border border-[#E5E7EB] mb-6">
          {(['student', 'teacher'] as UserRole[]).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRole(r)}
              className={`flex-1 py-3 text-base font-semibold capitalize transition-colors ${
                role === r
                  ? 'bg-[#4A90D9] text-white'
                  : 'bg-white text-[#4B5563] hover:bg-[#F3F4F6]'
              }`}
            >
              {r === 'student' ? '🎒 Student' : '🍎 Teacher'}
            </button>
          ))}
        </div>

        {role === 'teacher' && (
          <>
            <button
              type="button"
              onClick={handleGoogleSignUp}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 border border-[#D1D5DB] rounded-xl px-4 py-3 text-base font-semibold text-[#1A1D23] bg-white hover:bg-[#F9FAFB] disabled:opacity-60 transition-colors mb-4"
            >
              <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
              </svg>
              Sign up with Google
            </button>
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1 h-px bg-[#E5E7EB]" />
              <span className="text-xs text-[#9CA3AF] font-medium">or create account with email</span>
              <div className="flex-1 h-px bg-[#E5E7EB]" />
            </div>
          </>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="displayName" className="block text-sm font-semibold text-[#1A1D23] mb-1">
              {role === 'student' ? 'First name or nickname' : 'Full Name'}
            </label>
            <input
              id="displayName"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
              placeholder={role === 'student' ? 'e.g. Alex or AlexReads' : 'Your full name'}
              className="w-full border border-[#D1D5DB] rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-[#4A90D9]"
            />
            {role === 'student' && (
              <p className="text-xs text-[#6B7280] mt-1">You can use just your first name — no need to use your full name</p>
            )}
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-semibold text-[#1A1D23] mb-1">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
              className="w-full border border-[#D1D5DB] rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-[#4A90D9]"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-semibold text-[#1A1D23] mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              placeholder="At least 6 characters"
              className="w-full border border-[#D1D5DB] rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-[#4A90D9]"
            />
          </div>

          {role === 'student' && (
            <div>
              <label htmlFor="joinCode" className="block text-sm font-semibold text-[#1A1D23] mb-1">
                Class Join Code <span className="text-[#9CA3AF] font-normal">(optional)</span>
              </label>
              <input
                id="joinCode"
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                maxLength={6}
                placeholder="e.g. AB3X7K — ask your teacher"
                className="w-full border border-[#D1D5DB] rounded-xl px-4 py-3 text-base font-mono tracking-widest uppercase focus:outline-none focus:ring-2 focus:ring-[#4A90D9]"
              />
              {joinCode.length > 0 && joinCode.length < 6
                ? <p className="text-xs text-amber-600 mt-1">Join codes are 6 characters — keep typing ({joinCode.length}/6)</p>
                : <p className="text-xs text-[#6B7280] mt-1">You can join a class later if you don't have a code yet</p>
              }
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm" role="alert">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || (role === 'student' && joinCode.length > 0 && joinCode.length < 6)}
            className="w-full bg-[#4A90D9] hover:bg-[#357ABD] disabled:opacity-60 text-white font-bold py-3 rounded-xl text-base transition-colors"
          >
            {loading ? 'Creating account…' : 'Create Account'}
          </button>
        </form>

        <p className="text-center text-sm text-[#4B5563] mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-[#4A90D9] font-semibold hover:underline">
            Sign in
          </Link>
        </p>
        <p className="text-center text-xs text-[#9CA3AF] mt-3">
          <Link to="/" className="hover:text-[#4A90D9]">← Back to home</Link>
        </p>
      </div>
    </div>
  )
}
