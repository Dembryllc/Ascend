import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { loginUser, signInWithGoogleOnly, sendPasswordReset } from '@/firebase/auth'
import { useAuth } from '@/context/auth-context'
import { BookOpen } from 'lucide-react'

function authErrorMessage(err: unknown): string {
  const code = typeof err === 'object' && err && 'code' in err ? String((err as { code?: string }).code) : ''
  if (code === 'auth/invalid-email') return 'Enter a valid email address.'
  if (code === 'auth/user-not-found') return 'No Ascend account exists for that email address.'
  if (code === 'auth/missing-email') return 'Enter your email address first.'
  if (code === 'auth/unauthorized-continue-uri' || code === 'auth/unauthorized-domain') {
    return 'Password reset is blocked because this site domain is not authorized in Firebase Authentication settings.'
  }
  if (code === 'auth/too-many-requests') return 'Too many reset attempts. Wait a few minutes and try again.'
  return 'Could not send a reset email. Check the address and try again.'
}

export default function LoginPage() {
  const { profile, refreshProfile } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [resetMode, setResetMode] = useState(false)

  if (profile) {
    return <Navigate to={profile.role === 'teacher' ? '/teacher' : '/student'} replace />
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setMessage('')
    setLoading(true)
    try {
      await loginUser(email, password)
      // AuthContext will update; redirect happens via ProtectedRoute
    } catch (err: unknown) {
      const code = (err as { code?: string }).code
      if (code === 'auth/invalid-credential' || code === 'auth/user-not-found' || code === 'auth/wrong-password') {
        setError('Incorrect email or password. Please try again.')
      } else if (code === 'auth/invalid-email') {
        setError('That doesn\'t look like a valid email address.')
      } else if (code === 'auth/user-disabled') {
        setError('This account has been disabled. Contact your teacher.')
      } else if (code === 'auth/too-many-requests') {
        setError('Too many failed attempts. Please wait a few minutes and try again.')
      } else if (code === 'auth/invalid-api-key' || code === 'auth/app-not-authorized') {
        setError('App configuration error. Please contact support.')
      } else {
        setError('Sign-in failed. Please check your connection and try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogleSignIn() {
    setError('')
    setMessage('')
    setLoading(true)
    try {
      const found = await signInWithGoogleOnly()
      if (!found) {
        setError('No Easy Annotate account found for this Google account. Please register first.')
        return
      }
      await refreshProfile()
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? ''
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        // user dismissed — no error message needed
      } else if (code === 'auth/popup-blocked') {
        setError('Pop-up was blocked. Please allow pop-ups for this site and try again.')
      } else if (code === 'auth/account-exists-with-different-credential') {
        setError('An account already exists with this email. Sign in with your email and password instead.')
      } else {
        setError('Google sign-in failed. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  async function handlePasswordReset(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setMessage('')
    setLoading(true)
    try {
      const normalizedEmail = email.trim().toLowerCase()
      const redirectUrl = `${window.location.origin}/login`
      await sendPasswordReset(normalizedEmail, redirectUrl)
      setEmail(normalizedEmail)
      setMessage(`Password reset email sent to ${normalizedEmail}. Check spam or promotions if it does not appear in a minute.`)
    } catch (err: unknown) {
      setError(authErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F8F9FC] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-md p-8">
        <div className="flex items-center gap-2 justify-center mb-6">
          <div className="bg-[#4A90D9] text-white p-2 rounded-xl">
            <BookOpen size={28} />
          </div>
          <span className="text-2xl font-bold text-[#1A1D23]">Easy Annotate</span>
        </div>

        <h1 className="text-xl font-bold text-center mb-1 text-[#1A1D23]">
          {resetMode ? 'Reset your password' : 'Welcome back!'}
        </h1>
        <p className="text-center text-[#4B5563] mb-6 text-sm">
          {resetMode ? 'Enter your email and we’ll send a reset link.' : 'Sign in to continue reading'}
        </p>

        {!resetMode && (
          <>
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 border border-[#D1D5DB] rounded-xl px-4 py-3 text-base font-semibold text-[#1A1D23] bg-white hover:bg-[#F9FAFB] disabled:opacity-60 transition-colors mb-4"
            >
              <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
              </svg>
              Continue with Google
            </button>
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1 h-px bg-[#E5E7EB]" />
              <span className="text-xs text-[#9CA3AF] font-medium">or sign in with email</span>
              <div className="flex-1 h-px bg-[#E5E7EB]" />
            </div>
          </>
        )}

        <form onSubmit={resetMode ? handlePasswordReset : handleSubmit} className="space-y-4">
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

          {!resetMode && <div>
            <label htmlFor="password" className="block text-sm font-semibold text-[#1A1D23] mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Your password"
              className="w-full border border-[#D1D5DB] rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-[#4A90D9]"
            />
          </div>}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm" role="alert">
              {error}
            </div>
          )}

          {message && (
            <div className="bg-green-50 border border-green-200 text-green-700 rounded-xl px-4 py-3 text-sm" role="status">
              {message}
              <p className="mt-2 text-xs text-green-800">
                The reset link is sent by Firebase Authentication, not directly by Ascend.
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#4A90D9] hover:bg-[#357ABD] disabled:opacity-60 text-white font-bold py-3 rounded-xl text-base transition-colors"
          >
            {loading ? (resetMode ? 'Sending…' : 'Signing in…') : (resetMode ? 'Send Reset Link' : 'Sign In')}
          </button>
        </form>

        <button
          type="button"
          onClick={() => {
            setResetMode((v) => !v)
            setError('')
            setMessage('')
          }}
          className="w-full text-center text-sm text-[#4A90D9] font-semibold hover:underline mt-4"
        >
          {resetMode ? 'Back to sign in' : 'Forgot password?'}
        </button>

        <p className="text-center text-sm text-[#4B5563] mt-6">
          New to Easy Annotate?{' '}
          <Link to="/register" className="text-[#4A90D9] font-semibold hover:underline">
            Create an account
          </Link>
        </p>
        <p className="text-center text-xs text-[#9CA3AF] mt-3">
          <Link to="/" className="hover:text-[#4A90D9]">← Back to home</Link>
        </p>
      </div>
    </div>
  )
}
