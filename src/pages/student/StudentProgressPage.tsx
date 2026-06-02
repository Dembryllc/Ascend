import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import AppShell from '@/components/layout/AppShell'
import { getBooksByStudent } from '@/firebase/books'
import { getAnnotationsByStudent } from '@/firebase/annotations'
import { getReadingProgressByStudent } from '@/firebase/readingProgress'
import type { Annotation, Book, ReadingProgress, ReactionType } from '@/types'
import { REACTIONS } from '@/types'
import { buildStudentProgressSummary } from '@/utils/studentProgress'
import { AlertCircle, BookOpen, CheckCircle2, Flame, MessageSquare, Target, TrendingUp } from 'lucide-react'

export default function StudentProgressPage() {
  const { profile, loading: authLoading, error: authError } = useAuth()
  const [books, setBooks] = useState<Book[]>([])
  const [annotations, setAnnotations] = useState<Annotation[]>([])
  const [readingProgress, setReadingProgress] = useState<ReadingProgress[]>([])
  const [loadedStudentId, setLoadedStudentId] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (authLoading || authError || !profile) return

    let cancelled = false
    Promise.all([
      getBooksByStudent(profile.uid),
      getAnnotationsByStudent(profile.uid),
      getReadingProgressByStudent(profile.uid),
    ])
      .then(([b, ann, progressRows]) => {
        if (cancelled) return
        setBooks(b)
        setAnnotations(ann)
        setReadingProgress(progressRows)
        setError('')
        setLoadedStudentId(profile.uid)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Could not load your progress. Please try refreshing.')
        setLoadedStudentId(profile.uid)
      })

    return () => { cancelled = true }
  }, [profile, authLoading, authError])

  const displayedError = authError
    ? `Authentication error: ${authError}`
    : !authLoading && !profile
      ? 'You must be signed in to view your progress.'
      : error
  const pageLoading = authLoading || Boolean(profile && loadedStudentId !== profile.uid && !displayedError)

  if (pageLoading) return (
    <AppShell title="My Progress">
      <div className="mb-6">
        <div className="h-8 w-48 bg-[#E5E7EB] rounded-xl animate-pulse mb-2" />
        <div className="h-4 w-56 bg-[#E5E7EB] rounded-xl animate-pulse" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-28 bg-[#E5E7EB] rounded-2xl animate-pulse" />
        ))}
      </div>
      <div className="h-6 w-32 bg-[#E5E7EB] rounded-xl animate-pulse mb-4" />
      <div className="space-y-3 mb-8">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-24 bg-[#E5E7EB] rounded-2xl animate-pulse" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="h-56 bg-[#E5E7EB] rounded-2xl animate-pulse" />
        <div className="h-56 bg-[#E5E7EB] rounded-2xl animate-pulse" />
      </div>
    </AppShell>
  )

  if (displayedError) return (
    <AppShell title="My Progress">
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertCircle size={44} className="text-red-400 mb-4" />
        <h3 className="text-xl font-bold text-[#1A1D23] mb-2">Couldn't load your progress</h3>
        <p className="text-[#4B5563] max-w-sm mb-6">{displayedError}</p>
        <button
          onClick={() => window.location.reload()}
          className="bg-[#4A90D9] text-white font-bold px-6 py-3 rounded-xl hover:bg-[#357ABD] transition-colors"
        >
          Try Again
        </button>
      </div>
    </AppShell>
  )

  if (books.length === 0 && annotations.length === 0) return (
    <AppShell title="My Progress">
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <TrendingUp size={32} className="text-[#4A90D9]" />
        </div>
        <h2 className="text-2xl font-bold text-[#1A1D23] mb-2">No progress yet</h2>
        <p className="text-[#4B5563] mb-6 max-w-sm">
          Start reading and annotating to see your stats, streaks, and per-book progress here.
        </p>
        <Link
          to="/student"
          className="inline-block bg-[#4A90D9] text-white font-bold px-6 py-3 rounded-xl hover:bg-[#357ABD] transition-colors"
        >
          Go to My Books
        </Link>
      </div>
    </AppShell>
  )

  const summary = buildStudentProgressSummary(books, annotations, readingProgress)
  const progressByBookId = new Map(readingProgress.map((r) => [r.bookId, r]))
  const annotationCountByBookId = annotations.reduce<Map<string, number>>((map, ann) => {
    map.set(ann.bookId, (map.get(ann.bookId) ?? 0) + 1)
    return map
  }, new Map())

  const goalsRemaining = summary.weeklyPageGoal - summary.pagesAnnotatedThisWeek
  const goalMessage = goalsRemaining <= 0
    ? `Goal reached! You annotated ${summary.pagesAnnotatedThisWeek} pages this week.`
    : `${goalsRemaining} more page${goalsRemaining === 1 ? '' : 's'} to hit your goal this week!`

  // Sort: in-progress first, then not started, then completed
  const sortedBooks = [...books].sort((a, b) => {
    const pa = progressByBookId.get(a.id)
    const pb = progressByBookId.get(b.id)
    const aComplete = pa?.completed ? 1 : 0
    const bComplete = pb?.completed ? 1 : 0
    if (aComplete !== bComplete) return aComplete - bComplete
    const aPercent = pa?.completionPercent ?? 0
    const bPercent = pb?.completionPercent ?? 0
    return bPercent - aPercent
  })

  return (
    <AppShell title="My Progress">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-[#1A1D23]">My Progress</h2>
        <p className="text-[#4B5563] mt-1">Your reading journey at a glance</p>
      </div>

      {/* Top stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        <StatCard
          icon={<BookOpen size={20} />}
          label="Minutes Read"
          value={summary.minutesRead.toString()}
          iconBg="bg-blue-50"
          iconColor="text-[#4A90D9]"
        />
        <StatCard
          icon={<MessageSquare size={20} />}
          label="Annotations"
          value={summary.annotationsCount.toString()}
          iconBg="bg-purple-50"
          iconColor="text-[#9B7FD4]"
        />
        <StatCard
          icon={<BookOpen size={20} />}
          label="Books Completed"
          value={summary.completedBooks.toString()}
          iconBg="bg-green-50"
          iconColor="text-[#5BB974]"
        />
        <StatCard
          icon={<Flame size={20} />}
          label="Day Streak"
          value={summary.streakDays.toString()}
          iconBg="bg-amber-50"
          iconColor="text-amber-500"
        />
      </div>

      {/* Per-book progress */}
      <section className="mb-8">
        <h3 className="text-lg font-bold text-[#1A1D23] mb-4">Books</h3>
        <div className="space-y-3">
          {sortedBooks.map((book) => {
            const prog = progressByBookId.get(book.id)
            const annCount = annotationCountByBookId.get(book.id) ?? 0
            const percent = prog?.completionPercent ?? 0
            const minutes = prog ? Math.round(prog.totalSecondsRead / 60) : 0
            const pageLabel = prog
              ? prog.completed
                ? 'Complete'
                : `Page ${prog.lastReadPage} of ${prog.totalPages}`
              : 'Not started'

            return (
              <div
                key={book.id}
                className="bg-white rounded-2xl border border-[#F3F4F6] shadow-sm p-4"
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="min-w-0">
                    <h4 className="font-bold text-[#1A1D23] leading-tight truncate">{book.title}</h4>
                    <p className="text-sm text-[#4B5563] mt-0.5">{book.author}</p>
                  </div>
                  <Link
                    to={`/student/read/${book.id}`}
                    className="shrink-0 text-sm font-bold text-[#4A90D9] hover:text-[#357ABD] whitespace-nowrap"
                  >
                    Open →
                  </Link>
                </div>

                {/* Progress bar */}
                <div className="mb-3">
                  <div className="flex items-center justify-between text-xs font-semibold text-[#6B7280] mb-1.5">
                    <span className="flex items-center gap-1">
                      {prog?.completed && <CheckCircle2 size={12} className="text-[#5BB974]" />}
                      {pageLabel}
                    </span>
                    <span>{percent}%</span>
                  </div>
                  <div className="h-2 bg-[#E5E7EB] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${percent}%`,
                        backgroundColor: prog?.completed ? '#5BB974' : '#4A90D9',
                      }}
                    />
                  </div>
                </div>

                {/* Book stats */}
                <div className="flex items-center gap-4 text-xs text-[#4B5563]">
                  <span className="flex items-center gap-1">
                    <BookOpen size={12} className="text-[#9CA3AF]" />
                    {minutes} min read
                  </span>
                  <span className="flex items-center gap-1">
                    <MessageSquare size={12} className="text-[#9CA3AF]" />
                    {annCount} annotation{annCount === 1 ? '' : 's'}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* Reaction breakdown + Weekly goal */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Reaction breakdown */}
        <section className="bg-white rounded-2xl border border-[#F3F4F6] shadow-sm p-5">
          <div className="flex items-center gap-2 mb-5">
            <span className="bg-purple-50 text-[#9B7FD4] p-2 rounded-xl">
              <TrendingUp size={20} />
            </span>
            <div>
              <h3 className="font-bold text-[#1A1D23]">Reaction Breakdown</h3>
              <p className="text-xs text-[#4B5563]">
                {summary.topReaction
                  ? `Most used: ${REACTIONS[summary.topReaction].emoji} ${REACTIONS[summary.topReaction].label}`
                  : 'No reactions yet'}
              </p>
            </div>
          </div>
          <ReactionBreakdown reactionCounts={summary.reactionCounts} />
        </section>

        {/* Weekly goal */}
        <section className="bg-white rounded-2xl border border-[#F3F4F6] shadow-sm p-5">
          <div className="flex items-center gap-2 mb-5">
            <span className="bg-green-50 text-[#5BB974] p-2 rounded-xl">
              <Target size={20} />
            </span>
            <div>
              <h3 className="font-bold text-[#1A1D23]">Weekly Goal</h3>
              <p className="text-xs text-[#4B5563]">Pages annotated this week</p>
            </div>
          </div>

          <div className="flex items-end gap-2 mb-3">
            <span className="text-4xl font-bold text-[#1A1D23]">{summary.pagesAnnotatedThisWeek}</span>
            <span className="text-lg text-[#9CA3AF] mb-1">/ {summary.weeklyPageGoal}</span>
          </div>

          <div className="h-3 bg-[#E5E7EB] rounded-full overflow-hidden mb-4">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${summary.weeklyGoalPercent}%`,
                backgroundColor: goalsRemaining <= 0 ? '#5BB974' : '#4A90D9',
              }}
            />
          </div>

          <p className={`text-sm font-semibold ${goalsRemaining <= 0 ? 'text-[#5BB974]' : 'text-[#4B5563]'}`}>
            {goalMessage}
          </p>

          {summary.streakDays > 0 && (
            <p className="text-xs text-[#9CA3AF] mt-3 flex items-center gap-1">
              <Flame size={12} className="text-amber-500" />
              {summary.streakDays}-day annotation streak — keep it up!
            </p>
          )}
        </section>
      </div>
    </AppShell>
  )
}

function StatCard({
  icon,
  label,
  value,
  iconBg,
  iconColor,
}: {
  icon: React.ReactNode
  label: string
  value: string
  iconBg: string
  iconColor: string
}) {
  return (
    <div className="bg-white rounded-2xl border border-[#F3F4F6] shadow-sm p-4">
      <div className={`inline-flex p-2 rounded-xl ${iconBg} ${iconColor} mb-3`}>
        {icon}
      </div>
      <p className="text-3xl font-bold text-[#1A1D23] leading-none">{value}</p>
      <p className="text-xs text-[#4B5563] mt-2 font-semibold uppercase tracking-wide">{label}</p>
    </div>
  )
}

function ReactionBreakdown({ reactionCounts }: { reactionCounts: Record<ReactionType, number> }) {
  const total = Object.values(reactionCounts).reduce((sum, c) => sum + c, 0)

  if (total === 0) {
    return (
      <p className="text-sm text-[#4B5563]">
        No annotations yet. Start reading to see your reaction mix here.
      </p>
    )
  }

  return (
    <div className="space-y-4">
      {(Object.entries(REACTIONS) as [ReactionType, typeof REACTIONS[ReactionType]][]).map(([type, reaction]) => {
        const count = reactionCounts[type]
        const percent = total > 0 ? Math.round((count / total) * 100) : 0
        return (
          <div key={type}>
            <div className="flex items-center justify-between text-sm mb-1.5">
              <span className="font-semibold text-[#1A1D23]">
                {reaction.emoji} {reaction.label}
              </span>
              <span className="text-[#4B5563] tabular-nums">{count}</span>
            </div>
            <div className="h-3 bg-[#E5E7EB] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${percent}%`, backgroundColor: reaction.color }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}
