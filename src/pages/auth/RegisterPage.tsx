import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { registerUser } from '@/firebase/auth'
import type { UserRole } from '@/types'
import { BookOpen } from 'lucide-react'

export default function RegisterPage() {
  const navigate = useNavigate()
  const [role, setRole] = useState<UserRole>('student')
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await registerUser(email, password, displayName, role, joinCode.trim() || undefined)
      navigate(role === 'teacher' ? '/teacher' : '/student')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Registration failed. Please try again.')
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

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="displayName" className="block text-sm font-semibold text-[#1A1D23] mb-1">
              Full Name
            </label>
            <input
              id="displayName"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
              placeholder="Your name"
              className="w-full border border-[#D1D5DB] rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-[#4A90D9]"
            />
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
              <p className="text-xs text-[#6B7280] mt-1">You can join a class later if you don't have a code yet</p>
            </div>
          )}

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
