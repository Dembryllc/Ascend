import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/auth-context'
import AppShell from '@/components/layout/AppShell'
import { uploadBook, getBooksByTeacher, assignBookToClass } from '@/firebase/books'
import { getClassroomByTeacher } from '@/firebase/classrooms'
import { isPro } from '@/types'
import { ArrowRight, Lock, Upload, FileText, CheckCircle } from 'lucide-react'
import TrialExpiredModal from '@/components/shared/TrialExpiredModal'
import { ORGANIZER_TEMPLATES, TEMPLATE_ORDER } from '@/data/organizerTemplates'

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
  const [organizerEnabled, setOrganizerEnabled] = useState(false)
  const [organizerTemplateId, setOrganizerTemplateId] = useState(TEMPLATE_ORDER[0])
  const [organizerScaffoldDefault, setOrganizerScaffoldDefault] = useState<'guided' | 'independent'>('guided')
  const [organizerStudentCanSwitch, setOrganizerStudentCanSwitch] = useState(true)
  const [organizerPrompt, setOrganizerPrompt] = useState('')
  const [progress, setProgress] = useState(0)
  const [uploading, setUploading] = useState(false)
  const [done, setDone] = useState<{
    assignedCount: number
    assignAttempted: boolean
    assignFailed: boolean
  } | null>(null)
  const [error, setError] = useState('')
  const [bookCount, setBookCount] = useState<number | null>(null)
  const [classStudentIds, setClassStudentIds] = useState<string[]>([])
  const [assignAfterUpload, setAssignAfterUpload] = useState(true)

  useEffect(() => {
    if (!profile) return
    Promise.all([
      getBooksByTeacher(profile.uid),
      getClassroomByTeacher(profile.uid),
    ]).then(([books, classroom]) => {
      setBookCount(books.length)
      setClassStudentIds(classroom?.studentIds ?? [])
    }).catch(() => {
      setBookCount(0)
      setClassStudentIds([])
    })
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
      const uploadedBook = await uploadBook(
        file,
        title || file.name.replace(/\.pdf$/i, ''),
        author || 'Unknown author',
        readingLevel,
        assignmentPrompt,
        successCriteria,
        profile.uid,
        setProgress,
        organizerEnabled ? organizerTemplateId : undefined,
        organizerEnabled ? organizerScaffoldDefault : undefined,
        organizerEnabled ? organizerStudentCanSwitch : undefined,
        organizerEnabled ? organizerPrompt : undefined,
      )
      if (assignAfterUpload && classStudentIds.length > 0) {
        try {
          await assignBookToClass(uploadedBook.id, classStudentIds)
          setDone({ assignedCount: classStudentIds.length, assignAttempted: true, assignFailed: false })
        } catch {
          setDone({ assignedCount: 0, assignAttempted: true, assignFailed: true })
        }
      } else {
        setDone({ assignedCount: 0, assignAttempted: false, assignFailed: false })
      }
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
        <div className="flex flex-col items-center justify-center py-16 text-center max-w-md mx-auto">
          <CheckCircle size={56} className="text-[#5BB974] mb-4" />
          <h2 className="text-2xl font-bold text-[#1A1D23] mb-2">
            {done.assignedCount > 0 ? 'Book uploaded and assigned!' : 'Book uploaded!'}
          </h2>
          {done.assignedCount > 0 ? (
            <p className="text-[#4B5563] mb-8">
              Your PDF is ready and visible to {done.assignedCount} student{done.assignedCount === 1 ? '' : 's'}.
            </p>
          ) : done.assignFailed ? (
            <>
              <p className="text-[#4B5563] mb-2">
                Your PDF uploaded, but we could not assign it to your class automatically.
              </p>
              <p className="text-sm text-[#9CA3AF] mb-8">
                Assign it from your classroom when your connection is stable.
              </p>
            </>
          ) : (
            <>
              <p className="text-[#4B5563] mb-2">
                Your PDF is ready. Now assign it to your students so they can start reading.
              </p>
              <p className="text-sm text-[#9CA3AF] mb-8">
                Students won't see this book until you assign it from your classroom.
              </p>
            </>
          )}
          <div className="flex flex-col sm:flex-row gap-3 w-full">
            <Link
              to="/teacher/classroom"
              className="flex-1 flex items-center justify-center gap-2 bg-[#4A90D9] hover:bg-[#357ABD] text-white font-bold py-3 rounded-xl transition-colors"
            >
              {done.assignedCount > 0 ? 'View Classroom' : 'Assign to My Class'} <ArrowRight size={18} />
            </Link>
            <Link
              to="/teacher"
              className="flex-1 flex items-center justify-center gap-2 border border-[#D1D5DB] text-[#4B5563] font-semibold py-3 rounded-xl hover:bg-[#F3F4F6] transition-colors"
            >
              Back to Dashboard
            </Link>
          </div>
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

          <div className="border border-[#E5E7EB] rounded-xl p-4">
            {classStudentIds.length > 0 ? (
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={assignAfterUpload}
                  onChange={(e) => setAssignAfterUpload(e.target.checked)}
                  className="w-4 h-4 mt-0.5 accent-[#4A90D9]"
                />
                <span>
                  <span className="block text-sm font-semibold text-[#1A1D23]">Assign to whole class after upload</span>
                  <span className="block text-xs text-[#6B7280] mt-0.5">
                    {classStudentIds.length} student{classStudentIds.length === 1 ? '' : 's'} will see this PDF immediately.
                  </span>
                </span>
              </label>
            ) : (
              <div>
                <p className="text-sm font-semibold text-[#1A1D23]">Assignment happens after upload</p>
                <p className="text-xs text-[#6B7280] mt-0.5">
                  Students will see this PDF after they join your classroom and you assign it.
                </p>
              </div>
            )}
          </div>

          {/* Writing Task assignment */}
          <div className={`border rounded-xl p-4 transition-colors ${organizerEnabled ? 'border-[#5BB974] bg-green-50/40' : 'border-[#E5E7EB]'}`}>
            <label className={`flex items-center gap-3 ${isPro(profile) ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'}`}>
              <input
                type="checkbox"
                checked={organizerEnabled}
                disabled={!isPro(profile)}
                onChange={(e) => setOrganizerEnabled(e.target.checked)}
                className="w-4 h-4 accent-[#5BB974] disabled:cursor-not-allowed"
              />
              <span className="text-sm font-semibold text-[#1A1D23]">
                Assign a Writing Task
                {!isPro(profile) && (
                  <span className="ml-2 text-xs font-bold text-[#E6A817] bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">Pro</span>
                )}
              </span>
            </label>
            <p className="text-xs text-[#6B7280] mt-2">
              Choose the writing type and support level students see on their home screen and inside the book.
            </p>

            {organizerEnabled && (
              <div className="mt-4 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-[#1A1D23] mb-1">Writing task type</label>
                  <select
                    value={organizerTemplateId}
                    onChange={(e) => setOrganizerTemplateId(e.target.value)}
                    className="w-full border border-[#D1D5DB] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#5BB974]"
                  >
                    {TEMPLATE_ORDER.map((id) => (
                      <option key={id} value={id}>
                        {ORGANIZER_TEMPLATES[id].name} · {ORGANIZER_TEMPLATES[id].gradeRange}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-[#6B7280] mt-1">{ORGANIZER_TEMPLATES[organizerTemplateId]?.description}</p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-[#1A1D23] mb-1">Teacher prompt students will see</label>
                  <textarea
                    value={organizerPrompt}
                    onChange={(e) => setOrganizerPrompt(e.target.value.slice(0, 500))}
                    rows={4}
                    maxLength={500}
                    placeholder="Example: After reading, explain how the character changed. Use two details from the text."
                    className="w-full border border-[#D1D5DB] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#5BB974] resize-none"
                  />
                  <div className="flex justify-between gap-3 mt-1">
                    <p className="text-xs text-[#6B7280]">
                      This prompt appears on the student home screen, inside the book, and at the top of the writing task.
                    </p>
                    <span className="text-xs text-[#9CA3AF] shrink-0">{organizerPrompt.length}/500</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-[#1A1D23] mb-2">Support level</label>
                  <div className="flex rounded-xl overflow-hidden border border-[#D1D5DB]">
                    {(['guided', 'independent'] as const).map((level) => (
                      <button
                        key={level}
                        type="button"
                        onClick={() => setOrganizerScaffoldDefault(level)}
                        className={`flex-1 py-2.5 text-sm font-semibold capitalize transition-colors ${organizerScaffoldDefault === level ? 'bg-[#5BB974] text-white' : 'bg-white text-[#4B5563] hover:bg-[#F3F4F6]'}`}
                      >
                        {level === 'guided' ? 'Guided' : 'Independent'}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-[#6B7280] mt-1">
                    {organizerScaffoldDefault === 'guided'
                      ? 'Guided: students see sentence starters and guiding questions in each field.'
                      : 'Independent: students see field labels only — no sentence starters.'}
                  </p>
                </div>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={organizerStudentCanSwitch}
                    onChange={(e) => setOrganizerStudentCanSwitch(e.target.checked)}
                    className="w-4 h-4 accent-[#5BB974]"
                  />
                  <span className="text-sm text-[#4B5563]">Allow students to switch scaffold level</span>
                </label>
              </div>
            )}
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
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm" role="alert">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={!file || uploading}
            className="w-full bg-[#4A90D9] hover:bg-[#357ABD] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl text-base transition-colors"
          >
            {uploading ? 'Uploading…' : assignAfterUpload && classStudentIds.length > 0 ? 'Upload and Assign' : 'Upload Book'}
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
