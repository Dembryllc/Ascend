import { Link } from 'react-router-dom'
import { Clock, X } from 'lucide-react'

interface Props {
  onClose: () => void
}

export default function TrialExpiredModal({ onClose }: Props) {
  return (
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
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
            className="text-[#9CA3AF] hover:text-[#1A1D23] transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <h3 className="text-lg font-bold text-[#1A1D23] mb-2">
          Your free trial has ended
        </h3>
        <p className="text-sm text-[#4B5563] mb-1">
          You had full Pro access for 14 days — we hope it was useful for your classroom.
        </p>
        <p className="text-sm text-[#4B5563] mb-6">
          Upgrade to Pro to keep unlimited books, unlimited students, and PDF annotation export.
        </p>

        <Link
          to="/pricing"
          className="block w-full text-center bg-[#4A90D9] text-white font-bold py-3 rounded-xl hover:bg-[#357ABD] transition-colors"
        >
          Upgrade to Pro — $8/month
        </Link>
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
