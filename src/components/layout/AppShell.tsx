import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { logoutUser } from '@/firebase/auth'
import { BookOpen, Eye, Home, LogOut, MessageSquare, Upload, Users } from 'lucide-react'

interface Props {
  children: React.ReactNode
  title?: string
}

const TEACHER_NAV = [
  { to: '/teacher', icon: Home, label: 'Home' },
  { to: '/teacher/classroom', icon: Users, label: 'Classroom' },
  { to: '/teacher/upload', icon: Upload, label: 'Upload' },
  { to: '/teacher/annotations', icon: Eye, label: 'Annotations' },
]

const STUDENT_NAV = [
  { to: '/student', icon: BookOpen, label: 'Books' },
  { to: '/student/annotations', icon: MessageSquare, label: 'My Notes' },
]

export default function AppShell({ children, title }: Props) {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const { pathname } = useLocation()

  async function handleLogout() {
    await logoutUser()
    navigate('/login')
  }

  const homeLink = profile?.role === 'teacher' ? '/teacher' : '/student'
  const navItems = profile?.role === 'teacher' ? TEACHER_NAV : STUDENT_NAV

  return (
    <div className="min-h-screen bg-[#F8F9FC] flex flex-col">
      {/* Top nav */}
      <header className="bg-white border-b border-[#E5E7EB] sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to={homeLink} className="flex items-center gap-2">
            <div className="bg-[#4A90D9] text-white p-1.5 rounded-lg">
              <BookOpen size={20} />
            </div>
            <span className="text-lg font-bold text-[#1A1D23]">Easy Annotate</span>
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

      {/* Page content — extra bottom padding on mobile for the bottom nav */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-6 pb-24 sm:pb-6">
        {children}
      </main>

      {/* Footer — desktop only (bottom nav covers mobile) */}
      <footer className="hidden sm:block border-t border-[#E5E7EB] bg-white mt-auto">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between gap-3 text-xs text-[#9CA3AF]">
          <span>© 2026 Easy Annotate</span>
          <div className="flex gap-4">
            <Link to="/privacy" className="hover:text-[#4A90D9]">Privacy Policy</Link>
            <Link to="/terms" className="hover:text-[#4A90D9]">Terms of Service</Link>
          </div>
        </div>
      </footer>

      {/* Bottom nav — mobile only */}
      {profile && (
        <nav
          className="sm:hidden fixed bottom-0 inset-x-0 bg-white border-t border-[#E5E7EB] z-40 flex"
          aria-label="Main navigation"
        >
          {navItems.map(({ to, icon: Icon, label }) => {
            const active = pathname === to
            return (
              <Link
                key={to}
                to={to}
                aria-label={label}
                aria-current={active ? 'page' : undefined}
                className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2 min-h-[56px] transition-colors ${
                  active ? 'text-[#4A90D9]' : 'text-[#6B7280] hover:text-[#1A1D23]'
                }`}
              >
                <Icon size={22} strokeWidth={active ? 2.5 : 1.75} />
                <span className="text-[10px] font-semibold">{label}</span>
              </Link>
            )
          })}
        </nav>
      )}
    </div>
  )
}
