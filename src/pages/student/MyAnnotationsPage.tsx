import { useEffect, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import AppShell from '@/components/layout/AppShell'
import { getAnnotationsByStudent, deleteAnnotation, updateAnnotation } from '@/firebase/annotations'
import { getBooksByStudent } from '@/firebase/books'
import type { Annotation, Book, ReactionType } from '@/types'
import { REACTIONS } from '@/types'

export default function MyAnnotationsPage() {
  const { profile } = useAuth()
  const [annotations, setAnnotations] = useState<Annotation[]>([])
  const [books, setBooks] = useState<Book[]>([])
  const [filterBook, setFilterBook] = useState('')
  const [filterReaction, setFilterReaction] = useState<ReactionType | ''>('')
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Annotation | null>(null)
  const [editNote, setEditNote] = useState('')
  const [editReaction, setEditReaction] = useState<ReactionType>('think')

  useEffect(() => {
    if (!profile) return
    Promise.all([
      getAnnotationsByStudent(profile.uid),
      getBooksByStudent(profile.uid),
    ]).then(([ann, bks]) => {
      setAnnotations(ann)
      setBooks(bks)
      setLoading(false)
    })
  }, [profile])

  const filtered = annotations.filter((a) => {
    if (filterBook && a.bookId !== filterBook) return false
    if (filterReaction && a.reactionType !== filterReaction) return false
    return true
  })

  function startEdit(ann: Annotation) {
    setEditing(ann)
    setEditNote(ann.noteText)
    setEditReaction(ann.reactionType)
  }

  async function saveEdit() {
    if (!editing) return
    await updateAnnotation(editing.id, editReaction, editNote)
    setAnnotations((prev) =>
      prev.map((a) => a.id === editing.id ? { ...a, reactionType: editReaction, noteText: editNote } : a)
    )
    setEditing(null)
  }

  async function handleDelete(id: string) {
    await deleteAnnotation(id)
    setAnnotations((prev) => prev.filter((a) => a.id !== id))
    if (editing?.id === id) setEditing(null)
  }

  function bookTitle(bookId: string) {
    return books.find((b) => b.id === bookId)?.title ?? 'Unknown Book'
  }

  if (loading) return (
    <AppShell title="My Annotations">
      <div className="flex justify-center py-16">
        <div className="w-8 h-8 border-4 border-[#4A90D9] border-t-transparent rounded-full animate-spin" />
      </div>
    </AppShell>
  )

  return (
    <AppShell title="My Annotations">
      <h2 className="text-2xl font-bold text-[#1A1D23] mb-6">My Annotations</h2>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <select
          value={filterBook}
          onChange={(e) => setFilterBook(e.target.value)}
          className="flex-1 border border-[#D1D5DB] rounded-xl px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-[#4A90D9]"
        >
          <option value="">All books</option>
          {books.map((b) => <option key={b.id} value={b.id}>{b.title}</option>)}
        </select>

        <select
          value={filterReaction}
          onChange={(e) => setFilterReaction(e.target.value as ReactionType | '')}
          className="flex-1 border border-[#D1D5DB] rounded-xl px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-[#4A90D9]"
        >
          <option value="">All reactions</option>
          {(Object.entries(REACTIONS) as [ReactionType, typeof REACTIONS[ReactionType]][]).map(([type, r]) => (
            <option key={type} value={type}>{r.emoji} {r.label}</option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-[#F3F4F6]">
          <p className="text-[#4B5563]">No annotations yet. Start reading and leave some notes!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((ann) => {
            const r = REACTIONS[ann.reactionType]
            return (
              <div key={ann.id} className="bg-white rounded-2xl p-5 shadow-sm border border-[#F3F4F6]">
                <div className="flex items-start gap-3">
                  <span className="text-3xl" aria-hidden="true">{r.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between flex-wrap gap-1 mb-1">
                      <span className="font-bold text-[#1A1D23] text-sm">{r.label}</span>
                      <span className="text-xs text-[#9CA3AF]">
                        {ann.timestamp.toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-xs text-[#4A90D9] font-semibold mb-1">
                      {bookTitle(ann.bookId)} • Page {ann.pageNumber}
                    </p>
                    {ann.noteText && <p className="text-base text-[#1A1D23]">{ann.noteText}</p>}
                    <div className="flex gap-3 mt-2">
                      <button onClick={() => startEdit(ann)} className="text-xs text-[#4A90D9] hover:underline">Edit</button>
                      <button onClick={() => handleDelete(ann.id)} className="text-xs text-red-500 hover:underline">Delete</button>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Edit modal */}
      {editing && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-4" onClick={() => setEditing(null)}>
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold text-xl text-[#1A1D23] mb-4">Edit Annotation</h3>
            <div className="grid grid-cols-5 gap-2 mb-4">
              {(Object.entries(REACTIONS) as [ReactionType, typeof REACTIONS[ReactionType]][]).map(([type, r]) => (
                <button
                  key={type}
                  onClick={() => setEditReaction(type)}
                  aria-pressed={editReaction === type}
                  className={`flex flex-col items-center gap-1 p-2 rounded-xl border-2 transition-all ${
                    editReaction === type ? 'border-[#4A90D9] bg-blue-50' : 'border-transparent'
                  }`}
                >
                  <span className="text-2xl">{r.emoji}</span>
                  <span className="text-xs text-center leading-tight">{r.label}</span>
                </button>
              ))}
            </div>
            <textarea
              value={editNote}
              onChange={(e) => setEditNote(e.target.value)}
              rows={3}
              maxLength={500}
              className="w-full border border-[#D1D5DB] rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-[#4A90D9] resize-none mb-4"
            />
            <div className="flex gap-3">
              <button onClick={() => setEditing(null)} className="flex-1 border border-[#D1D5DB] rounded-xl py-3 font-semibold text-[#4B5563] hover:bg-[#F3F4F6] transition-colors">Cancel</button>
              <button onClick={saveEdit} className="flex-1 bg-[#4A90D9] text-white rounded-xl py-3 font-bold hover:bg-[#357ABD] transition-colors">Save</button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  )
}
