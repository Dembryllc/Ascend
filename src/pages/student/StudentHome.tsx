import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import AppShell from '@/components/layout/AppShell'
import { getBooksByStudent, deleteStudentBook } from '@/firebase/books'
import { getAnnotationsByStudent } from '@/firebase/annotations'
import type { Annotation, Book, ReactionType } from '@/types'
import { REACTIONS } from '@/types'
import { buildStudentProgressSummary } from '@/utils/studentProgress'
import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  Flame,
  MessageSquare,
  Plus,
  Sparkles,
  Target,
  Trash2,
  TrendingUp,
} from 'lucide-react'

export default function StudentHome() {
  const { profile, loading: authLoading, error: authError } = useAuth()
  const [books, setBooks] = useState<Book[]>([])
  const [annotations, setAnnotations] = useState<Annotation[]>([])
  const [loadedStudentId, setLoadedStudentId] = useState('')
  const [error, setError] = useState('')
  const [deleting, setDeleting] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<Book | null>(null)

  useEffect(() => {
    if (authLoading || authError || !profile) return

    let cancelled = false
    Promise.all([
      getBooksByStudent(profile.uid),
      getAnnotationsByStudent(profile.uid),
    ])
      .then(([b, ann]) => {
        if (cancelled) return
        setBooks(b)
        setAnnotations(ann)
        setError('')
        setLoadedStudentId(profile.uid)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        console.error('Failed to load student dashboard:', err)
        setError(err instanceof Error ? err.message : 'Could not load your dashboard. Please try refreshing.')
        setLoadedStudentId(profile.uid)
      })

    return () => {
      cancelled = true
    }
  }, [profile, authLoading, authError])

  async function handleDelete(book: Book) {
    setDeleting(book.id)
    try {
      await deleteStudentBook(book.id, book.storageUrl)
      setBooks((prev) => prev.filter((b) => b.id !== book.id))
    } finally {
      setDeleting(null)
      setConfirmDelete(null)
    }
  }

  const displayedError = authError
    ? `Authentication error: ${authError}`
    : !authLoading && !profile
      ? 'You must be signed in to view your books.'
      : error
  const dashboardLoading = authLoading || Boolean(profile && loadedStudentId !== profile.uid && !displayedError)

  if (dashboardLoading) return (
    <AppShell>
      <div className="mb-6">
        <div className="h-9 w-64 bg-[#E5E7EB] rounded-xl animate-pulse mb-2" />
        <div className="h-5 w-40 bg-[#E5E7EB] rounded-xl animate-pulse" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        <div className="h-20 bg-[#E5E7EB] rounded-2xl animate-pulse" />
        <div className="h-20 bg-[#E5E7EB] rounded-2xl animate-pulse" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-28 bg-[#E5E7EB] rounded-2xl animate-pulse" />
        ))}
      </div>
      <div className="h-6 w-32 bg-[#E5E7EB] rounded-xl animate-pulse mb-4" />
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-2xl border border-[#F3F4F6] overflow-hidden">
            <div className="h-40 bg-[#E5E7EB] animate-pulse" />
            <div className="p-3 space-y-2">
              <div className="h-4 bg-[#E5E7EB] rounded animate-pulse" />
              <div className="h-3 w-2/3 bg-[#E5E7EB] rounded animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </AppShell>
  )

  if (displayedError) return (
    <AppShell>
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertCircle size={44} className="text-red-400 mb-4" />
        <h3 className="text-xl font-bold text-[#1A1D23] mb-2">Couldn't load your books</h3>
        <p className="text-[#4B5563] max-w-sm mb-2">{displayedError}</p>
        <p className="text-xs text-[#9CA3AF] mb-6">Check the browser console for details.</p>
        <button
          onClick={() => window.location.reload()}
          className="bg-[#4A90D9] text-white font-bold px-6 py-3 rounded-xl hover:bg-[#357ABD] transition-colors"
        >
          Try Again
        </button>
      </div>
    </AppShell>
  )

  const myBooks = books.filter((b) => b.uploadedBy === profile?.uid)
  const assignedBooks = books.filter((b) => b.uploadedBy !== profile?.uid)
  const progress = buildStudentProgressSummary(books, annotations)
  const bookTitleById = new Map(books.map((book) => [book.id, book.title]))

  return (
    <AppShell>
      <div className="mb-6">
        <h2 className="text-3xl font-bold text-[#1A1D23]">
          Hello, {profile?.displayName}!
        </h2>
        <p className="text-[#4B5563] text-lg mt-1">Happy reading!</p>
      </div>

      {/* Action row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        <Link
          to="/student/upload"
          className="flex items-center gap-3 bg-[#4A90D9] text-white rounded-2xl px-5 py-4 hover:bg-[#357ABD] transition-colors"
        >
          <div className="bg-white/20 p-2 rounded-xl">
            <Plus size={22} />
          </div>
          <div>
            <p className="font-bold text-base">Add a Book</p>
            <p className="text-sm opacity-90">Upload your own PDF</p>
          </div>
        </Link>

        <Link
          to="/student/annotations"
          className="flex items-center gap-3 bg-[#9B7FD4] text-white rounded-2xl px-5 py-4 hover:bg-[#8A6EC3] transition-colors"
        >
          <div className="bg-white/20 p-2 rounded-xl">
            <MessageSquare size={22} />
          </div>
          <div>
            <p className="font-bold text-base">My Annotations</p>
            <p className="text-sm opacity-90">See all your reading notes</p>
          </div>
        </Link>
      </div>

      {/* Progress dashboard */}
      <section className="mb-8" aria-labelledby="progress-heading">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <h3 id="progress-heading" className="text-lg font-bold text-[#1A1D23]">My Progress</h3>
            <p className="text-sm text-[#4B5563]">Your reading activity updates from your books and annotations.</p>
          </div>
          <Link
            to="/student/annotations"
            className="hidden sm:inline-flex items-center gap-1.5 text-sm font-bold text-[#4A90D9] hover:text-[#357ABD]"
          >
            View notes <ArrowRight size={16} />
          </Link>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          <ProgressCard
            icon={<BookOpen size={20} />}
            label="Books in shelf"
            value={progress.booksInShelf.toString()}
            detail={`${assignedBooks.length} assigned, ${myBooks.length} uploaded`}
          />
          <ProgressCard
            icon={<MessageSquare size={20} />}
            label="Annotations"
            value={progress.annotationsCount.toString()}
            detail={`${progress.pagesAnnotated} page${progress.pagesAnnotated === 1 ? '' : 's'} annotated`}
          />
          <ProgressCard
            icon={<Flame size={20} />}
            label="Streak"
            value={`${progress.streakDays}`}
            detail={progress.streakDays === 1 ? 'day with notes' : 'days with notes'}
          />
          <ProgressCard
            icon={<Target size={20} />}
            label="Weekly goal"
            value={`${progress.pagesAnnotatedThisWeek}/${progress.weeklyPageGoal}`}
            detail="pages annotated this week"
            meterValue={progress.weeklyGoalPercent}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <NextActionCard progress={progress} />
          <ReactionMixCard reactionCounts={progress.reactionCounts} topReaction={progress.topReaction} />
          <RecentActivityCard
            annotations={progress.recentAnnotations}
            bookTitleById={bookTitleById}
          />
        </div>
      </section>

      {books.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-[#F3F4F6]">
          <BookOpen size={48} className="mx-auto text-[#D1D5DB] mb-4" />
          <h3 className="text-xl font-bold text-[#1A1D23] mb-2">Your bookshelf is empty</h3>
          <p className="text-[#4B5563] mb-6">Upload your own book or wait for your teacher to assign one.</p>
          <Link
            to="/student/upload"
            className="inline-flex items-center gap-2 bg-[#4A90D9] text-white font-bold px-6 py-3 rounded-xl hover:bg-[#357ABD] transition-colors"
          >
            <Plus size={18} /> Add a Book
          </Link>
        </div>
      ) : (
        <>
          {/* Teacher-assigned books */}
          {assignedBooks.length > 0 && (
            <section className="mb-8">
              <h3 className="text-lg font-bold text-[#1A1D23] mb-4">Assigned by Teacher</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {assignedBooks.map((book) => (
                  <BookCard key={book.id} book={book} />
                ))}
              </div>
            </section>
          )}

          {/* Student's own books */}
          {myBooks.length > 0 && (
            <section>
              <h3 className="text-lg font-bold text-[#1A1D23] mb-4">My Books</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {myBooks.map((book) => (
                  <BookCard
                    key={book.id}
                    book={book}
                    onDelete={() => setConfirmDelete(book)}
                    deleting={deleting === book.id}
                  />
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {/* Delete confirmation modal */}
      {confirmDelete && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
          onClick={() => setConfirmDelete(null)}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-bold text-xl text-[#1A1D23] mb-2">Delete this book?</h3>
            <p className="text-[#4B5563] mb-1 font-semibold">{confirmDelete.title}</p>
            <p className="text-sm text-[#4B5563] mb-6">
              This will permanently delete the book and all your annotations for it. This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 border border-[#D1D5DB] rounded-xl py-3 font-semibold text-[#4B5563] hover:bg-[#F3F4F6] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(confirmDelete)}
                disabled={deleting === confirmDelete.id}
                className="flex-1 bg-red-500 hover:bg-red-600 disabled:opacity-60 text-white rounded-xl py-3 font-bold transition-colors"
              >
                {deleting === confirmDelete.id ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  )
}

function ProgressCard({
  icon,
  label,
  value,
  detail,
  meterValue,
}: {
  icon: ReactNode
  label: string
  value: string
  detail: string
  meterValue?: number
}) {
  return (
    <div className="bg-white rounded-2xl border border-[#F3F4F6] shadow-sm p-4">
      <div className="flex items-center gap-2 text-[#4A90D9] mb-3">
        <span className="bg-blue-50 p-2 rounded-xl">{icon}</span>
        <span className="text-xs font-bold uppercase tracking-wide text-[#4B5563]">{label}</span>
      </div>
      <p className="text-3xl font-bold text-[#1A1D23] leading-none">{value}</p>
      <p className="text-xs text-[#4B5563] mt-2">{detail}</p>
      {meterValue !== undefined && (
        <div className="h-2 bg-[#E5E7EB] rounded-full mt-3 overflow-hidden">
          <div
            className="h-full bg-[#5BB974] rounded-full"
            style={{ width: `${meterValue}%` }}
          />
        </div>
      )}
    </div>
  )
}

function NextActionCard({ progress }: { progress: ReturnType<typeof buildStudentProgressSummary> }) {
  const destination = progress.nextBook ? `/student/read/${progress.nextBook.id}` : '/student/upload'

  return (
    <Link
      to={destination}
      className="bg-[#1A1D23] text-white rounded-2xl shadow-sm p-5 hover:bg-[#2A2F3A] transition-colors min-h-48 flex flex-col justify-between"
    >
      <div>
        <div className="flex items-center gap-2 text-[#F5C842] mb-3">
          <Sparkles size={20} />
          <span className="text-xs font-bold uppercase tracking-wide text-white/75">Next action</span>
        </div>
        <h4 className="text-xl font-bold mb-2">{progress.nextActionLabel}</h4>
        <p className="text-sm text-white/80 leading-relaxed">{progress.nextActionDetail}</p>
      </div>
      <span className="inline-flex items-center gap-2 text-sm font-bold mt-5">
        {progress.nextBook ? 'Open reader' : 'Upload book'} <ArrowRight size={16} />
      </span>
    </Link>
  )
}

function ReactionMixCard({
  reactionCounts,
  topReaction,
}: {
  reactionCounts: Record<ReactionType, number>
  topReaction: ReactionType | null
}) {
  const total = Object.values(reactionCounts).reduce((sum, count) => sum + count, 0)

  return (
    <div className="bg-white rounded-2xl border border-[#F3F4F6] shadow-sm p-5 min-h-48">
      <div className="flex items-center gap-2 mb-4">
        <span className="bg-purple-50 text-[#9B7FD4] p-2 rounded-xl">
          <TrendingUp size={20} />
        </span>
        <div>
          <h4 className="font-bold text-[#1A1D23]">Reaction Mix</h4>
          <p className="text-xs text-[#4B5563]">
            {topReaction ? `Most used: ${REACTIONS[topReaction].label}` : 'No reactions yet'}
          </p>
        </div>
      </div>
      <div className="space-y-3">
        {(Object.entries(REACTIONS) as [ReactionType, typeof REACTIONS[ReactionType]][]).map(([type, reaction]) => {
          const count = reactionCounts[type]
          const percent = total > 0 ? Math.round((count / total) * 100) : 0
          return (
            <div key={type}>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-semibold text-[#1A1D23]">{reaction.emoji} {reaction.label}</span>
                <span className="text-[#4B5563]">{count}</span>
              </div>
              <div className="h-2 bg-[#E5E7EB] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${percent}%`, backgroundColor: reaction.color }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function RecentActivityCard({
  annotations,
  bookTitleById,
}: {
  annotations: Annotation[]
  bookTitleById: Map<string, string>
}) {
  return (
    <div className="bg-white rounded-2xl border border-[#F3F4F6] shadow-sm p-5 min-h-48">
      <div className="flex items-center justify-between gap-2 mb-4">
        <div>
          <h4 className="font-bold text-[#1A1D23]">Recent Activity</h4>
          <p className="text-xs text-[#4B5563]">Latest annotations across your shelf</p>
        </div>
        <Link to="/student/annotations" className="text-[#4A90D9] hover:text-[#357ABD]" aria-label="View all annotations">
          <ArrowRight size={18} />
        </Link>
      </div>

      {annotations.length === 0 ? (
        <p className="text-sm text-[#4B5563] leading-relaxed">
          Your newest notes will appear here after you annotate a page.
        </p>
      ) : (
        <div className="space-y-3">
          {annotations.map((annotation) => {
            const reaction = REACTIONS[annotation.reactionType]
            return (
              <Link
                key={annotation.id}
                to={`/student/read/${annotation.bookId}`}
                className="flex items-start gap-3 rounded-xl hover:bg-[#F8F9FC] transition-colors"
              >
                <span className="text-2xl leading-none" aria-hidden="true">{reaction.emoji}</span>
                <span className="min-w-0">
                  <span className="block text-sm font-bold text-[#1A1D23] truncate">
                    {bookTitleById.get(annotation.bookId) ?? 'Unknown Book'}
                  </span>
                  <span className="block text-xs text-[#4B5563]">
                    Page {annotation.pageNumber} • {annotation.timestamp.toLocaleDateString()}
                  </span>
                </span>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

function BookCard({
  book,
  onDelete,
  deleting,
}: {
  book: Book
  onDelete?: () => void
  deleting?: boolean
}) {
  return (
    <div className="relative group bg-white rounded-2xl shadow-sm border border-[#F3F4F6] overflow-hidden hover:shadow-md hover:-translate-y-1 transition-all duration-200">
      <Link to={`/student/read/${book.id}`} className="block">
        <div className="h-40 bg-gradient-to-br from-[#4A90D9] to-[#9B7FD4] flex items-center justify-center">
          <BookOpen size={40} className="text-white opacity-70" />
        </div>
        <div className="p-3">
          <h4 className="font-bold text-[#1A1D23] text-sm leading-tight line-clamp-2">{book.title}</h4>
          <p className="text-xs text-[#4B5563] mt-1">{book.author}</p>
          {book.readingLevel && (
            <span className="inline-block mt-1.5 text-xs bg-blue-50 text-[#4A90D9] font-semibold px-2 py-0.5 rounded-full">
              {book.readingLevel}
            </span>
          )}
          {book.assignmentPrompt && (
            <p className="text-xs text-[#4B5563] mt-2 line-clamp-2">{book.assignmentPrompt}</p>
          )}
        </div>
      </Link>

      {/* Delete button: only shown on own books */}
      {onDelete && (
        <button
          onClick={onDelete}
          disabled={deleting}
          aria-label={`Delete ${book.title}`}
          className="absolute top-2 right-2 bg-white/90 hover:bg-red-50 text-[#9CA3AF] hover:text-red-500 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all shadow-sm disabled:opacity-50"
        >
          <Trash2 size={15} />
        </button>
      )}
    </div>
  )
}
