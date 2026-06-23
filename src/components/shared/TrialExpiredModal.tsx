import { Link } from 'react-router-dom'
import { Clock, X } from 'lucide-react'
import { useAuth } from '@/context/auth-context'
import { stripeAnnualUrl, stripeMonthlyUrl } from '@/utils/stripe'

interface Props {
  onClose: () => void
}

export default function TrialExpiredModal({ onClose }: Props) {
  const { profile } = useAuth()
  const annualUrl = stripeAnnualUrl(profile)
  const monthlyUrl = stripeMonthlyUrl(profile)

  return (
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="trial-expired-modal-title"
        className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4">
          <div className="bg-amber-50 p-2 rounded-xl">
            <Clock size={22} className="text-amber-500" />
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg text-[#9CA3AF] hover:text-[#1A1D23] hover:bg-[#F3F4F6] transition-colors -mr-2 -mt-1"
          >
            <X size={20} />
          </button>
        </div>

        <h3 id="trial-expired-modal-title" className="text-lg font-bold text-[#1A1D23] mb-2">
          Your free trial has ended
        </h3>
        <p className="text-sm text-[#4B5563] mb-1">
          You had full Pro access for 14 days — we hope it was useful.
        </p>
        <p className="text-sm text-[#4B5563] mb-6">
          Upgrade to Pro to keep unlimited books, unlimited students, and PDF annotation export.
        </p>

        {annualUrl ? (
          <div className="space-y-2">
            <a
              href={annualUrl}
              className="block w-full text-center bg-[#4A90D9] text-white font-bold py-3 rounded-xl hover:bg-[#357ABD] transition-colors"
            >
              Upgrade to Pro — $72/year
            </a>
            {monthlyUrl && (
              <a
                href={monthlyUrl}
                className="block w-full text-center py-2 text-sm text-[#4B5563] hover:text-[#1A1D23] transition-colors"
              >
                or $8/month
              </a>
            )}
          </div>
        ) : (
          <Link
            to="/pricing"
            className="block w-full text-center bg-[#4A90D9] text-white font-bold py-3 rounded-xl hover:bg-[#357ABD] transition-colors"
          >
            Upgrade to Pro — $8/month
          </Link>
        )}

        <button
          onClick={onClose}
          className="block w-full text-center mt-2 py-2 text-sm text-[#9CA3AF] hover:text-[#4B5563] transition-colors"
        >
          Maybe later
        </button>
      </div>
    </div>
  )
}
