import { useState, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '@/context/auth-context'
import AppShell from '@/components/layout/AppShell'
import { uploadStudentBook } from '@/firebase/books'
import { Upload, FileText, CheckCircle, Image as ImageIcon } from 'lucide-react'
import { convertImagesToPdf, isImageFile } from '@/utils/imagesToPdf'

export default function StudentUploadPage() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const fileRef = useRef<HTMLInputElement>(null)

  const [file, setFile] = useState<File | null>(null)
  const [photoNames, setPhotoNames] = useState<string[]>([])
  const [converting, setConverting] = useState(false)
  const [title, setTitle] = useState('')
  const [author, setAuthor] = useState('')
  const [readingLevel, setReadingLevel] = useState('')
  const [progress, setProgress] = useState(0)
  const [uploading, setUploading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files ?? [])
    e.target.value = ''
    if (selected.length === 0) return
    setError('')

    if (selected.length === 1 && (selected[0].type === 'application/pdf' || selected[0].name.match(/\.pdf$/i))) {
      const f = selected[0]
      if (f.size > 50 * 1024 * 1024) { setError('File is too large. Maximum size is 50 MB.'); return }
      setFile(f)
      setPhotoNames([])
      if (!title) setTitle(f.name.replace(/\.pdf$/i, ''))
      if (!author) setAuthor('Unknown author')
      return
    }

    if (!selected.every(isImageFile)) {
      setError('Please select a single PDF, or one or more photos (JPG or PNG) of book pages.')
      return
    }

    const sorted = [...selected].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))
    setConverting(true)
    try {
      const converted = await convertImagesToPdf(sorted, 'scanned-book.pdf')
      if (converted.size > 50 * 1024 * 1024) {
        setError('Those photos are too large even after compression. Try uploading fewer pages at once.')
        return
      }
      setFile(converted)
      setPhotoNames(sorted.map((f) => f.name))
      if (!title) setTitle('Scanned Book')
      if (!author) setAuthor('Unknown author')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not convert those photos into a PDF.')
    } finally {
      setConverting(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!file || !profile) { setError('Please sign in and choose a PDF before uploading.'); return }
    setError('')
    setUploading(true)
    try {
      await uploadStudentBook(file, title || file.name.replace(/\.pdf$/i, ''), author || 'Unknown author', readingLevel, profile.uid, setProgress)
      setDone(true)
      setTimeout(() => navigate('/student'), 1500)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Upload failed. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  if (done) return (
    <AppShell title="Add a Book">
      <div className="flex flex-col items-center justify-center py-20">
        <CheckCircle size={56} className="text-[#5BB974] mb-4" />
        <h2 className="text-2xl font-bold text-[#1A1D23]">Book added!</h2>
        <p className="text-[#4B5563] mt-2">Redirecting to your bookshelf…</p>
      </div>
    </AppShell>
  )

  return (
    <AppShell title="Add a Book">
      <div className="max-w-lg mx-auto">
        <h2 className="text-2xl font-bold text-[#1A1D23] mb-1">Add a Book</h2>
        <p className="text-[#4B5563] mb-6">Upload a PDF, or photos of book pages, to your personal reading shelf.</p>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-[#F3F4F6] p-6 space-y-5">
          <div>
            <label className="block text-sm font-semibold text-[#1A1D23] mb-2">PDF or Photos *</label>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={converting}
              className={`w-full border-2 border-dashed rounded-xl p-6 text-center transition-colors disabled:cursor-wait ${
                file ? 'border-[#5BB974] bg-green-50' : 'border-[#D1D5DB] hover:border-[#4A90D9] hover:bg-blue-50'
              }`}
            >
              {converting ? (
                <p className="text-sm text-[#4B5563]">Converting photos to a PDF…</p>
              ) : file ? (
                <div className="flex items-center justify-center gap-2 text-[#5BB974]">
                  {photoNames.length > 0 ? <ImageIcon size={24} /> : <FileText size={24} />}
                  <span className="font-semibold text-sm">
                    {photoNames.length > 0 ? `${photoNames.length} photo${photoNames.length === 1 ? '' : 's'} → ${file.name}` : file.name}
                  </span>
                </div>
              ) : (
                <>
                  <Upload size={28} className="mx-auto text-[#9CA3AF] mb-2" />
                  <p className="text-sm text-[#4B5563]">Click to select a PDF, or one or more photos of book pages</p>
                  <p className="text-xs text-[#9CA3AF] mt-1">PDF, JPG or PNG · max 50 MB · select multiple photos for a multi-page book</p>
                </>
              )}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,application/pdf,.jpg,.jpeg,.png,.heic,.heif,image/jpeg,image/png,image/heic,image/heif"
              multiple
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          <div>
            <label htmlFor="title" className="block text-sm font-semibold text-[#1A1D23] mb-1">Book Title *</label>
            <input id="title" type="text" value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="e.g. The Outsiders" className="w-full border border-[#D1D5DB] rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-[#4A90D9]" />
          </div>

          <div>
            <label htmlFor="author" className="block text-sm font-semibold text-[#1A1D23] mb-1">Author</label>
            <input id="author" type="text" value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="e.g. S.E. Hinton" className="w-full border border-[#D1D5DB] rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-[#4A90D9]" />
          </div>

          <div>
            <label htmlFor="level" className="block text-sm font-semibold text-[#1A1D23] mb-1">Reading Level <span className="font-normal text-[#9CA3AF]">(optional)</span></label>
            <input id="level" type="text" value={readingLevel} onChange={(e) => setReadingLevel(e.target.value)} placeholder="e.g. Grade 8, Lexile 750" className="w-full border border-[#D1D5DB] rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-[#4A90D9]" />
          </div>

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
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm" role="alert">{error}</div>
          )}

          <button type="submit" disabled={!file || uploading || converting} className="w-full bg-[#4A90D9] hover:bg-[#357ABD] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl text-base transition-colors">
            {uploading ? 'Uploading…' : 'Add to My Shelf'}
          </button>

          <p className="text-center text-sm text-[#9CA3AF]">
            <Link to="/student" className="hover:text-[#4A90D9]">Cancel</Link>
          </p>
        </form>
      </div>
    </AppShell>
  )
}
