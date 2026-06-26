import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/context/auth-context'
import AppShell from '@/components/layout/AppShell'
import { getBooksByTeacher } from '@/firebase/books'
import { getClassroomByTeacher } from '@/firebase/classrooms'
import { updateTeacherDisplayName } from '@/firebase/auth'
import type { Book, Classroom } from '@/types'
import { BarChart3, BookOpen, CheckCircle2, Circle, Copy, CopyCheck, Users, Upload, Eye, Pencil, X, Check, PenLine } from 'lucide-react'

export default function TeacherDashboard() {
  const { profile, refreshProfile } = useAuth()
  const [books, setBooks] = useState<Book[]>([])
  const [classroom, setClassroom] = useState<Classroom | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editingName, setEditingName] = useState(false)
  const [nameValue, setNameValue] = useState('')
  const [nameSaving, setNameSaving] = useState(false)
  const [nameError, setNameError] = useState('')
  const [codeCopied, setCodeCopied] = useState(false)
  const nameInputRef = useRef<HTMLInputElement>(null)

  function copyJoinCode() {
    if (!classroom?.joinCode) return
    navigator.clipboard.writeText(classroom.joinCode)
    setCodeCopied(true)
    setTimeout(() => setCodeCopied(false), 2000)
  }

  useEffect(() => {
    if (!profile) return
    Promise.all([
      getBooksByTeacher(profile.uid),
      getClassroomByTeacher(profile.uid),
    ]).then(([b, c]) => {
      setBooks(b)
      setClassroom(c)
      setLoading(false)
    }).catch((err: unknown) => {
      console.error('Failed to load teacher dashboard:', err)
      setError(err instanceof Error ? err.message : 'Could not load your dashboard. Please refresh.')
      setLoading(false)
    })
  }, [profile])

  function startEditingName() {
    setNameValue(profile?.displayName ?? '')
    setNameError('')
    setEditingName(true)
    setTimeout(() => nameInputRef.current?.focus(), 0)
  }

  async function saveDisplayName() {
    if (!profile) return
    setNameSaving(true)
    setNameError('')
    try {
      await updateTeacherDisplayName(profile.uid, nameValue)
      await refreshProfile()
      setEditingName(false)
    } catch (err: unknown) {
      setNameError(err instanceof Error ? err.message : 'Could not update name.')
    } finally {
      setNameSaving(false)
    }
  }

  if (loading) return (
    <AppShell title="Dashboard">
      <div className="mb-6">
        <div className="h-8 w-52 bg-[#E5E7EB] rounded-xl animate-pulse mb-2" />
        <div className="h-5 w-72 bg-[#E5E7EB] rounded-xl animate-pulse" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white rounded-2xl p-5 shadow-sm border border-[#F3F4F6]">
            <div className="h-10 w-10 bg-[#E5E7EB] rounded-xl animate-pulse mb-3" />
            <div className="h-8 w-16 bg-[#E5E7EB] rounded-lg animate-pulse mb-1" />
            <div className="h-4 w-24 bg-[#E5E7EB] rounded animate-pulse" />
          </div>
        ))}
      </div>
      <div className="h-6 w-32 bg-[#E5E7EB] rounded-xl animate-pulse mb-3" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-[#E5E7EB] rounded-2xl h-24 animate-pulse" />
        ))}
      </div>
      <div className="h-6 w-24 bg-[#E5E7EB] rounded-xl animate-pulse mb-3" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white rounded-2xl border border-[#F3F4F6] overflow-hidden">
            <div className="h-28 bg-[#E5E7EB] animate-pulse" />
            <div className="p-4 space-y-2">
              <div className="h-4 bg-[#E5E7EB] rounded animate-pulse" />
              <div className="h-3 w-2/3 bg-[#E5E7EB] rounded animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </AppShell>
  )

  if (error) return (
    <AppShell title="Dashboard">
      <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl px-5 py-4 text-sm">{error}</div>
    </AppShell>
  )

  return (
    <AppShell title="Teacher Dashboard">
      <div className="mb-6">
        {editingName ? (
          <div className="flex flex-col gap-1 mb-1">
            <div className="flex items-center gap-2">
              <input
                ref={nameInputRef}
                type="text"
                value={nameValue}
                onChange={(e) => setNameValue(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') saveDisplayName(); if (e.key === 'Escape') setEditingName(false) }}
                maxLength={60}
                className="text-2xl font-bold text-[#1A1D23] border-b-2 border-[#4A90D9] bg-transparent focus:outline-none w-full max-w-xs"
                aria-label="Edit your display name"
              />
              <button onClick={saveDisplayName} disabled={nameSaving} aria-label="Save name" className="p-1 text-[#5BB974] hover:text-[#4AA863] disabled:opacity-50">
                <Check size={20} />
              </button>
              <button onClick={() => setEditingName(false)} aria-label="Cancel edit" className="p-1 text-[#9CA3AF] hover:text-[#4B5563]">
                <X size={20} />
              </button>
            </div>
            {nameError && <p className="text-xs text-red-600">{nameError}</p>}
          </div>
        ) : (
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-2xl font-bold text-[#1A1D23]">Hello, {profile?.displayName} 🍎</h2>
            <button onClick={startEditingName} aria-label="Edit display name" className="p-1 text-[#9CA3AF] hover:text-[#4A90D9] transition-colors mt-0.5">
              <Pencil size={16} />
            </button>
          </div>
        )}
        <p className="text-[#4B5563]">Here's what's happening in your classroom today.</p>
      </div>

      <TeacherOnboardingChecklist classroom={classroom} books={books} />

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        <StatCard icon={<BookOpen size={22} />} label="Books uploaded" value={books.length} color="blue" />
        <StatCard icon={<Users size={22} />} label="Students" value={classroom?.studentIds.length ?? 0} color="green" />
        {/* Join code card — more actionable than showing classroom name */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#F3F4F6] col-span-2 md:col-span-1">
          <div className="inline-flex p-2 rounded-xl mb-3 bg-purple-50 text-[#9B7FD4]"><Eye size={22} /></div>
          {classroom ? (
            <>
              <p className="text-xs text-[#4B5563] font-semibold uppercase tracking-wide mb-1">Join Code</p>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-[#1A1D23] font-mono tracking-widest">{classroom.joinCode}</span>
                <button
                  onClick={copyJoinCode}
                  aria-label="Copy join code"
                  className="p-1.5 rounded-lg text-[#9CA3AF] hover:text-[#4A90D9] hover:bg-blue-50 transition-colors"
                >
                  {codeCopied ? <CopyCheck size={16} className="text-[#5BB974]" /> : <Copy size={16} />}
                </button>
              </div>
              <p className="text-xs text-[#9CA3AF] mt-1">{classroom.name}</p>
            </>
          ) : (
            <>
              <div className="text-lg font-bold text-[#1A1D23]">—</div>
              <div className="text-sm text-[#4B5563] mt-0.5">No classroom yet</div>
            </>
          )}
        </div>
      </div>

      {/* Quick actions */}
      <h3 className="text-lg font-bold text-[#1A1D23] mb-3">Quick Actions</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <ActionCard to="/teacher/upload" icon={<Upload size={20} />} label="Upload a Book" desc="Add a new PDF to your library" color="blue" />
        <ActionCard to="/teacher/classroom" icon={<Users size={20} />} label="Manage Classroom" desc="View students and join code" color="green" />
        <ActionCard to="/teacher/annotations" icon={<Eye size={20} />} label="View Annotations" desc="See student reading notes" color="purple" />
        <ActionCard to="/teacher/progress" icon={<BarChart3 size={20} />} label="Class Progress" desc="Reading time and completion rates" color="blue" />
      </div>

      {/* Books list */}
      <h3 className="text-lg font-bold text-[#1A1D23] mb-3">Your Books</h3>
      {books.length === 0 ? (
        <EmptyState message="No books yet. Upload your first PDF!" action={{ to: '/teacher/upload', label: 'Upload Book' }} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {books.map((book) => (
            <BookCard key={book.id} book={book} />
          ))}
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
      <div className={`font-bold ${isText ? 'text-lg' : 'text-3xl'} text-[#1A1D23]`}>{value}</div>
      <div className="text-sm text-[#4B5563] mt-0.5">{label}</div>
    </div>
  )
}

function ActionCard({ to, icon, label, desc, color }: {
  to: string; icon: React.ReactNode; label: string; desc: string; color: string
}) {
  const colors: Record<string, string> = {
    blue: 'bg-[#4A90D9] hover:bg-[#357ABD]',
    green: 'bg-[#5BB974] hover:bg-[#4AA863]',
    purple: 'bg-[#9B7FD4] hover:bg-[#8A6EC3]',
  }
  return (
    <Link to={to} className={`${colors[color]} text-white rounded-2xl p-5 flex items-start gap-3 transition-colors`}>
      <div className="bg-white/20 p-2 rounded-xl">{icon}</div>
      <div>
        <div className="font-bold text-base">{label}</div>
        <div className="text-sm opacity-90 mt-0.5">{desc}</div>
      </div>
    </Link>
  )
}

function BookCard({ book }: { book: Book }) {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#F3F4F6]">
      <div className="w-full h-28 bg-gradient-to-br from-[#4A90D9] to-[#9B7FD4] rounded-xl mb-3 flex items-center justify-center">
        <BookOpen size={36} className="text-white opacity-70" />
      </div>
      <h4 className="font-bold text-[#1A1D23] text-base leading-tight line-clamp-2">{book.title}</h4>
      <p className="text-sm text-[#4B5563] mt-0.5">{book.author}</p>
      {book.readingLevel && (
        <span className="inline-block mt-2 text-xs bg-blue-50 text-[#4A90D9] font-semibold px-2 py-0.5 rounded-full">
          {book.readingLevel}
        </span>
      )}
      {book.teacherPromptsEnabled && (
        <span className="inline-block mt-2 ml-1 text-xs bg-purple-50 text-[#9B7FD4] font-semibold px-2 py-0.5 rounded-full">
          Prompts shared
        </span>
      )}
      {book.assignmentPrompt && (
        <p className="text-xs text-[#4B5563] mt-2 line-clamp-2">{book.assignmentPrompt}</p>
      )}
      <div className="flex items-center justify-between mt-3">
        <p className="text-xs text-[#9CA3AF]">
          {book.assignedStudentIds.length} student{book.assignedStudentIds.length !== 1 ? 's' : ''} assigned
        </p>
        <Link
          to={`/teacher/read/${book.id}`}
          className="flex items-center gap-1 text-xs font-semibold text-[#9B7FD4] hover:text-[#8A6EC3] transition-colors"
          aria-label={`Annotate ${book.title} as reading prompt`}
        >
          <PenLine size={14} />
          Annotate
        </Link>
      </div>
    </div>
  )
}

function EmptyState({ message, action }: { message: string; action?: { to: string; label: string } }) {
  return (
    <div className="text-center py-12 bg-white rounded-2xl border border-[#F3F4F6]">
      <BookOpen size={40} className="mx-auto text-[#D1D5DB] mb-3" />
      <p className="text-[#4B5563] mb-4">{message}</p>
      {action && (
        <Link to={action.to} className="inline-block bg-[#4A90D9] text-white font-semibold px-6 py-2.5 rounded-xl hover:bg-[#357ABD] transition-colors">
          {action.label}
        </Link>
      )}
    </div>
  )
}

function TeacherOnboardingChecklist({ classroom, books }: { classroom: Classroom | null; books: Book[] }) {
  const step1Done = classroom !== null
  const step2Done = books.length > 0
  const step3Done = (classroom?.studentIds.length ?? 0) > 0
  const step4Done = books.some((b) => b.assignedStudentIds.length > 0)

  if (step1Done && step2Done && step3Done && step4Done) return null

  const steps = [
    { done: step1Done, label: 'Create your classroom', to: '/teacher/classroom', hint: 'Get your 6-letter join code' },
    { done: step2Done, label: 'Upload your first book', to: '/teacher/upload', hint: 'Add a PDF for students to read' },
    { done: step3Done, label: 'Students join your classroom', to: '/teacher/classroom', hint: 'Share your join code — students enter it at sign-up or from their dashboard' },
    { done: step4Done, label: 'Assign your book to students', to: '/teacher/classroom', hint: 'Go to Classroom → Assign to Whole Class' },
  ]

  return (
    <div className="bg-[#EFF6FF] border border-[#BFDBFE] rounded-2xl p-5 mb-6" role="region" aria-label="Setup checklist">
      <h3 className="font-bold text-[#1A1D23] mb-0.5">Welcome! Let's set up your classroom</h3>
      <p className="text-sm text-[#4B5563] mb-4">Follow these steps to get your first students reading.</p>
      <ol className="space-y-3">
        {steps.map((step, i) => (
          <li key={i} className="flex items-start gap-3">
            <span className="mt-0.5 shrink-0" aria-hidden="true">
              {step.done
                ? <CheckCircle2 size={20} className="text-[#5BB974]" />
                : <Circle size={20} className="text-[#4A90D9]" />
              }
            </span>
            <div className="flex-1 min-w-0">
              <span className={`block text-sm font-semibold ${step.done ? 'text-[#9CA3AF] line-through' : 'text-[#1A1D23]'}`}>
                {i + 1}. {step.label}
              </span>
              {!step.done && (
                <span className="block text-xs text-[#4B5563] mt-0.5">{step.hint}</span>
              )}
            </div>
            {!step.done && (
              <Link
                to={step.to}
                className="shrink-0 text-sm font-bold text-[#4A90D9] hover:text-[#357ABD] underline-offset-2 hover:underline"
              >
                Go →
              </Link>
            )}
          </li>
        ))}
      </ol>
    </div>
  )
}
