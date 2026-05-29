import { Link } from 'react-router-dom'
import { Lock, X } from 'lucide-react'

interface Props {
  title: string
  description: string
  onClose: () => void
}

export default function UpgradeModal({ title, description, onClose }: Props) {
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
          <div className="bg-[#F5C842]/20 p-2 rounded-xl">
            <Lock size={22} className="text-[#E6A817]" />
          </div>
          <button onClick={onClose} aria-label="Close" className="text-[#9CA3AF] hover:text-[#1A1D23] transition-colors">
            <X size={20} />
          </button>
        </div>
        <h3 className="text-lg font-bold text-[#1A1D23] mb-2">{title}</h3>
        <p className="text-sm text-[#4B5563] mb-6">{description}</p>
        <Link
          to="/pricing"
          className="block w-full text-center bg-[#4A90D9] text-white font-bold py-3 rounded-xl hover:bg-[#357ABD] transition-colors"
        >
          See Pro plan
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
