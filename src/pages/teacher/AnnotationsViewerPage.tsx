import { useEffect, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import AppShell from '@/components/layout/AppShell'
import { getClassroomByTeacher } from '@/firebase/classrooms'
import { getBooksByTeacher } from '@/firebase/books'
import { getAnnotationsByStudentAndBook } from '@/firebase/annotations'
import { getReadingProgress } from '@/firebase/readingProgress'
import { getUserProfile } from '@/firebase/auth'
import type { Annotation, Book, ReadingProgress, UserProfile } from '@/types'
import { REACTIONS } from '@/types'
import { exportAnnotationsPDF } from '@/utils/exportPDF'
import { buildAnnotationSummary } from '@/utils/teacherSummary'
import { BarChart3, FileDown, Lightbulb } from 'lucide-react'

export default function AnnotationsViewerPage() {
  const { profile } = useAuth()
  const [students, setStudents] = useState<UserProfile[]>([])
  const [books, setBooks] = useState<Book[]>([])
  const [selectedStudent, setSelectedStudent] = useState('')
  const [selectedBook, setSelectedBook] = useState('')
  const [annotations, setAnnotations] = useState<Annotation[]>([])
  const [readingProgress, setReadingProgress] = useState<ReadingProgress | null>(null)
  const [loading, setLoading] = useState(true)
  const [fetching, setFetching] = useState(false)
  const [fetchError, setFetchError] = useState('')

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
    }).catch(() => {
      setLoading(false)
    })
  }, [profile])

  async function fetchAnnotations() {
    if (!selectedStudent || !selectedBook) return
    setFetching(true)
    setFetchError('')
    try {
      const [ann, progress] = await Promise.all([
        getAnnotationsByStudentAndBook(selectedStudent, selectedBook),
        getReadingProgress(selectedStudent, selectedBook),
      ])
      setAnnotations(ann)
      setReadingProgress(progress)
    } catch {
      setFetchError('Could not load annotations. Check your connection and try again.')
    } finally {
      setFetching(false)
    }
  }

  const selectedStudentProfile = students.find((s) => s.uid === selectedStudent)
  const selectedBookData = books.find((b) => b.id === selectedBook)
  const summary = buildAnnotationSummary(annotations)

  function handleExport() {
    if (!selectedStudentProfile || !selectedBookData) return
    exportAnnotationsPDF(selectedStudentProfile.displayName, selectedBookData.title, annotations)
  }

  if (loading) return (
    <AppShell title="Annotations">
      <div className="flex justify-center py-16">
        <div className="w-8 h-8 border-4 border-[#4A90D9] border-t-transparent rounded-full animate-spin" />
      </div>
    </AppShell>
  )

  return (
    <AppShell title="View Annotations">
      <h2 className="text-2xl font-bold text-[#1A1D23] mb-6">Student Annotations</h2>

      {/* Selector */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#F3F4F6] mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-semibold text-[#1A1D23] mb-1">Student</label>
            <select
              value={selectedStudent}
              onChange={(e) => {
                setSelectedStudent(e.target.value)
                setAnnotations([])
                setReadingProgress(null)
              }}
              className="w-full border border-[#D1D5DB] rounded-xl px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-[#4A90D9]"
            >
              <option value="">Select a student…</option>
              {students.map((s) => <option key={s.uid} value={s.uid}>{s.displayName}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-[#1A1D23] mb-1">Book</label>
            <select
              value={selectedBook}
              onChange={(e) => {
                setSelectedBook(e.target.value)
                setAnnotations([])
                setReadingProgress(null)
              }}
              className="w-full border border-[#D1D5DB] rounded-xl px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-[#4A90D9]"
            >
              <option value="">Select a book…</option>
              {books.map((b) => <option key={b.id} value={b.id}>{b.title}</option>)}
            </select>
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={fetchAnnotations}
            disabled={!selectedStudent || !selectedBook || fetching}
            className="bg-[#4A90D9] text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-[#357ABD] disabled:opacity-50 transition-colors"
          >
            {fetching ? 'Loading…' : 'View Annotations'}
          </button>
          {annotations.length > 0 && (
            <button
              onClick={handleExport}
              className="flex items-center gap-2 bg-[#5BB974] text-white px-4 py-2.5 rounded-xl font-semibold hover:bg-[#4AA863] transition-colors"
            >
              <FileDown size={18} />
              Export PDF
            </button>
          )}
        </div>
      </div>

      {/* Annotations list */}
      {(annotations.length > 0 || readingProgress) ? (
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
      ) : fetchError ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-red-100">
          <p className="text-red-600 font-semibold mb-1">Could not load annotations</p>
          <p className="text-[#4B5563] text-sm">{fetchError}</p>
        </div>
      ) : selectedStudent && selectedBook && !fetching ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-[#F3F4F6]">
          <p className="text-[#4B5563]">No annotations found for this student and book.</p>
        </div>
      ) : null}
    </AppShell>
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
