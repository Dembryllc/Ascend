import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/auth-context'
import { logoutUser } from '@/firebase/auth'
import { openBillingPortal } from '@/firebase/billing'
import { getTrialDaysRemaining, homeForRole } from '@/types'
import { stripeAnnualUrl } from '@/utils/stripe'
import { BarChart3, BookOpen, CreditCard, Eye, Home, Loader2, LogOut, MessageSquare, PenLine, TrendingUp, Upload, Users, X } from 'lucide-react'

interface Props {
  children: React.ReactNode
  title?: string
}

const TEACHER_NAV = [
  { to: '/teacher', icon: Home, label: 'Home' },
  { to: '/teacher/classroom', icon: Users, label: 'Classroom' },
  { to: '/teacher/upload', icon: Upload, label: 'Upload' },
  { to: '/teacher/writing', icon: PenLine, label: 'Writing' },
  { to: '/teacher/annotations', icon: Eye, label: 'Annotations' },
  { to: '/teacher/progress', icon: BarChart3, label: 'Progress' },
]

const STUDENT_NAV = [
  { to: '/student',             icon: BookOpen,      label: 'Books'    },
  { to: '/student/annotations', icon: MessageSquare, label: 'My Notes' },
  { to: '/student/progress',    icon: TrendingUp,    label: 'Progress' },
]

function TrialBanner({ daysRemaining, upgradeUrl }: { daysRemaining: number; upgradeUrl: string | null }) {
  const [dismissed, setDismissed] = useState(
    () => sessionStorage.getItem('trial-banner-dismissed') === 'true'
  )

  if (dismissed) return null

  function dismiss() {
    sessionStorage.setItem('trial-banner-dismissed', 'true')
    setDismissed(true)
  }

  const urgent = daysRemaining <= 3
  const warning = daysRemaining <= 7

  const bgColor = urgent ? 'bg-red-50 border-red-200' : warning ? 'bg-amber-50 border-amber-200' : 'bg-blue-50 border-blue-100'
  const textColor = urgent ? 'text-red-700' : warning ? 'text-amber-700' : 'text-[#185FA5]'
  const linkColor = urgent ? 'text-red-800 underline font-bold' : warning ? 'text-amber-800 underline font-semibold' : 'text-[#4A90D9] underline font-semibold'

  const message = urgent
    ? `Your free trial ends in ${daysRemaining} day${daysRemaining === 1 ? '' : 's'} — upgrade now to keep Pro access.`
    : warning
    ? `${daysRemaining} days left in your Pro trial.`
    : `${daysRemaining} days left in your free Pro trial.`

  return (
    <div className={`border-b ${bgColor} ${textColor} px-4 py-2 flex items-center justify-between gap-3 text-sm`}>
      <p>
        {message}{' '}
        {upgradeUrl ? (
          <a href={upgradeUrl} className={linkColor}>
            Upgrade to Pro →
          </a>
        ) : (
          <Link to="/pricing" className={linkColor}>
            Upgrade to Pro →
          </Link>
        )}
      </p>
      <button
        onClick={dismiss}
        aria-label="Dismiss trial banner"
        className="shrink-0 opacity-60 hover:opacity-100 transition-opacity"
      >
        <X size={14} />
      </button>
    </div>
  )
}

function ManageSubscriptionButton() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleClick() {
    setLoading(true)
    setError('')
    try {
      const url = await openBillingPortal()
      window.location.href = url
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not open billing portal.')
      setLoading(false)
    }
  }

  return (
    <div className="relative">
      <button
        onClick={handleClick}
        disabled={loading}
        aria-label="Manage subscription"
        className="flex items-center gap-1.5 text-sm text-[#4B5563] hover:text-[#1A1D23] transition-colors px-3 py-2 rounded-lg hover:bg-[#F3F4F6] disabled:opacity-60"
      >
        {loading ? <Loader2 size={16} className="animate-spin" /> : <CreditCard size={16} />}
        <span className="hidden sm:inline">Manage subscription</span>
      </button>
      {error && (
        <p className="absolute right-0 top-full mt-1 w-56 text-xs text-red-600 bg-white border border-red-200 rounded-lg p-2 shadow-sm z-50">
          {error}
        </p>
      )}
    </div>
  )
}

export default function AppShell({ children, title }: Props) {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const { pathname } = useLocation()

  async function handleLogout() {
    await logoutUser()
    navigate('/login')
  }

  const homeLink = profile ? homeForRole(profile.role) : '/'
  const navItems = profile?.role === 'teacher' ? TEACHER_NAV : STUDENT_NAV

  // Find the most-specific nav item whose path matches the current route.
  // Using longest-match-wins so /student/annotations beats /student.
  const activeNavTo = navItems
    .filter(({ to }) => pathname === to || pathname.startsWith(to + '/'))
    .sort((a, b) => b.to.length - a.to.length)[0]?.to ?? null

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
            {profile?.stripeCustomerId && <ManageSubscriptionButton />}
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

      {/* Trial banner — teachers and individuals with an active trial */}
      {(profile?.role === 'teacher' || profile?.role === 'individual') && (() => {
        const days = getTrialDaysRemaining(profile)
        return days !== null ? <TrialBanner daysRemaining={days} upgradeUrl={stripeAnnualUrl(profile)} /> : null
      })()}

      {/* Page content — extra bottom padding on mobile for the bottom nav */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-6 pb-24 sm:pb-6">
        {children}
      </main>

      {/* Footer — desktop only (bottom nav covers mobile) */}
      <footer className="hidden sm:block border-t border-[#E5E7EB] bg-white mt-auto">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between gap-3 text-xs text-[#9CA3AF]">
          <span>© 2026 Easy Annotate</span>
          <div className="flex gap-4">
            <Link to="/pricing" className="hover:text-[#4A90D9]">Pricing</Link>
            <Link to="/privacy" className="hover:text-[#4A90D9]">Privacy Policy</Link>
            <Link to="/terms" className="hover:text-[#4A90D9]">Terms of Service</Link>
            <a
              href={`mailto:dembryllc@gmail.com?subject=${encodeURIComponent('Account deletion request')}&body=${encodeURIComponent('Please delete my Easy Annotate account and all associated data.\n\nDisplay name: \nEmail: ')}`}
              className="hover:text-[#4A90D9]"
            >
              Delete Account
            </a>
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
            const active = activeNavTo === to
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
