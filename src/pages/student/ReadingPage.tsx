import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'
import { useAuth } from '@/context/AuthContext'
import { getBook } from '@/firebase/books'
import { getAnnotationsByStudentAndBook, saveAnnotation, updateAnnotation, deleteAnnotation } from '@/firebase/annotations'
import type { Book, Annotation, ReactionType } from '@/types'
import { REACTIONS } from '@/types'
import { ChevronLeft, ChevronRight, Volume2, ArrowLeft } from 'lucide-react'

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString()

export default function ReadingPage() {
  const { bookId } = useParams<{ bookId: string }>()
  const navigate = useNavigate()
  const { profile } = useAuth()

  const [book, setBook] = useState<Book | null>(null)
  const [numPages, setNumPages] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [annotations, setAnnotations] = useState<Annotation[]>([])
  const [pageAnnotations, setPageAnnotations] = useState<Annotation[]>([])
  const [annotationPanel, setAnnotationPanel] = useState<{ open: boolean; editing?: Annotation }>({ open: false })
  const [selectedReaction, setSelectedReaction] = useState<ReactionType>('think')
  const [noteText, setNoteText] = useState('')
  const [saving, setSaving] = useState(false)
  const [containerWidth, setContainerWidth] = useState(700)
  const [loadingBook, setLoadingBook] = useState(true)
  const [readerError, setReaderError] = useState('')

  useEffect(() => {
    if (!bookId) {
      setReaderError('Missing book id.')
      setLoadingBook(false)
      return
    }
    if (!profile) return
    setLoadingBook(true)
    setReaderError('')
    Promise.all([
      getBook(bookId),
      getAnnotationsByStudentAndBook(profile.uid, bookId),
    ]).then(([b, ann]) => {
      if (!b) {
        setReaderError('This book could not be found. It may have been deleted or not assigned to you.')
      }
      setBook(b)
      setAnnotations(ann)
      setLoadingBook(false)
    }).catch((err: unknown) => {
      console.error('Failed to open book:', err)
      setReaderError(err instanceof Error ? err.message : 'Could not open this book. Please try again.')
      setLoadingBook(false)
    })
  }, [bookId, profile])

  useEffect(() => {
    setPageAnnotations(annotations.filter((a) => a.pageNumber === currentPage))
  }, [annotations, currentPage])

  // Responsive PDF width
  useEffect(() => {
    function measure() {
      const el = document.getElementById('pdf-container')
      if (el) setContainerWidth(Math.min(el.clientWidth - 32, 900))
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [])

  function onDocumentLoaded({ numPages }: { numPages: number }) {
    setNumPages(numPages)
    setReaderError('')
  }

  function onDocumentLoadError(err: Error) {
    console.error('Failed to render PDF:', err)
    setReaderError('The PDF uploaded, but the reader could not open it. This can happen if the file is scanned, blocked by storage permissions, or not a valid PDF.')
  }

  function openAnnotationPanel(editing?: Annotation) {
    if (editing) {
      setSelectedReaction(editing.reactionType)
      setNoteText(editing.noteText)
      setAnnotationPanel({ open: true, editing })
    } else {
      setSelectedReaction('think')
      setNoteText('')
      setAnnotationPanel({ open: true })
    }
  }

  function closePanel() {
    setAnnotationPanel({ open: false })
  }

  async function handleSave() {
    if (!profile || !bookId) return
    setSaving(true)
    try {
      if (annotationPanel.editing) {
        await updateAnnotation(annotationPanel.editing.id, selectedReaction, noteText)
        setAnnotations((prev) =>
          prev.map((a) =>
            a.id === annotationPanel.editing!.id
              ? { ...a, reactionType: selectedReaction, noteText, timestamp: new Date() }
              : a
          )
        )
      } else {
        const ann = await saveAnnotation(profile.uid, bookId, currentPage, selectedReaction, noteText)
        setAnnotations((prev) => [...prev, ann])
      }
      closePanel()
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(annotationId: string) {
    await deleteAnnotation(annotationId)
    setAnnotations((prev) => prev.filter((a) => a.id !== annotationId))
    closePanel()
  }

  const speakPage = useCallback(() => {
    if (!window.speechSynthesis) return
    window.speechSynthesis.cancel()
    const textLayer = document.querySelector('.react-pdf__Page__textContent')
    const text = textLayer?.textContent ?? `Page ${currentPage}`
    const utt = new SpeechSynthesisUtterance(text)
    utt.rate = 0.9
    window.speechSynthesis.speak(utt)
  }, [currentPage])

  if (loadingBook) return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8F9FC]">
      <div className="text-center">
        <div className="w-8 h-8 border-4 border-[#4A90D9] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-sm font-semibold text-[#4B5563]">Opening book…</p>
      </div>
    </div>
  )

  if (readerError || !book) return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8F9FC] p-4">
      <div className="bg-white rounded-2xl border border-[#F3F4F6] shadow-sm max-w-md w-full p-6 text-center">
        <h2 className="text-xl font-bold text-[#1A1D23] mb-2">We couldn&apos;t open this book</h2>
        <p className="text-[#4B5563] text-sm mb-6">{readerError || 'The book was not found.'}</p>
        <button
          onClick={() => navigate('/student')}
          className="bg-[#4A90D9] text-white font-bold px-5 py-3 rounded-xl hover:bg-[#357ABD] transition-colors"
        >
          Back to Bookshelf
        </button>
      </div>
    </div>
  )

  const hasAnnotationOnPage = pageAnnotations.length > 0
  const annotatedPages = new Set(annotations.map((a) => a.pageNumber))

  return (
    <div className="min-h-screen bg-[#F8F9FC] flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-[#E5E7EB] sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <button onClick={() => navigate('/student')} aria-label="Back to home" className="flex items-center gap-1 text-[#4B5563] hover:text-[#1A1D23] transition-colors">
            <ArrowLeft size={20} />
            <span className="text-sm font-medium hidden sm:inline">My Books</span>
          </button>
          <div className="text-center flex-1 min-w-0">
            <p className="font-bold text-[#1A1D23] text-sm truncate">{book.title}</p>
            <p className="text-xs text-[#4B5563]">{book.author}</p>
          </div>
          <button onClick={speakPage} aria-label="Read page aloud" className="flex items-center gap-1 text-[#4A90D9] hover:text-[#357ABD] transition-colors px-2 py-1 rounded-lg hover:bg-blue-50">
            <Volume2 size={20} />
            <span className="text-xs font-medium hidden sm:inline">Read aloud</span>
          </button>
        </div>
      </header>

      <div id="pdf-container" className="flex-1 flex flex-col items-center px-4 py-4 max-w-4xl mx-auto w-full">
        {/* PDF */}
        <div className="flex-1 w-full flex justify-center">
          <Document
            file={book.storageUrl}
            onLoadSuccess={onDocumentLoaded}
            onLoadError={onDocumentLoadError}
            error={
              <div className="bg-white rounded-2xl border border-red-100 p-6 text-center text-red-700">
                This PDF could not be rendered. Try re-uploading it or using a different PDF.
              </div>
            }
            loading={<div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-[#4A90D9] border-t-transparent rounded-full animate-spin" /></div>}
          >
            <Page
              pageNumber={currentPage}
              width={containerWidth}
              renderTextLayer
              renderAnnotationLayer={false}
            />
          </Document>
        </div>

        {/* Page navigation */}
        <div className="w-full mt-4 flex items-center justify-between bg-white rounded-2xl px-4 py-3 shadow-sm border border-[#F3F4F6]">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage <= 1}
            aria-label="Previous page"
            className="flex items-center gap-1.5 px-4 py-2.5 bg-[#F3F4F6] rounded-xl font-semibold text-[#1A1D23] hover:bg-[#E5E7EB] disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-base"
          >
            <ChevronLeft size={20} /> Prev
          </button>

          <div className="text-center">
            <span className="font-bold text-[#1A1D23]">{currentPage}</span>
            <span className="text-[#4B5563]"> / {numPages}</span>
            {annotatedPages.has(currentPage) && (
              <div className="text-xs text-[#9B7FD4] font-semibold mt-0.5">📝 You annotated this page</div>
            )}
          </div>

          <button
            onClick={() => setCurrentPage((p) => Math.min(numPages, p + 1))}
            disabled={currentPage >= numPages}
            aria-label="Next page"
            className="flex items-center gap-1.5 px-4 py-2.5 bg-[#F3F4F6] rounded-xl font-semibold text-[#1A1D23] hover:bg-[#E5E7EB] disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-base"
          >
            Next <ChevronRight size={20} />
          </button>
        </div>

        {/* Annotation toolbar */}
        <div className="w-full mt-4 bg-white rounded-2xl shadow-sm border border-[#F3F4F6] p-4">
          <p className="text-sm font-bold text-[#1A1D23] mb-3">How does this page make you feel?</p>
          <div className="grid grid-cols-5 gap-2">
            {(Object.entries(REACTIONS) as [ReactionType, typeof REACTIONS[ReactionType]][]).map(([type, r]) => (
              <button
                key={type}
                onClick={() => openAnnotationPanel()}
                aria-label={r.label}
                className="flex flex-col items-center gap-1 p-2 rounded-xl border-2 border-transparent hover:border-[#4A90D9] hover:bg-blue-50 transition-all"
              >
                <span className="text-2xl sm:text-3xl">{r.emoji}</span>
                <span className="text-xs text-[#4B5563] font-medium text-center leading-tight hidden sm:block">{r.label}</span>
              </button>
            ))}
          </div>

          {/* Existing page annotations */}
          {hasAnnotationOnPage && (
            <div className="mt-4 pt-4 border-t border-[#F3F4F6]">
              <p className="text-xs font-bold text-[#4B5563] uppercase tracking-wide mb-2">Your notes on this page</p>
              <div className="space-y-2">
                {pageAnnotations.map((ann) => {
                  const r = REACTIONS[ann.reactionType]
                  return (
                    <div key={ann.id} className="flex items-start gap-2 bg-[#F8F9FC] rounded-xl p-3">
                      <span className="text-xl">{r.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-[#4B5563]">{r.label}</p>
                        {ann.noteText && <p className="text-sm text-[#1A1D23] mt-0.5">{ann.noteText}</p>}
                      </div>
                      <button
                        onClick={() => openAnnotationPanel(ann)}
                        className="text-xs text-[#4A90D9] hover:underline shrink-0"
                      >
                        Edit
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Annotation panel modal */}
      {annotationPanel.open && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-4" onClick={closePanel}>
          <div
            className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-bold text-xl text-[#1A1D23] mb-4">
              {annotationPanel.editing ? 'Edit Annotation' : 'Add Annotation'} — Page {currentPage}
            </h3>

            {/* Reaction selector */}
            <div className="grid grid-cols-5 gap-2 mb-5">
              {(Object.entries(REACTIONS) as [ReactionType, typeof REACTIONS[ReactionType]][]).map(([type, r]) => (
                <button
                  key={type}
                  onClick={() => setSelectedReaction(type)}
                  aria-label={r.label}
                  aria-pressed={selectedReaction === type}
                  className={`flex flex-col items-center gap-1 p-2 rounded-xl border-2 transition-all ${
                    selectedReaction === type
                      ? 'border-[#4A90D9] bg-blue-50 scale-105'
                      : 'border-transparent hover:border-[#E5E7EB]'
                  }`}
                >
                  <span className="text-2xl">{r.emoji}</span>
                  <span className="text-xs text-[#4B5563] text-center leading-tight">{r.label}</span>
                </button>
              ))}
            </div>

            {/* Note text */}
            <div className="mb-5">
              <label className="block text-sm font-semibold text-[#1A1D23] mb-1">
                Add a note <span className="text-[#9CA3AF] font-normal">(optional)</span>
              </label>
              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                rows={3}
                maxLength={500}
                placeholder="Write a short note… (2–3 sentences is perfect)"
                className="w-full border border-[#D1D5DB] rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-[#4A90D9] resize-none"
              />
            </div>

            <div className="flex gap-3">
              {annotationPanel.editing && (
                <button
                  onClick={() => handleDelete(annotationPanel.editing!.id)}
                  className="px-4 py-3 text-red-600 border border-red-200 rounded-xl font-semibold hover:bg-red-50 transition-colors"
                >
                  Delete
                </button>
              )}
              <button onClick={closePanel} className="flex-1 px-4 py-3 border border-[#D1D5DB] rounded-xl font-semibold text-[#4B5563] hover:bg-[#F3F4F6] transition-colors">
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 bg-[#4A90D9] text-white px-4 py-3 rounded-xl font-bold hover:bg-[#357ABD] disabled:opacity-60 transition-colors"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
