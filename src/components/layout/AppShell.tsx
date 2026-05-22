import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { logoutUser } from '@/firebase/auth'
import { BookOpen, LogOut } from 'lucide-react'

interface Props {
  children: React.ReactNode
  title?: string
}

export default function AppShell({ children, title }: Props) {
  const { profile } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    await logoutUser()
    navigate('/login')
  }

  const homeLink = profile?.role === 'teacher' ? '/teacher' : '/student'

  return (
    <div className="min-h-screen bg-[#F8F9FC] flex flex-col">
      {/* Top nav */}
      <header className="bg-white border-b border-[#E5E7EB] sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to={homeLink} className="flex items-center gap-2">
            <div className="bg-[#4A90D9] text-white p-1.5 rounded-lg">
              <BookOpen size={20} />
            </div>
            <span className="text-lg font-bold text-[#1A1D23]">PagePal</span>
          </Link>

          {title && <h1 className="text-base font-semibold text-[#1A1D23] hidden sm:block">{title}</h1>}

          <div className="flex items-center gap-3">
            {profile && (
              <span className="text-sm text-[#4B5563] hidden sm:block">
                {profile.displayName}
              </span>
            )}
            <button
              onClick={handleLogout}
              aria-label="Sign out"
              className="flex items-center gap-1.5 text-sm text-[#4B5563] hover:text-[#1A1D23] transition-colors px-3 py-2 rounded-lg hover:bg-[#F3F4F6]"
            >
              <LogOut size={16} />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Page content */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-6">
        {children}
      </main>
    </div>
  )
}
