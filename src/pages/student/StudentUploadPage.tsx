import { useState, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '@/context/auth-context'
import AppShell from '@/components/layout/AppShell'
import { uploadStudentBook } from '@/firebase/books'
import { Upload, FileText, CheckCircle } from 'lucide-react'

export default function StudentUploadPage() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const fileRef = useRef<HTMLInputElement>(null)

  const [file, setFile] = useState<File | null>(null)
  const [fileFormat, setFileFormat] = useState<'pdf' | 'docx'>('pdf')
  const [title, setTitle] = useState('')
  const [author, setAuthor] = useState('')
  const [readingLevel, setReadingLevel] = useState('')
  const [progress, setProgress] = useState(0)
  const [uploading, setUploading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    const isPdf = f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')
    const isDocx = f.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || f.name.toLowerCase().endsWith('.docx')
    if (!isPdf && !isDocx) { setError('Please select a PDF or Word (.docx) file.'); return }
    if (f.size > 50 * 1024 * 1024) { setError('File is too large. Maximum size is 50 MB.'); return }
    setError('')
    setFile(f)
    setFileFormat(isDocx ? 'docx' : 'pdf')
    if (!title) setTitle(f.name.replace(/\.(pdf|docx)$/i, ''))
    if (!author) setAuthor('Unknown author')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!file || !profile) { setError('Please sign in and choose a file before uploading.'); return }
    setError('')
    setUploading(true)
    try {
      await uploadStudentBook(file, title || file.name.replace(/\.(pdf|docx)$/i, ''), author || 'Unknown author', readingLevel, profile.uid, setProgress, fileFormat)
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
        <p className="text-[#4B5563] mb-6">Upload a PDF or Word document to your personal reading shelf.</p>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-[#F3F4F6] p-6 space-y-5">
          <div>
            <label className="block text-sm font-semibold text-[#1A1D23] mb-2">Book File *</label>
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
                  <p className="text-sm text-[#4B5563]">Click to select a PDF or Word document</p>
                  <p className="text-xs text-[#9CA3AF] mt-1">PDF or .docx · max 50 MB</p>
                </>
              )}
            </button>
            <input ref={fileRef} type="file" accept=".pdf,application/pdf,.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={handleFileChange} className="hidden" />
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

          <button type="submit" disabled={!file || uploading} className="w-full bg-[#4A90D9] hover:bg-[#357ABD] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl text-base transition-colors">
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
