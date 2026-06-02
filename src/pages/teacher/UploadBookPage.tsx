import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import AppShell from '@/components/layout/AppShell'
import { uploadBook, getBooksByTeacher } from '@/firebase/books'
import { isPro } from '@/types'
import { Lock, Upload, FileText, CheckCircle } from 'lucide-react'
import TrialExpiredModal from '@/components/shared/TrialExpiredModal'

const FREE_BOOK_LIMIT = 5

export default function UploadBookPage() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const fileRef = useRef<HTMLInputElement>(null)

  const [file, setFile] = useState<File | null>(null)
  const [title, setTitle] = useState('')
  const [author, setAuthor] = useState('')
  const [readingLevel, setReadingLevel] = useState('')
  const [assignmentPrompt, setAssignmentPrompt] = useState('')
  const [successCriteria, setSuccessCriteria] = useState('')
  const [progress, setProgress] = useState(0)
  const [uploading, setUploading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const [bookCount, setBookCount] = useState<number | null>(null)

  useEffect(() => {
    if (!profile) return
    getBooksByTeacher(profile.uid).then((books) => setBookCount(books.length)).catch(() => setBookCount(0))
  }, [profile])

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    if (f.type !== 'application/pdf') {
      setError('Please select a PDF file.')
      return
    }
    if (f.size > 50 * 1024 * 1024) {
      setError('File is too large. Maximum size is 50 MB.')
      return
    }
    setError('')
    setFile(f)
    if (!title) setTitle(f.name.replace(/\.pdf$/i, ''))
    if (!author) setAuthor('Unknown author')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!file || !profile) {
      setError('Please sign in and choose a PDF before uploading.')
      return
    }
    setError('')
    setUploading(true)
    try {
      await uploadBook(
        file,
        title || file.name.replace(/\.pdf$/i, ''),
        author || 'Unknown author',
        readingLevel,
        assignmentPrompt,
        successCriteria,
        profile.uid,
        setProgress,
      )
      setDone(true)
      setTimeout(() => navigate('/teacher'), 1500)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Upload failed. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  const trialExpired = profile?.role === 'teacher'
    && profile?.trialEndsAt != null
    && profile.trialEndsAt <= new Date()
    && !isPro(profile)

  const atLimit = bookCount !== null && bookCount >= FREE_BOOK_LIMIT && !isPro(profile)

  if (atLimit) {
    if (trialExpired) {
      return (
        <AppShell title="Upload Book">
          <TrialExpiredModal onClose={() => navigate('/teacher')} />
        </AppShell>
      )
    }
    return (
      <AppShell title="Upload Book">
        <div className="max-w-lg mx-auto text-center py-16">
          <div className="w-16 h-16 bg-[#F5C842]/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Lock size={32} className="text-[#E6A817]" />
          </div>
          <h2 className="text-2xl font-bold text-[#1A1D23] mb-2">Book limit reached</h2>
          <p className="text-[#4B5563] mb-1">
            Your free plan includes up to {FREE_BOOK_LIMIT} books.
          </p>
          <p className="text-[#4B5563] mb-8">
            Upgrade to Pro for unlimited books, unlimited students, and PDF annotation export.
          </p>
          <Link
            to="/pricing"
            className="inline-block bg-[#4A90D9] text-white font-bold px-8 py-3 rounded-xl hover:bg-[#357ABD] transition-colors"
          >
            Upgrade to Pro
          </Link>
          <p className="mt-4 text-sm text-[#9CA3AF]">
            <Link to="/teacher" className="hover:text-[#4A90D9]">Back to dashboard</Link>
          </p>
        </div>
      </AppShell>
    )
  }

  if (done) {
    return (
      <AppShell title="Upload Book">
        <div className="flex flex-col items-center justify-center py-20">
          <CheckCircle size={56} className="text-[#5BB974] mb-4" />
          <h2 className="text-2xl font-bold text-[#1A1D23]">Book uploaded!</h2>
          <p className="text-[#4B5563] mt-2">Redirecting you back to the dashboard…</p>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell title="Upload Book">
      <div className="max-w-lg mx-auto">
        <h2 className="text-2xl font-bold text-[#1A1D23] mb-1">Upload a Book</h2>
        <p className="text-[#4B5563] mb-6">Add a PDF to your library and assign it to students.</p>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-[#F3F4F6] p-6 space-y-5">
          {/* PDF drop zone */}
          <div>
            <label className="block text-sm font-semibold text-[#1A1D23] mb-2">PDF File *</label>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className={`w-full border-2 border-dashed rounded-xl p-6 text-center transition-colors ${
                file ? 'border-[#5BB974] bg-green-50' : 'border-[#D1D5DB] hover:border-[#4A90D9] hover:bg-blue-50'
              }`}
            >
              {file ? (
                <div className="flex items-center justify-center gap-2 text-[#5BB974]">
                  <FileText size={24} />
                  <span className="font-semibold text-sm">{file.name}</span>
                </div>
              ) : (
                <>
                  <Upload size={28} className="mx-auto text-[#9CA3AF] mb-2" />
                  <p className="text-sm text-[#4B5563]">Click to select a PDF</p>
                  <p className="text-xs text-[#9CA3AF] mt-1">PDF files only · max 50 MB</p>
                </>
              )}
            </button>
            <input ref={fileRef} type="file" accept=".pdf,application/pdf" onChange={handleFileChange} className="hidden" />
          </div>

          <Field label="Book Title *" value={title} onChange={setTitle} placeholder="e.g. Charlotte's Web" required />
          <Field label="Author" value={author} onChange={setAuthor} placeholder="e.g. E.B. White" />
          <Field label="Reading Level / Grade Tag" value={readingLevel} onChange={setReadingLevel} placeholder="e.g. Grade 3, Lexile 680" />
          <TextAreaField
            label="Reading Assignment"
            value={assignmentPrompt}
            onChange={setAssignmentPrompt}
            placeholder="e.g. Highlight two confusing moments, one important quote, and one passage you love."
          />
          <TextAreaField
            label="Success Criteria"
            value={successCriteria}
            onChange={setSuccessCriteria}
            placeholder="e.g. Save at least 4 annotations and finish with a short reflection."
          />

          {uploading && (
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-[#4B5563]">Uploading…</span>
                <span className="font-semibold text-[#4A90D9]">{progress}%</span>
              </div>
              <div className="w-full bg-[#E5E7EB] rounded-full h-2.5">
                <div className="bg-[#4A90D9] h-2.5 rounded-full transition-all" style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm" role="alert">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={!file || uploading}
            className="w-full bg-[#4A90D9] hover:bg-[#357ABD] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl text-base transition-colors"
          >
            {uploading ? 'Uploading…' : 'Upload Book'}
          </button>
        </form>
      </div>
    </AppShell>
  )
}

function TextAreaField({
  label, value, onChange, placeholder,
}: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string
}) {
  return (
    <div>
      <label className="block text-sm font-semibold text-[#1A1D23] mb-1">{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={3}
        maxLength={500}
        className="w-full border border-[#D1D5DB] rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-[#4A90D9] resize-none"
      />
    </div>
  )
}

function Field({
  label, value, onChange, placeholder, required,
}: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; required?: boolean
}) {
  return (
    <div>
      <label className="block text-sm font-semibold text-[#1A1D23] mb-1">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="w-full border border-[#D1D5DB] rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-[#4A90D9]"
      />
    </div>
  )
}
