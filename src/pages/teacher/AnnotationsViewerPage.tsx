import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '@/context/auth-context'
import AppShell from '@/components/layout/AppShell'
import { getClassroomByTeacher } from '@/firebase/classrooms'
import { getBooksByTeacher } from '@/firebase/books'
import { getAnnotationsByStudentAndBook } from '@/firebase/annotations'
import { getReadingProgress } from '@/firebase/readingProgress'
import { getOrganizerResponse } from '@/firebase/organizers'
import { getUserProfile } from '@/firebase/auth'
import type { Annotation, Book, OrganizerResponse, ReadingProgress, UserProfile } from '@/types'
import { isPro, REACTIONS } from '@/types'
import { exportAnnotationsPDF } from '@/utils/exportPDF'
import { exportOrganizerPDF } from '@/utils/exportOrganizerPDF'
import { buildAnnotationSummary } from '@/utils/teacherSummary'
import { ORGANIZER_TEMPLATES } from '@/data/organizerTemplates'
import { BarChart3, FileDown, FileText, Lightbulb, Lock, LayoutGrid } from 'lucide-react'
import UpgradeModal from '@/components/shared/UpgradeModal'
import TrialExpiredModal from '@/components/shared/TrialExpiredModal'

type OrganizerDocxExporter = typeof import('@/utils/exportOrganizerDocx')['exportOrganizerDocx']

export default function AnnotationsViewerPage() {
  const { profile } = useAuth()
  const [searchParams] = useSearchParams()
  const [students, setStudents] = useState<UserProfile[]>([])
  const [books, setBooks] = useState<Book[]>([])
  const [selectedStudent, setSelectedStudent] = useState(searchParams.get('student') ?? '')
  const [selectedBook, setSelectedBook] = useState('')
  const [activeTab, setActiveTab] = useState<'annotations' | 'organizer'>('annotations')
  const [annotations, setAnnotations] = useState<Annotation[]>([])
  const [readingProgress, setReadingProgress] = useState<ReadingProgress | null>(null)
  const [organizerResponse, setOrganizerResponse] = useState<OrganizerResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [fetching, setFetching] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [fetchError, setFetchError] = useState('')
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [docxExporter, setDocxExporter] = useState<OrganizerDocxExporter | null>(null)

  useEffect(() => {
    if (!profile) return
    Promise.all([
      getClassroomByTeacher(profile.uid),
      getBooksByTeacher(profile.uid),
    ]).then(async ([classroom, bks]) => {
      setBooks(bks)
      if (classroom) {
        const profs = await Promise.all(classroom.studentIds.map((id) => getUserProfile(id)))
        setStudents(profs.filter(Boolean) as UserProfile[])
      }
      setLoading(false)
    }).catch((err: unknown) => {
      console.error('Failed to load teacher annotation setup:', err)
      setLoadError('Could not load your classroom or books. Refresh the page and try again.')
      setLoading(false)
    })
  }, [profile])

  async function fetchAnnotations() {
    if (!selectedStudent || !selectedBook) return
    setFetching(true)
    setFetchError('')
    setAnnotations([])
    setReadingProgress(null)
    setOrganizerResponse(null)
    try {
      const [ann, progress, organizer] = await Promise.all([
        getAnnotationsByStudentAndBook(selectedStudent, selectedBook),
        getReadingProgress(selectedStudent, selectedBook),
        getOrganizerResponse(selectedStudent, selectedBook),
      ])
      setAnnotations(ann)
      setReadingProgress(progress)
      setOrganizerResponse(organizer)
    } catch (err: unknown) {
      console.error('Failed to load annotations:', err)
      setFetchError('Could not load annotations. Check your connection and try again.')
    } finally {
      setFetching(false)
    }
  }

  useEffect(() => {
    if (selectedStudent && selectedBook) {
      const id = window.setTimeout(() => {
        void fetchAnnotations()
      }, 0)
      return () => window.clearTimeout(id)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStudent, selectedBook])

  const selectedStudentProfile = students.find((s) => s.uid === selectedStudent)
  const selectedBookData = books.find((b) => b.id === selectedBook)
  const summary = buildAnnotationSummary(annotations)

  const trialExpired = profile?.role === 'teacher'
    && profile?.trialEndsAt != null
    && profile.trialEndsAt <= new Date()
    && !isPro(profile)

  function handleExport() {
    if (!selectedStudentProfile || !selectedBookData) return
    exportAnnotationsPDF(selectedStudentProfile.displayName, selectedBookData.title, annotations)
  }

  async function handleOrganizerDocExport() {
    if (!organizerResponse || !selectedStudentProfile || !selectedBookData || !docxExporter) return
    await docxExporter(
      selectedStudentProfile.displayName,
      selectedBookData.title,
      organizerResponse,
      selectedBookData.organizerPrompt,
    )
  }

  useEffect(() => {
    if (!organizerResponse || !isPro(profile)) return
    let mounted = true
    import('@/utils/exportOrganizerDocx')
      .then((mod) => {
        if (mounted) setDocxExporter(() => mod.exportOrganizerDocx)
      })
      .catch(() => {
        if (mounted) setDocxExporter(null)
      })
    return () => { mounted = false }
  }, [organizerResponse, profile])

  if (loading) return (
    <AppShell title="Annotations">
      <div className="h-8 w-56 bg-[#E5E7EB] rounded-xl animate-pulse mb-6" />
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#F3F4F6] mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <div className="h-4 w-16 bg-[#E5E7EB] rounded animate-pulse mb-1" />
            <div className="h-11 bg-[#E5E7EB] rounded-xl animate-pulse" />
          </div>
          <div>
            <div className="h-4 w-12 bg-[#E5E7EB] rounded animate-pulse mb-1" />
            <div className="h-11 bg-[#E5E7EB] rounded-xl animate-pulse" />
          </div>
        </div>
        <div className="h-10 w-36 bg-[#E5E7EB] rounded-xl animate-pulse" />
      </div>
    </AppShell>
  )

  return (
    <AppShell title="View Annotations">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-[#1A1D23]">Student Annotations</h2>
        <p className="text-xs text-[#9CA3AF] mt-1">Student data is protected under FERPA and used solely for educational purposes.</p>
      </div>

      {loadError && (
        <div className="bg-red-50 border border-red-100 text-red-700 rounded-xl px-4 py-3 mb-6 text-sm font-semibold">
          {loadError}
        </div>
      )}

      {/* Selector */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#F3F4F6] mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label htmlFor="select-student" className="block text-sm font-semibold text-[#1A1D23] mb-1">Student</label>
            <select
              id="select-student"
              value={selectedStudent}
              onChange={(e) => {
                setSelectedStudent(e.target.value)
                setAnnotations([])
                setReadingProgress(null)
                setOrganizerResponse(null)
                setFetchError('')
              }}
              className="w-full border border-[#D1D5DB] rounded-xl px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-[#4A90D9]"
            >
              <option value="">Select a student…</option>
              {students.map((s) => <option key={s.uid} value={s.uid}>{s.displayName}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="select-book" className="block text-sm font-semibold text-[#1A1D23] mb-1">Book</label>
            <select
              id="select-book"
              value={selectedBook}
              onChange={(e) => {
                setSelectedBook(e.target.value)
                setAnnotations([])
                setReadingProgress(null)
                setOrganizerResponse(null)
                setFetchError('')
              }}
              className="w-full border border-[#D1D5DB] rounded-xl px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-[#4A90D9]"
            >
              <option value="">Select a book…</option>
              {books.map((b) => <option key={b.id} value={b.id}>{b.title}</option>)}
            </select>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={fetchAnnotations}
            disabled={!selectedStudent || !selectedBook || fetching}
            className="bg-[#4A90D9] text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-[#357ABD] disabled:opacity-50 transition-colors"
          >
            {fetching ? 'Loading…' : 'Refresh'}
          </button>
          {annotations.length > 0 && (
            isPro(profile) ? (
              <button
                onClick={handleExport}
                className="flex items-center gap-2 bg-[#5BB974] text-white px-4 py-2.5 rounded-xl font-semibold hover:bg-[#4AA863] transition-colors"
              >
                <FileDown size={18} />
                Export Annotations PDF
              </button>
            ) : (
              <button
                onClick={() => setShowUpgradeModal(true)}
                className="flex items-center gap-2 bg-[#9CA3AF] text-white px-4 py-2.5 rounded-xl font-semibold hover:bg-[#6B7280] transition-colors"
                title="Upgrade to Pro to export PDFs"
              >
                <Lock size={18} />
                Export PDF
              </button>
            )
          )}
          {organizerResponse && isPro(profile) && selectedStudentProfile && selectedBookData && (
            <>
              <button
                onClick={handleOrganizerDocExport}
                disabled={!docxExporter}
                className="flex items-center gap-2 bg-[#5BB974] text-white px-4 py-2.5 rounded-xl font-semibold hover:bg-[#4AA863] transition-colors"
              >
                <FileText size={18} />
                {docxExporter ? 'Export Writing Doc' : 'Preparing Doc…'}
              </button>
              <button
                onClick={() => exportOrganizerPDF(
                  selectedStudentProfile.displayName,
                  selectedBookData.title,
                  organizerResponse!,
                  selectedBookData.organizerPrompt,
                )}
                className="flex items-center gap-2 bg-[#5BB974] text-white px-4 py-2.5 rounded-xl font-semibold hover:bg-[#4AA863] transition-colors"
              >
                <LayoutGrid size={18} />
                Export Organizer PDF
              </button>
            </>
          )}
        </div>
      </div>

      {/* Tab switcher */}
      {(annotations.length > 0 || organizerResponse) && (
        <div className="flex rounded-xl overflow-hidden border border-[#E5E7EB] mb-4 w-fit">
          <button
            onClick={() => setActiveTab('annotations')}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold transition-colors ${activeTab === 'annotations' ? 'bg-[#4A90D9] text-white' : 'bg-white text-[#4B5563] hover:bg-[#F3F4F6]'}`}
          >
            <BarChart3 size={16} /> Annotations
          </button>
          <button
            onClick={() => setActiveTab('organizer')}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold transition-colors ${activeTab === 'organizer' ? 'bg-[#4A90D9] text-white' : 'bg-white text-[#4B5563] hover:bg-[#F3F4F6]'}`}
          >
            <LayoutGrid size={16} /> Organizer
            {organizerResponse && <span className="ml-1 text-xs bg-[#5BB974] text-white px-1.5 py-0.5 rounded-full font-bold">✓</span>}
          </button>
        </div>
      )}

      {/* Organizer view */}
      {activeTab === 'organizer' && (
        organizerResponse ? (
          <OrganizerView response={organizerResponse} />
        ) : selectedStudent && selectedBook && !fetching ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-[#F3F4F6]">
            <p className="text-[#4B5563]">No graphic organizer submitted for this student and book.</p>
          </div>
        ) : null
      )}

      {/* Annotations list */}
      {activeTab === 'annotations' && (annotations.length > 0 || readingProgress) ? (
        <div className="space-y-4">
          {readingProgress && (
            <section className="bg-white rounded-2xl p-5 shadow-sm border border-[#F3F4F6]">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 size={20} className="text-[#5BB974]" />
                <h3 className="font-bold text-lg text-[#1A1D23]">Reading Progress</h3>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <SummaryStat label="Completion" value={`${readingProgress.completionPercent}%`} isText />
                <SummaryStat label="Last page" value={readingProgress.lastReadPage} />
                <SummaryStat label="Highest page" value={readingProgress.highestPageRead} />
                <SummaryStat label="Minutes read" value={Math.round(readingProgress.totalSecondsRead / 60)} />
              </div>
            </section>
          )}

          {annotations.length > 0 && (
          <section className="bg-white rounded-2xl p-5 shadow-sm border border-[#F3F4F6]">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 size={20} className="text-[#4A90D9]" />
              <h3 className="font-bold text-lg text-[#1A1D23]">Pattern Summary</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <SummaryStat label="Annotations" value={summary.total} />
              <SummaryStat label="Quoted passages" value={summary.quoteCount} />
              <SummaryStat label="Questions" value={summary.questionCount} />
              <SummaryStat label="Dominant reaction" value={summary.dominantReaction} isText />
            </div>
            {summary.topPages.length > 0 && (
              <p className="text-sm text-[#4B5563] mb-2">
                Most active pages: {summary.topPages.map((p) => `page ${p.pageNumber} (${p.count})`).join(', ')}
              </p>
            )}
            {summary.topKeywords.length > 0 && (
              <p className="text-sm text-[#4B5563] mb-3">Common note words: {summary.topKeywords.join(', ')}</p>
            )}
            <div className="flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
              <Lightbulb size={18} className="text-[#4A90D9] shrink-0 mt-0.5" />
              <p className="text-sm font-semibold text-[#1A1D23]">{summary.suggestedPrompt}</p>
            </div>
          </section>
          )}

          {annotations.map((ann) => {
            const r = REACTIONS[ann.reactionType]
            return (
              <div key={ann.id} className="bg-white rounded-2xl p-5 shadow-sm border border-[#F3F4F6]">
                <div className="flex items-start gap-3">
                  <span className="text-3xl" aria-hidden="true">{r.emoji}</span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between flex-wrap gap-1">
                      <span className="font-bold text-[#1A1D23]">Page {ann.pageNumber} — {r.label}</span>
                      <span className="text-xs text-[#9CA3AF]">
                        {ann.timestamp.toLocaleDateString()} {ann.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    {ann.annotationKind === 'reflection' && (
                      <p className="text-xs font-semibold text-[#5BB974] mt-2">Reflection</p>
                    )}
                    {ann.selectedText && ann.annotationKind !== 'reflection' && (
                      <p className="text-sm text-[#1A1D23] bg-yellow-50 border-l-4 border-yellow-300 rounded-r-lg px-3 py-2 mt-2">
                        “{ann.selectedText}”
                      </p>
                    )}
                    {ann.noteText && (
                      <p className="text-[#4B5563] mt-1.5 text-base">{ann.noteText}</p>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : activeTab === 'annotations' && fetchError ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-red-100">
          <p className="text-red-600 font-semibold mb-1">Could not load annotations</p>
          <p className="text-[#4B5563] text-sm">{fetchError}</p>
        </div>
      ) : activeTab === 'annotations' && selectedStudent && selectedBook && !fetching ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-[#F3F4F6]">
          <p className="text-[#4B5563]">No annotations found for this student and book.</p>
        </div>
      ) : null}

      {showUpgradeModal && (
        trialExpired ? (
          <TrialExpiredModal onClose={() => setShowUpgradeModal(false)} />
        ) : (
          <UpgradeModal
            title="PDF export is a Pro feature"
            description="Upgrade to Pro to download a formatted PDF of any student's annotations — great for parent conferences and progress reports."
            onClose={() => setShowUpgradeModal(false)}
          />
        )
      )}
    </AppShell>
  )
}

function OrganizerView({ response }: { response: OrganizerResponse }) {
  const template = ORGANIZER_TEMPLATES[response.templateId]
  if (!template) return <p className="text-[#4B5563] text-sm">Unknown organizer type.</p>
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#F3F4F6] space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <LayoutGrid size={18} className="text-[#5BB974]" />
          <h3 className="font-bold text-lg text-[#1A1D23]">{template.name}</h3>
          <span className="text-xs text-[#6B7280] bg-[#F3F4F6] px-2 py-0.5 rounded-full">{response.scaffoldLevel}</span>
        </div>
        {response.completed && (
          <span className="text-xs font-bold text-[#5BB974] bg-green-50 border border-green-200 px-2 py-1 rounded-full">✓ Complete</span>
        )}
      </div>
      {template.fields.map((field) => {
        const text = response.fields[field.id]?.trim()
        return (
          <div key={field.id}>
            <p className="text-xs font-bold text-[#6B7280] uppercase tracking-wide mb-1">{field.icon} {field.label}</p>
            <div className="bg-[#F8F9FC] border border-[#E5E7EB] rounded-xl px-4 py-3 text-sm text-[#1A1D23] min-h-[44px]">
              {text || <span className="text-[#9CA3AF] italic">No response</span>}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function SummaryStat({ label, value, isText }: { label: string; value: number | string; isText?: boolean }) {
  return (
    <div className="bg-[#F8F9FC] border border-[#EEF0F4] rounded-xl p-3">
      <div className={`font-bold text-[#1A1D23] ${isText ? 'text-sm' : 'text-2xl'}`}>{value}</div>
      <div className="text-xs text-[#6B7280] mt-0.5">{label}</div>
    </div>
  )
}
