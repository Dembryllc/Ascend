import { Link } from 'react-router-dom'
import { BookOpen, Check, Lock } from 'lucide-react'
import { useAuth } from '@/context/auth-context'
import { isPro, homeForRole } from '@/types'
import { stripeMonthlyUrl, stripeAnnualUrl } from '@/utils/stripe'

const FREE_FEATURES = [
  '1 classroom',
  'Up to 30 students',
  'Up to 5 books',
  'Emoji reactions + written notes',
  'Student reading progress',
]

const PRO_FEATURES = [
  'Unlimited classrooms',
  'Unlimited students',
  'Unlimited books',
  'PDF annotation export',
  'Priority support',
  '14-day free trial',
]

export default function PricingPage() {
  const { profile } = useAuth()
  const userIsPro = isPro(profile)

  const monthlyUrl = stripeMonthlyUrl(profile)
  const annualUrl = stripeAnnualUrl(profile)

  return (
    <div className="min-h-screen bg-[#F8F9FC]">
      <header className="bg-white border-b border-[#E5E7EB] sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to={profile ? homeForRole(profile.role) : '/login'} className="flex items-center gap-2">
            <div className="bg-[#4A90D9] text-white p-1.5 rounded-lg">
              <BookOpen size={20} />
            </div>
            <span className="text-lg font-bold text-[#1A1D23]">Easy Annotate</span>
          </Link>
          {profile ? (
            <Link to={homeForRole(profile.role)} className="text-sm text-[#4A90D9] font-semibold hover:underline">
              Back to dashboard
            </Link>
          ) : (
            <Link to="/login" className="text-sm text-[#4A90D9] font-semibold hover:underline">
              Sign in
            </Link>
          )}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-[#1A1D23] mb-3">Simple, honest pricing</h1>
          <p className="text-lg text-[#4B5563]">Start free. Upgrade when your classroom grows.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto mb-16">
          {/* Free plan */}
          <div className="bg-white rounded-2xl border border-[#E5E7EB] p-8">
            <h2 className="text-xl font-bold text-[#1A1D23] mb-1">Free</h2>
            <p className="text-[#4B5563] text-sm mb-4">Great for trying it out.</p>
            <div className="mb-6">
              <span className="text-4xl font-bold text-[#1A1D23]">$0</span>
              <span className="text-[#9CA3AF] ml-1">/ month</span>
            </div>
            <ul className="space-y-3 mb-8">
              {FREE_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm text-[#4B5563]">
                  <Check size={16} className="text-[#5BB974] shrink-0 mt-0.5" />
                  {f}
                </li>
              ))}
              <li className="flex items-start gap-2.5 text-sm text-[#9CA3AF]">
                <Lock size={16} className="shrink-0 mt-0.5" />
                PDF annotation export
              </li>
            </ul>
            {profile && !userIsPro ? (
              <div className="w-full text-center py-3 rounded-xl bg-[#F3F4F6] text-sm font-semibold text-[#4B5563]">
                Your current plan
              </div>
            ) : !profile ? (
              <Link
                to="/register"
                className="block w-full text-center py-3 rounded-xl bg-[#4A90D9] text-white font-bold hover:bg-[#357ABD] transition-colors"
              >
                Get started free
              </Link>
            ) : null}
          </div>

          {/* Pro plan */}
          <div className="bg-[#1A1D23] rounded-2xl p-8 relative overflow-hidden">
            <div className="absolute top-4 right-4 bg-[#F5C842] text-[#1A1D23] text-xs font-bold px-3 py-1 rounded-full">
              14-day free trial
            </div>
            <h2 className="text-xl font-bold text-white mb-1">Pro</h2>
            <p className="text-white/60 text-sm mb-4">For active classrooms.</p>
            <div className="mb-1">
              <span className="text-4xl font-bold text-white">$8</span>
              <span className="text-white/60 ml-1">/ month</span>
            </div>
            <p className="text-white/50 text-xs mb-6">or $72/year (save 25%)</p>
            <ul className="space-y-3 mb-8">
              {PRO_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm text-white/80">
                  <Check size={16} className="text-[#5BB974] shrink-0 mt-0.5" />
                  {f}
                </li>
              ))}
            </ul>

            {userIsPro ? (
              <div className="w-full text-center py-3 rounded-xl bg-white/10 text-sm font-semibold text-white">
                Your current plan
              </div>
            ) : monthlyUrl ? (
              <div className="space-y-2">
                <a
                  href={annualUrl ?? monthlyUrl}
                  className="block w-full text-center py-3 rounded-xl bg-[#F5C842] text-[#1A1D23] font-bold hover:bg-[#E6B93A] transition-colors"
                >
                  Start free trial — $72/year
                </a>
                <a
                  href={monthlyUrl}
                  className="block w-full text-center py-2.5 rounded-xl text-white/70 text-sm hover:text-white transition-colors"
                >
                  or $8/month
                </a>
              </div>
            ) : (
              <div className="w-full text-center py-3 rounded-xl bg-white/10 text-sm text-white/60">
                Upgrade coming soon
              </div>
            )}
          </div>
        </div>

        {/* District section */}
        <div className="max-w-3xl mx-auto bg-white rounded-2xl border border-[#E5E7EB] p-8 text-center">
          <h2 className="text-2xl font-bold text-[#1A1D23] mb-2">District license</h2>
          <p className="text-[#4B5563] mb-2">
            Deploying across multiple schools? We offer district-wide licenses with admin controls,
            SSO options, and a dedicated onboarding call.
          </p>
          <p className="text-sm text-[#9CA3AF] mb-6">Custom pricing · FERPA data agreements · Priority support</p>
          <a
            href="mailto:dembryllc@gmail.com?subject=Easy Annotate district license inquiry"
            className="inline-block bg-[#4A90D9] text-white font-bold px-8 py-3 rounded-xl hover:bg-[#357ABD] transition-colors"
          >
            Contact us
          </a>
        </div>
      </main>

      <footer className="border-t border-[#E5E7EB] bg-white mt-16">
        <div className="max-w-5xl mx-auto px-4 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-[#9CA3AF]">
          <span>© 2026 Easy Annotate. All rights reserved.</span>
          <div className="flex gap-4">
            <Link to="/accessibility" className="hover:text-[#4A90D9]">Accessibility</Link>
            <Link to="/privacy" className="hover:text-[#4A90D9]">Privacy Policy</Link>
            <Link to="/terms" className="hover:text-[#4A90D9]">Terms of Service</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
