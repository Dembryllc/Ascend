import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import AppShell from '@/components/layout/AppShell'
import { getBooksByStudent } from '@/firebase/books'
import type { Book } from '@/types'
import { BookOpen, MessageSquare } from 'lucide-react'

export default function StudentHome() {
  const { profile } = useAuth()
  const [books, setBooks] = useState<Book[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profile) return
    getBooksByStudent(profile.uid).then((b) => {
      setBooks(b)
      setLoading(false)
    })
  }, [profile])

  if (loading) return (
    <AppShell>
      <div className="flex justify-center py-16">
        <div className="w-8 h-8 border-4 border-[#4A90D9] border-t-transparent rounded-full animate-spin" />
      </div>
    </AppShell>
  )

  return (
    <AppShell>
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-[#1A1D23]">
          Hello, {profile?.displayName}! 👋
        </h2>
        <p className="text-[#4B5563] text-lg mt-1">Here are your books. Happy reading!</p>
      </div>

      {/* My Annotations shortcut */}
      <Link
        to="/student/annotations"
        className="flex items-center gap-3 bg-[#9B7FD4] text-white rounded-2xl px-5 py-4 mb-8 hover:bg-[#8A6EC3] transition-colors"
      >
        <MessageSquare size={22} />
        <div>
          <p className="font-bold text-base">My Annotations</p>
          <p className="text-sm opacity-90">See all your reading notes</p>
        </div>
      </Link>

      {books.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-[#F3F4F6]">
          <BookOpen size={48} className="mx-auto text-[#D1D5DB] mb-4" />
          <h3 className="text-xl font-bold text-[#1A1D23] mb-2">No books yet!</h3>
          <p className="text-[#4B5563]">Your teacher hasn't assigned any books yet. Check back soon!</p>
        </div>
      ) : (
        <>
          <h3 className="text-lg font-bold text-[#1A1D23] mb-4">Your Books</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {books.map((book) => (
              <Link
                key={book.id}
                to={`/student/read/${book.id}`}
                className="bg-white rounded-2xl shadow-sm border border-[#F3F4F6] overflow-hidden hover:shadow-md hover:-translate-y-1 transition-all duration-200 group"
              >
                {/* Cover */}
                <div className="h-40 bg-gradient-to-br from-[#4A90D9] to-[#9B7FD4] flex items-center justify-center group-hover:opacity-90 transition-opacity">
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
            ))}
          </div>
        </>
      )}
    </AppShell>
  )
}
