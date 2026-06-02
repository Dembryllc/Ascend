import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import AppShell from '@/components/layout/AppShell'
import { getClassroomByTeacher } from '@/firebase/classrooms'
import { getBooksByTeacher } from '@/firebase/books'
import { getReadingProgressByClassroom } from '@/firebase/readingProgress'
import { getUserProfile } from '@/firebase/auth'
import type { Book, ReadingProgress, UserProfile } from '@/types'
import { BarChart3, BookOpen, Clock, Users } from 'lucide-react'

export default function ProgressDashboardPage() {
  const { profile } = useAuth()
  const [students, setStudents] = useState<UserProfile[]>([])
  const [books, setBooks] = useState<Book[]>([])
  const [progress, setProgress] = useState<ReadingProgress[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!profile) return

    async function load() {
      try {
        const [classroom, bks] = await Promise.all([
          getClassroomByTeacher(profile!.uid),
          getBooksByTeacher(profile!.uid),
        ])
        setBooks(bks)
        if (!classroom) { setLoading(false); return }

        const [progressRows, studentProfiles] = await Promise.all([
          getReadingProgressByClassroom(classroom.id),
          Promise.all(classroom.studentIds.map((id) => getUserProfile(id))),
        ])
        setStudents(studentProfiles.filter(Boolean) as UserProfile[])
        setProgress(progressRows)
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Could not load progress data. Please refresh.')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [profile])

  if (loading) return (
    <AppShell title="Class Progress">
      <div className="h-8 w-48 bg-[#E5E7EB] rounded-xl animate-pulse mb-2" />
      <div className="h-5 w-72 bg-[#E5E7EB] rounded-xl animate-pulse mb-6" />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-2xl p-5 border border-[#F3F4F6]">
            <div className="h-10 w-10 bg-[#E5E7EB] rounded-xl animate-pulse mb-3" />
            <div className="h-7 w-12 bg-[#E5E7EB] rounded animate-pulse mb-1" />
            <div className="h-4 w-20 bg-[#E5E7EB] rounded animate-pulse" />
          </div>
        ))}
      </div>
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white rounded-2xl p-5 border border-[#F3F4F6]">
            <div className="flex justify-between mb-4">
              <div>
                <div className="h-5 w-32 bg-[#E5E7EB] rounded animate-pulse mb-1" />
                <div className="h-3 w-24 bg-[#E5E7EB] rounded animate-pulse" />
              </div>
              <div className="h-5 w-16 bg-[#E5E7EB] rounded animate-pulse" />
            </div>
            <div className="space-y-3">
              {[...Array(2)].map((_, j) => (
                <div key={j}>
                  <div className="flex justify-between mb-1">
                    <div className="h-3 w-40 bg-[#E5E7EB] rounded animate-pulse" />
                    <div className="h-3 w-10 bg-[#E5E7EB] rounded animate-pulse" />
                  </div>
                  <div className="h-2 bg-[#E5E7EB] rounded-full animate-pulse" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </AppShell>
  )

  if (error) return (
    <AppShell title="Class Progress">
      <div className="text-center py-16 bg-white rounded-2xl border border-[#F3F4F6]">
        <BarChart3 size={40} className="mx-auto text-[#D1D5DB] mb-4" />
        <h3 className="text-lg font-bold text-[#1A1D23] mb-2">Couldn't load progress</h3>
        <p className="text-sm text-[#4B5563] mb-6">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="bg-[#4A90D9] text-white font-bold px-6 py-3 rounded-xl hover:bg-[#357ABD] transition-colors"
        >
          Try Again
        </button>
      </div>
    </AppShell>
  )

  const progressByStudent = new Map<string, ReadingProgress[]>()
  for (const row of progress) {
    const existing = progressByStudent.get(row.studentId) ?? []
    progressByStudent.set(row.studentId, [...existing, row])
  }

  const bookById = new Map(books.map((b) => [b.id, b]))
  const totalMinutes = Math.round(progress.reduce((s, r) => s + r.totalSecondsRead, 0) / 60)
  const avgCompletion = progress.length > 0
    ? Math.round(progress.reduce((s, r) => s + r.completionPercent, 0) / progress.length)
    : 0
  const booksFinished = progress.filter((r) => r.completed).length

  return (
    <AppShell title="Class Progress">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-[#1A1D23]">Class Progress</h2>
        <p className="text-[#4B5563] mt-1">Reading activity across all students and books.</p>
        <p className="text-xs text-[#9CA3AF] mt-1">Student data is protected under FERPA and used solely for educational purposes.</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <StatCard icon={<Users size={20} />} label="Students" value={students.length} color="blue" />
        <StatCard icon={<Clock size={20} />} label="Total minutes" value={totalMinutes} color="green" />
        <StatCard icon={<BarChart3 size={20} />} label="Avg completion" value={`${avgCompletion}%`} color="purple" isText />
        <StatCard icon={<BookOpen size={20} />} label="Books finished" value={booksFinished} color="blue" />
      </div>

      {students.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-[#F3F4F6]">
          <Users size={40} className="mx-auto text-[#D1D5DB] mb-4" />
          <h3 className="text-lg font-bold text-[#1A1D23] mb-2">No students yet</h3>
          <p className="text-sm text-[#4B5563] mb-6">
            Progress will appear here once students join your classroom and start reading.
          </p>
          <Link
            to="/teacher/classroom"
            className="inline-block bg-[#4A90D9] text-white font-bold px-6 py-3 rounded-xl hover:bg-[#357ABD] transition-colors"
          >
            Go to Classroom
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {students.map((student) => {
            const rows = (progressByStudent.get(student.uid) ?? [])
              .slice()
              .sort((a, b) => b.lastReadAt.getTime() - a.lastReadAt.getTime())
            const studentMinutes = Math.round(rows.reduce((s, r) => s + r.totalSecondsRead, 0) / 60)
            const lastActive = rows[0]?.lastReadAt ?? null

            return (
              <div key={student.uid} className="bg-white rounded-2xl p-5 shadow-sm border border-[#F3F4F6]">
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div>
                    <h3 className="font-bold text-[#1A1D23]">{student.displayName}</h3>
                    <p className="text-xs text-[#9CA3AF]">
                      {lastActive
                        ? `Last read ${lastActive.toLocaleDateString()}`
                        : 'No activity yet'}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-[#1A1D23]">{studentMinutes} min</p>
                    <p className="text-xs text-[#9CA3AF]">{rows.length} book{rows.length !== 1 ? 's' : ''}</p>
                  </div>
                </div>

                {rows.length === 0 ? (
                  <p className="text-sm text-[#9CA3AF] italic">No reading recorded yet.</p>
                ) : (
                  <div className="space-y-3">
                    {rows.map((row) => {
                      const book = bookById.get(row.bookId)
                      return (
                        <div key={row.id}>
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="font-semibold text-[#1A1D23] truncate max-w-[60%]">
                              {book?.title ?? 'Unknown Book'}
                            </span>
                            <span className="text-[#4B5563] shrink-0 ml-2">
                              {row.completed
                                ? 'Complete ✓'
                                : `p.${row.highestPageRead}${row.totalPages > 0 ? `/${row.totalPages}` : ''} · ${row.completionPercent}%`}
                            </span>
                          </div>
                          <div className="h-2 bg-[#F3F4F6] rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${row.completed ? 'bg-[#5BB974]' : 'bg-[#4A90D9]'}`}
                              style={{ width: `${Math.max(2, row.completionPercent)}%` }}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </AppShell>
  )
}

function StatCard({ icon, label, value, color, isText }: {
  icon: React.ReactNode; label: string; value: number | string; color: string; isText?: boolean
}) {
  const colors: Record<string, string> = {
    blue: 'bg-blue-50 text-[#4A90D9]',
    green: 'bg-green-50 text-[#5BB974]',
    purple: 'bg-purple-50 text-[#9B7FD4]',
  }
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#F3F4F6]">
      <div className={`inline-flex p-2 rounded-xl mb-3 ${colors[color]}`}>{icon}</div>
      <div className={`font-bold ${isText ? 'text-2xl' : 'text-3xl'} text-[#1A1D23]`}>{value}</div>
      <div className="text-sm text-[#4B5563] mt-0.5">{label}</div>
    </div>
  )
}
