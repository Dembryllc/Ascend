import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import AppShell from '@/components/layout/AppShell'
import { getAnnotationsByStudent, deleteAnnotation, updateAnnotation } from '@/firebase/annotations'
import { getBooksByStudent } from '@/firebase/books'
import type { Annotation, Book, ReactionType } from '@/types'
import { REACTIONS } from '@/types'
import { BookOpen, MessageSquare } from 'lucide-react'

export default function MyAnnotationsPage() {
  const { profile } = useAuth()
  const [annotations, setAnnotations] = useState<Annotation[]>([])
  const [books, setBooks] = useState<Book[]>([])
  const [filterBook, setFilterBook] = useState('')
  const [filterReaction, setFilterReaction] = useState<ReactionType | ''>('')
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [editing, setEditing] = useState<Annotation | null>(null)
  const [editNote, setEditNote] = useState('')
  const [editReaction, setEditReaction] = useState<ReactionType>('think')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  useEffect(() => {
    if (!profile) return
    Promise.all([
      getAnnotationsByStudent(profile.uid),
      getBooksByStudent(profile.uid),
    ]).then(([ann, bks]) => {
      setAnnotations(ann)
      setBooks(bks)
      setLoading(false)
    }).catch((err: unknown) => {
      console.error('Failed to load annotations:', err)
      setLoadError(err instanceof Error ? err.message : 'Could not load your annotations. Please refresh.')
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
    if (!editing || saving) return
    setSaving(true)
    setSaveError('')
    try {
      await updateAnnotation(editing.id, editReaction, editNote)
      setAnnotations((prev) =>
        prev.map((a) => a.id === editing.id ? { ...a, reactionType: editReaction, noteText: editNote } : a)
      )
      setEditing(null)
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : 'Could not save. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteAnnotation(id)
      setAnnotations((prev) => prev.filter((a) => a.id !== id))
      if (editing?.id === id) setEditing(null)
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : 'Could not delete. Please try again.')
    }
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

  if (loadError) return (
    <AppShell title="My Annotations">
      <div className="text-center py-16 bg-white rounded-2xl border border-[#F3F4F6]">
        <MessageSquare size={40} className="mx-auto text-[#D1D5DB] mb-4" />
        <h3 className="text-lg font-bold text-[#1A1D23] mb-2">Couldn't load annotations</h3>
        <p className="text-sm text-[#4B5563] mb-6">{loadError}</p>
        <button
          onClick={() => window.location.reload()}
          className="bg-[#4A90D9] text-white font-bold px-6 py-3 rounded-xl hover:bg-[#357ABD] transition-colors"
        >
          Try Again
        </button>
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

      {annotations.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-[#F3F4F6]">
          <div className="w-16 h-16 bg-purple-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <BookOpen size={32} className="text-[#9B7FD4]" />
          </div>
          <h3 className="text-xl font-bold text-[#1A1D23] mb-2">No annotations yet</h3>
          <p className="text-[#4B5563] mb-6 max-w-xs mx-auto">
            Open a book, select some text, and tap an emoji to leave your first reaction.
          </p>
          <Link
            to="/student"
            className="inline-flex items-center gap-2 bg-[#9B7FD4] text-white font-bold px-6 py-3 rounded-xl hover:bg-[#8A6EC3] transition-colors"
          >
            Go to my books
          </Link>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-[#F3F4F6]">
          <MessageSquare size={32} className="mx-auto text-[#D1D5DB] mb-3" />
          <h3 className="font-bold text-[#1A1D23] mb-1">No matches</h3>
          <p className="text-sm text-[#4B5563] mb-4">Try a different book or reaction filter.</p>
          <button
            onClick={() => { setFilterBook(''); setFilterReaction('') }}
            className="text-sm font-bold text-[#4A90D9] hover:text-[#357ABD]"
          >
            Clear filters
          </button>
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
                    {ann.annotationKind === 'reflection' && (
                      <p className="text-xs font-semibold text-[#5BB974] mb-2">Reflection</p>
                    )}
                    {ann.selectedText && ann.annotationKind !== 'reflection' && (
                      <p className="text-sm text-[#1A1D23] bg-yellow-50 border-l-4 border-yellow-300 rounded-r-lg px-3 py-2 mb-2">
                        “{ann.selectedText}”
                      </p>
                    )}
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
            {editing.annotationKind === 'reflection' && (
              <div className="bg-green-50 border border-green-100 text-[#1A1D23] rounded-xl px-4 py-3 text-sm font-semibold mb-4">
                Reflection
              </div>
            )}
            {editing.selectedText && editing.annotationKind !== 'reflection' && (
              <div className="bg-yellow-50 border-l-4 border-yellow-300 rounded-r-xl px-4 py-3 text-sm text-[#1A1D23] mb-4">
                “{editing.selectedText}”
              </div>
            )}
            <textarea
              value={editNote}
              onChange={(e) => setEditNote(e.target.value)}
              rows={3}
              maxLength={500}
              className="w-full border border-[#D1D5DB] rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-[#4A90D9] resize-none mb-4"
            />
            {saveError && <p className="text-sm text-red-600 mb-3">{saveError}</p>}
            <div className="flex gap-3">
              <button onClick={() => { setEditing(null); setSaveError('') }} className="flex-1 border border-[#D1D5DB] rounded-xl py-3 font-semibold text-[#4B5563] hover:bg-[#F3F4F6] transition-colors">Cancel</button>
              <button onClick={saveEdit} disabled={saving} className="flex-1 bg-[#4A90D9] text-white rounded-xl py-3 font-bold hover:bg-[#357ABD] disabled:opacity-60 transition-colors">{saving ? 'Saving…' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  )
}
