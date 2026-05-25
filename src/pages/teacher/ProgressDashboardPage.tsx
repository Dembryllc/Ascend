import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import AppShell from '@/components/layout/AppShell'
import { getAnnotationsByClassAndBook } from '@/firebase/annotations'
import { getUserProfile } from '@/firebase/auth'
import { getBooksByTeacher } from '@/firebase/books'
import { getClassroomByTeacher } from '@/firebase/classrooms'
import { getReadingProgressByClassroom } from '@/firebase/readingProgress'
import type { Annotation, ReadingProgress, UserProfile } from '@/types'
import { CheckCircle, Clock, MessageSquare, Users } from 'lucide-react'

export default function ProgressDashboardPage() {
  const { profile } = useAuth()
  const [students, setStudents] = useState<UserProfile[]>([])
  const [annotations, setAnnotations] = useState<Annotation[]>([])
  const [readingProgress, setReadingProgress] = useState<ReadingProgress[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profile) return
    let cancelled = false

    async function load() {
      const [classroom, teacherBooks] = await Promise.all([
        getClassroomByTeacher(profile!.uid),
        getBooksByTeacher(profile!.uid),
      ])
      if (!classroom) {
        if (!cancelled) {
          setStudents([])
          setAnnotations([])
          setReadingProgress([])
          setLoading(false)
        }
        return
      }

      const [studentProfiles, bookAnnotations, progressRows] = await Promise.all([
        Promise.all(classroom.studentIds.map((id) => getUserProfile(id))),
        Promise.all(teacherBooks.map((book) => getAnnotationsByClassAndBook(classroom.studentIds, book.id))),
        getReadingProgressByClassroom(classroom.id),
      ])

      if (cancelled) return
      setStudents(studentProfiles.filter(Boolean) as UserProfile[])
      setAnnotations(bookAnnotations.flat())
      setReadingProgress(progressRows.filter((row) => classroom.studentIds.includes(row.studentId)))
      setLoading(false)
    }

    load().catch((err) => {
      console.error('Failed to load teacher progress:', err)
      if (!cancelled) setLoading(false)
    })

    return () => {
      cancelled = true
    }
  }, [profile])

  const rows = useMemo(() => {
    return students.map((student) => {
      const studentAnnotations = annotations.filter((ann) => ann.studentId === student.uid)
      const studentProgress = readingProgress.filter((progress) => progress.studentId === student.uid)
      const annotatedBooks = new Set(studentAnnotations.map((ann) => ann.bookId))
      const activeBooks = new Set(studentProgress.map((progress) => progress.bookId))
      const latest = studentAnnotations.slice().sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0]
      const latestProgress = studentProgress.slice().sort((a, b) => b.lastReadAt.getTime() - a.lastReadAt.getTime())[0]
      return {
        student,
        annotations: studentAnnotations.length,
        quotes: studentAnnotations.filter((ann) => ann.selectedText && ann.annotationKind !== 'reflection').length,
        booksStarted: new Set([...annotatedBooks, ...activeBooks]).size,
        minutesRead: Math.round(studentProgress.reduce((sum, progress) => sum + progress.totalSecondsRead, 0) / 60),
        completedBooks: studentProgress.filter((progress) => progress.completed).length,
        averageCompletion: studentProgress.length > 0
          ? Math.round(studentProgress.reduce((sum, progress) => sum + progress.completionPercent, 0) / studentProgress.length)
          : 0,
        latest,
        latestProgress,
      }
    })
  }, [annotations, readingProgress, students])

  const totalMinutes = Math.round(readingProgress.reduce((sum, progress) => sum + progress.totalSecondsRead, 0) / 60)
  const completedBooks = readingProgress.filter((progress) => progress.completed).length

  if (loading) return (
    <AppShell title="Progress">
      <div className="flex justify-center py-16">
        <div className="w-8 h-8 border-4 border-[#4A90D9] border-t-transparent rounded-full animate-spin" />
      </div>
    </AppShell>
  )

  return (
    <AppShell title="Progress">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-[#1A1D23]">Class Progress</h2>
        <p className="text-[#4B5563] mt-1">A quick scan of pages read, time spent, completion, and annotation activity.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <Stat icon={<Users size={20} />} label="Students" value={students.length} />
        <Stat icon={<Clock size={20} />} label="Minutes read" value={totalMinutes} />
        <Stat icon={<CheckCircle size={20} />} label="Books completed" value={completedBooks} />
        <Stat icon={<MessageSquare size={20} />} label="Annotations" value={annotations.length} />
      </div>

      {rows.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#F3F4F6] p-8 text-center">
          <p className="text-[#4B5563] mb-4">Create a classroom and assign a book to start tracking progress.</p>
          <Link to="/teacher/classroom" className="inline-block bg-[#4A90D9] text-white font-bold px-5 py-2.5 rounded-xl hover:bg-[#357ABD] transition-colors">
            Manage Classroom
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-[#F3F4F6] shadow-sm overflow-hidden">
          <div className="hidden md:grid grid-cols-[1.5fr_0.9fr_0.9fr_0.9fr_0.9fr_1.2fr] gap-3 px-5 py-3 bg-[#F8F9FC] text-xs font-bold uppercase tracking-wide text-[#6B7280]">
            <span>Student</span>
            <span>Books started</span>
            <span>Completion</span>
            <span>Minutes</span>
            <span>Notes</span>
            <span>Last activity</span>
          </div>
          <div className="divide-y divide-[#F3F4F6]">
            {rows.map((row) => (
              <div key={row.student.uid} className="grid grid-cols-2 md:grid-cols-[1.5fr_0.9fr_0.9fr_0.9fr_0.9fr_1.2fr] gap-3 px-5 py-4 items-center">
                <div className="col-span-2 md:col-span-1">
                  <p className="font-bold text-[#1A1D23]">{row.student.displayName}</p>
                  <p className="text-xs text-[#6B7280]">{row.student.email}</p>
                </div>
                <Metric label="Books" value={row.booksStarted} />
                <Metric label="Done" value={`${row.averageCompletion}%`} />
                <Metric label="Minutes" value={row.minutesRead} />
                <Metric label="Notes" value={row.annotations} />
                <div className="col-span-2 md:col-span-1 text-sm text-[#4B5563]">
                  {row.latestProgress
                    ? `${row.latestProgress.lastReadAt.toLocaleDateString()} · page ${row.latestProgress.lastReadPage}`
                    : row.latest
                      ? row.latest.timestamp.toLocaleDateString()
                      : 'No activity yet'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </AppShell>
  )
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="bg-white rounded-2xl border border-[#F3F4F6] p-4 shadow-sm">
      <div className="inline-flex bg-blue-50 text-[#4A90D9] p-2 rounded-xl mb-3">{icon}</div>
      <p className="text-3xl font-bold text-[#1A1D23]">{value}</p>
      <p className="text-xs text-[#6B7280] mt-1">{label}</p>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <div>
      <p className="md:hidden text-[11px] font-bold uppercase tracking-wide text-[#9CA3AF]">{label}</p>
      <p className="text-lg font-bold text-[#1A1D23]">{value}</p>
    </div>
  )
}
