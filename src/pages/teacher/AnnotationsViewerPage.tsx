import { useEffect, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import AppShell from '@/components/layout/AppShell'
import { getClassroomByTeacher } from '@/firebase/classrooms'
import { getBooksByTeacher } from '@/firebase/books'
import { getAnnotationsByStudentAndBook } from '@/firebase/annotations'
import { getUserProfile } from '@/firebase/auth'
import type { Annotation, Book, UserProfile } from '@/types'
import { REACTIONS } from '@/types'
import { exportAnnotationsPDF } from '@/utils/exportPDF'
import { FileDown } from 'lucide-react'

export default function AnnotationsViewerPage() {
  const { profile } = useAuth()
  const [students, setStudents] = useState<UserProfile[]>([])
  const [books, setBooks] = useState<Book[]>([])
  const [selectedStudent, setSelectedStudent] = useState('')
  const [selectedBook, setSelectedBook] = useState('')
  const [annotations, setAnnotations] = useState<Annotation[]>([])
  const [loading, setLoading] = useState(true)
  const [fetching, setFetching] = useState(false)

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
    })
  }, [profile])

  async function fetchAnnotations() {
    if (!selectedStudent || !selectedBook) return
    setFetching(true)
    const ann = await getAnnotationsByStudentAndBook(selectedStudent, selectedBook)
    setAnnotations(ann)
    setFetching(false)
  }

  const selectedStudentProfile = students.find((s) => s.uid === selectedStudent)
  const selectedBookData = books.find((b) => b.id === selectedBook)

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
              onChange={(e) => setSelectedStudent(e.target.value)}
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
              onChange={(e) => setSelectedBook(e.target.value)}
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
      {annotations.length > 0 ? (
        <div className="space-y-3">
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
                    {ann.noteText && (
                      <p className="text-[#4B5563] mt-1.5 text-base">{ann.noteText}</p>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : selectedStudent && selectedBook && !fetching ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-[#F3F4F6]">
          <p className="text-[#4B5563]">No annotations found for this student and book.</p>
        </div>
      ) : null}
    </AppShell>
  )
}
