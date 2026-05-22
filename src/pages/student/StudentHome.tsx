import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import AppShell from '@/components/layout/AppShell'
import { getBooksByStudent, deleteStudentBook } from '@/firebase/books'
import type { Book } from '@/types'
import { BookOpen, MessageSquare, Plus, Trash2, AlertCircle } from 'lucide-react'

export default function StudentHome() {
  const { profile, loading: authLoading, error: authError } = useAuth()
  const [books, setBooks] = useState<Book[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [deleting, setDeleting] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<Book | null>(null)

  useEffect(() => {
    // Auth still resolving — wait
    if (authLoading) return

    // Auth resolved but errored (network failure, profile fetch threw, etc.)
    if (authError) {
      setError(`Authentication error: ${authError}`)
      setLoading(false)
      return
    }

    // Auth resolved but no user (logged out or session expired)
    if (!profile) {
      setError('You must be signed in to view your books.')
      setLoading(false)
      return
    }

    setLoading(true)
    getBooksByStudent(profile.uid)
      .then((b) => {
        setBooks(b)
        setLoading(false)
      })
      .catch((err: unknown) => {
        console.error('Failed to load books:', err)
        setError(err instanceof Error ? err.message : 'Could not load your books. Please try refreshing.')
        setLoading(false)
      })
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

  if (loading) return (
    <AppShell>
      <div className="mb-6">
        <div className="h-9 w-64 bg-[#E5E7EB] rounded-xl animate-pulse mb-2" />
        <div className="h-5 w-40 bg-[#E5E7EB] rounded-xl animate-pulse" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        <div className="h-20 bg-[#E5E7EB] rounded-2xl animate-pulse" />
        <div className="h-20 bg-[#E5E7EB] rounded-2xl animate-pulse" />
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

  if (error) return (
    <AppShell>
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertCircle size={44} className="text-red-400 mb-4" />
        <h3 className="text-xl font-bold text-[#1A1D23] mb-2">Couldn't load your books</h3>
        <p className="text-[#4B5563] max-w-sm mb-2">{error}</p>
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

  return (
    <AppShell>
      <div className="mb-6">
        <h2 className="text-3xl font-bold text-[#1A1D23]">
          Hello, {profile?.displayName}! ð
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
                {deleting === confirmDelete.id ? 'Deletingâ¦' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
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
        </div>
      </Link>

      {/* Delete button â only shown on own books */}
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
