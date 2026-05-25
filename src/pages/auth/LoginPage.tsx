import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { loginUser, sendPasswordReset } from '@/firebase/auth'
import { useAuth } from '@/context/AuthContext'
import { BookOpen } from 'lucide-react'

export default function LoginPage() {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [resetMode, setResetMode] = useState(false)

  // If already logged in, redirect
  if (profile) {
    navigate(profile.role === 'teacher' ? '/teacher' : '/student', { replace: true })
    return null
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setMessage('')
    setLoading(true)
    try {
      await loginUser(email, password)
      // AuthContext will update; redirect happens via ProtectedRoute
    } catch {
      setError('Invalid email or password. Please try again.')
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
      await sendPasswordReset(email)
      setMessage('Password reset email sent. Check your inbox for the link from Firebase.')
      setResetMode(false)
    } catch (err: unknown) {
      if (err instanceof Error && err.message.includes('auth/invalid-email')) {
        setError('Enter a valid email address.')
      } else {
        setError('Could not send a reset email. Check the address and try again.')
      }
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
          <span className="text-2xl font-bold text-[#1A1D23]">Ascend Annotate</span>
        </div>

        <h1 className="text-xl font-bold text-center mb-1 text-[#1A1D23]">
          {resetMode ? 'Reset your password' : 'Welcome back!'}
        </h1>
        <p className="text-center text-[#4B5563] mb-6 text-sm">
          {resetMode ? 'Enter your email and we’ll send a reset link.' : 'Sign in to continue reading'}
        </p>

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
          New to Ascend Annotate?{' '}
          <Link to="/register" className="text-[#4A90D9] font-semibold hover:underline">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  )
}
