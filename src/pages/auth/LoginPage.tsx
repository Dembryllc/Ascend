import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { loginUser } from '@/firebase/auth'
import { useAuth } from '@/context/AuthContext'
import { BookOpen } from 'lucide-react'

export default function LoginPage() {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // If already logged in, redirect
  if (profile) {
    navigate(profile.role === 'teacher' ? '/teacher' : '/student', { replace: true })
    return null
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
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

  return (
    <div className="min-h-screen bg-[#F8F9FC] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-md p-8">
        <div className="flex items-center gap-2 justify-center mb-6">
          <div className="bg-[#4A90D9] text-white p-2 rounded-xl">
            <BookOpen size={28} />
          </div>
          <span className="text-2xl font-bold text-[#1A1D23]">PagePal</span>
        </div>

        <h1 className="text-xl font-bold text-center mb-1 text-[#1A1D23]">Welcome back!</h1>
        <p className="text-center text-[#4B5563] mb-6 text-sm">Sign in to continue reading</p>

        <form onSubmit={handleSubmit} className="space-y-4">
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
              placeholder="Your password"
              className="w-full border border-[#D1D5DB] rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-[#4A90D9]"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm" role="alert">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#4A90D9] hover:bg-[#357ABD] disabled:opacity-60 text-white font-bold py-3 rounded-xl text-base transition-colors"
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <p className="text-center text-sm text-[#4B5563] mt-6">
          New to PagePal?{' '}
          <Link to="/register" className="text-[#4A90D9] font-semibold hover:underline">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  )
}
