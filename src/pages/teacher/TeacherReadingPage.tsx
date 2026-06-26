import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'
import { useAuth } from '@/context/auth-context'
import { getBook, setTeacherPromptsEnabled } from '@/firebase/books'
import {
  saveTeacherAnnotation,
  updateAnnotation,
  deleteAnnotation,
  getTeacherPromptAnnotations,
} from '@/firebase/annotations'
import type { Book, Annotation, ReactionType } from '@/types'
import { REACTIONS } from '@/types'
import {
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  MessageSquare,
  Share2,
  Users,
  LayoutGrid,
} from 'lucide-react'
import OrganizerModal from '@/components/student/OrganizerModal'

pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.mjs'

const HIGHLIGHT_STOP_WORDS = new Set(['and', 'are', 'for', 'not', 'that', 'the', 'this', 'was', 'with'])

type PdfDocument = {
  numPages: number
}

export default function TeacherReadingPage() {
  const { bookId } = useParams<{ bookId: string }>()
  const navigate = useNavigate()
  const { profile } = useAuth()

  const [book, setBook] = useState<Book | null>(null)
  const [numPages, setNumPages] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [annotations, setAnnotations] = useState<Annotation[]>([])
  const [annotationPanel, setAnnotationPanel] = useState<{ open: boolean; editing?: Annotation }>({ open: false })
  const [selectedReaction, setSelectedReaction] = useState<ReactionType>('think')
  const [selectedText, setSelectedText] = useState('')
  const [noteText, setNoteText] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [containerWidth, setContainerWidth] = useState(700)
  const [loadingBook, setLoadingBook] = useState(true)
  const [readerError, setReaderError] = useState('')
  const [capturedSelection, setCapturedSelection] = useState('')
  const [floatingBar, setFloatingBar] = useState<{ x: number; y: number } | null>(null)
  const [sharingEnabled, setSharingEnabled] = useState(false)
  const [sharingToggling, setSharingToggling] = useState(false)
  const [organizerOpen, setOrganizerOpen] = useState(false)
  const highlightRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!bookId || !profile) return
    Promise.all([
      getBook(bookId),
      getTeacherPromptAnnotations(bookId),
    ]).then(([b, ann]) => {
      if (!b) {
        setReaderError('This book could not be found.')
        setLoadingBook(false)
        return
      }
      if (b.uploadedBy !== profile.uid) {
        setReaderError('You can only annotate books you uploaded.')
        setLoadingBook(false)
        return
      }
      setBook(b)
      setSharingEnabled(b.teacherPromptsEnabled ?? false)
      setAnnotations(ann)
      setLoadingBook(false)
    }).catch((err: unknown) => {
      setReaderError(err instanceof Error ? err.message : 'Could not open this book.')
      setLoadingBook(false)
    })
  }, [bookId, profile])

  const pageAnnotations = useMemo(
    () => annotations.filter((a) => a.pageNumber === currentPage),
    [annotations, currentPage],
  )

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const spans = Array.from(document.querySelectorAll<HTMLElement>('.react-pdf__Page__textContent span'))
      spans.forEach((span) => {
        span.style.backgroundColor = ''
        span.style.borderRadius = ''
        span.style.boxShadow = ''
      })
      const quotes = pageAnnotations
        .map((ann) => ann.selectedText?.replace(/\s+/g, ' ').trim().toLowerCase())
        .filter((q): q is string => Boolean(q && q.length > 0))
      if (quotes.length === 0) return
      spans.forEach((span) => {
        const spanText = span.textContent?.replace(/\s+/g, ' ').trim().toLowerCase()
        if (!spanText || spanText.length < 4 || HIGHLIGHT_STOP_WORDS.has(spanText)) return
        if (quotes.some((q) => q.includes(spanText) || spanText.includes(q))) {
          span.style.backgroundColor = 'rgba(155, 127, 212, 0.35)'
          span.style.borderRadius = '3px'
          span.style.boxShadow = '0 0 0 2px rgba(155, 127, 212, 0.2)'
        }
      })
    }, 150)
    return () => window.clearTimeout(timer)
  }, [pageAnnotations, currentPage])

  useEffect(() => {
    function measure() {
      const el = document.getElementById('pdf-main-column')
      if (el) setContainerWidth(Math.min(el.clientWidth - 32, 900))
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [])

  useEffect(() => {
    function onSelectionChange() {
      const sel = window.getSelection()
      const text = sel?.toString().replace(/\s+/g, ' ').trim() ?? ''
      if (!text) return
      const container = document.getElementById('pdf-container')
      if (!container || !sel || sel.rangeCount === 0) return
      const range = sel.getRangeAt(0)
      if (!container.contains(range.startContainer)) return
      setCapturedSelection(text)
      const rect = range.getBoundingClientRect()
      setFloatingBar({ x: rect.left + rect.width / 2, y: rect.top })
    }
    document.addEventListener('selectionchange', onSelectionChange)
    return () => document.removeEventListener('selectionchange', onSelectionChange)
  }, [])

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      setCapturedSelection('')
      setFloatingBar(null)
      setAnnotationPanel({ open: false })
      setSaveError('')
      if (highlightRef.current) {
        highlightRef.current.style.backgroundColor = ''
        highlightRef.current.style.borderRadius = ''
        highlightRef.current = null
      }
    })
    return () => cancelAnimationFrame(id)
  }, [currentPage])

  useEffect(() => {
    if (!annotationPanel.open) return
    function onKeyDown(e: KeyboardEvent) { if (e.key === 'Escape') closePanel() }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [annotationPanel.open])

  function closePanel() {
    setAnnotationPanel({ open: false })
    setCapturedSelection('')
    setFloatingBar(null)
    setSaveError('')
  }

  function openAnnotationPanel(reactionType?: ReactionType, editing?: Annotation, textOverride?: string) {
    if (editing) {
      setSelectedReaction(editing.reactionType)
      setSelectedText(editing.selectedText ?? '')
      setNoteText(editing.noteText)
      setAnnotationPanel({ open: true, editing })
    } else {
      setSelectedReaction(reactionType ?? 'think')
      const captured = textOverride !== undefined ? textOverride : capturedSelection
      setSelectedText(captured)
      setNoteText('')
      setAnnotationPanel({ open: true })
    }
  }

  async function handleSave() {
    if (!profile || !bookId) return
    setSaving(true)
    setSaveError('')
    try {
      if (annotationPanel.editing) {
        await updateAnnotation(annotationPanel.editing.id, selectedReaction, noteText, selectedText)
        setAnnotations((prev) =>
          prev.map((a) =>
            a.id === annotationPanel.editing!.id
              ? { ...a, reactionType: selectedReaction, noteText, selectedText, timestamp: new Date() }
              : a,
          ),
        )
      } else {
        const ann = await saveTeacherAnnotation(profile.uid, bookId, currentPage, selectedReaction, noteText, selectedText)
        setAnnotations((prev) => [...prev, ann])
      }
      closePanel()
    } catch {
      setSaveError('Could not save. Check your connection and try again.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(annotationId: string) {
    try {
      await deleteAnnotation(annotationId)
      setAnnotations((prev) => prev.filter((a) => a.id !== annotationId))
      closePanel()
    } catch {
      setSaveError('Could not delete. Check your connection and try again.')
    }
  }

  const toggleSharing = useCallback(async () => {
    if (!bookId || sharingToggling) return
    setSharingToggling(true)
    const next = !sharingEnabled
    try {
      await setTeacherPromptsEnabled(bookId, next)
      setSharingEnabled(next)
      setBook((prev) => prev ? { ...prev, teacherPromptsEnabled: next } : prev)
    } catch {
      // revert on failure — no UI error needed, state unchanged
    } finally {
      setSharingToggling(false)
    }
  }, [bookId, sharingEnabled, sharingToggling])

  if (!bookId) return null

  if (loadingBook) return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8F9FC]">
      <div className="text-center">
        <div className="w-8 h-8 border-4 border-[#9B7FD4] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-sm font-semibold text-[#4B5563]">Opening book…</p>
      </div>
    </div>
  )

  if (readerError || !book) return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8F9FC] p-4">
      <div className="bg-white rounded-2xl border border-[#F3F4F6] shadow-sm max-w-md w-full p-6 text-center">
        <h2 className="text-xl font-bold text-[#1A1D23] mb-2">Could not open this book</h2>
        <p className="text-[#4B5563] text-sm mb-6">{readerError || 'The book was not found.'}</p>
        <button
          onClick={() => navigate('/teacher')}
          className="bg-[#9B7FD4] text-white font-bold px-5 py-3 rounded-xl hover:bg-[#8A6EC3] transition-colors"
        >
          Back to Dashboard
        </button>
      </div>
    </div>
  )

  const annotatedPages = new Set(annotations.map((a) => a.pageNumber))

  return (
    <div className="min-h-screen bg-[#F8F9FC] flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-[#E5E7EB] sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <button
            onClick={() => navigate('/teacher')}
            aria-label="Back to dashboard"
            className="flex items-center gap-1 text-[#4B5563] hover:text-[#1A1D23] transition-colors"
          >
            <ArrowLeft size={20} />
            <span className="text-sm font-medium hidden sm:inline">Dashboard</span>
          </button>

          <div className="text-center flex-1 min-w-0">
            <p className="font-bold text-[#1A1D23] text-sm truncate">{book.title}</p>
            <p className="text-xs text-[#9B7FD4] font-semibold">Teacher Annotation Mode</p>
          </div>

          <div className="flex items-center gap-2">
            {/* Organizer example button */}
            {book.organizerTemplateId && (
              <button
                onClick={() => setOrganizerOpen(true)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl font-semibold text-sm bg-[#F3F4F6] text-[#4B5563] hover:bg-[#E5E7EB] transition-colors"
                title="Fill out a model organizer for students"
              >
                <LayoutGrid size={16} />
                <span className="hidden sm:inline">Organizer</span>
              </button>
            )}

            {/* Share toggle */}
            <button
              onClick={toggleSharing}
              disabled={sharingToggling}
              aria-pressed={sharingEnabled}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl font-semibold text-sm transition-colors ${
                sharingEnabled
                  ? 'bg-[#9B7FD4] text-white hover:bg-[#8A6EC3]'
                  : 'bg-[#F3F4F6] text-[#4B5563] hover:bg-[#E5E7EB]'
              } disabled:opacity-60`}
            >
              <Share2 size={16} />
              <span className="hidden sm:inline">{sharingEnabled ? 'Shared' : 'Share'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Sharing status banner */}
      {sharingEnabled && (
        <div className="bg-[#9B7FD4]/10 border-b border-[#9B7FD4]/20 px-4 py-2 text-center">
          <p className="text-sm font-semibold text-[#9B7FD4] flex items-center justify-center gap-2">
            <Users size={14} />
            Your annotations are visible to assigned students as reading prompts
          </p>
        </div>
      )}

      <div id="pdf-container" className="flex-1 px-3 sm:px-4 py-4 max-w-7xl mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px] gap-4 items-start">
          <main id="pdf-main-column" className="min-w-0">
            {/* Teacher prompt banner */}
            <section className="w-full mb-4 bg-purple-50 rounded-2xl border border-purple-200 p-4">
              <p className="text-sm font-bold text-[#9B7FD4]">Annotating as Teacher</p>
              <p className="text-xs text-[#4B5563] mt-1">
                Select text, then tap a reaction below to add a model annotation. When you're ready,
                toggle <strong>Share</strong> in the header to make them visible to students.
              </p>
            </section>

            {/* PDF */}
            <div className="flex-1 w-full flex justify-center">
              <Document
                file={book.storageUrl}
                onLoadSuccess={(pdf: unknown) => {
                  const p = pdf as PdfDocument
                  if (!p.numPages || p.numPages < 1) {
                    setReaderError('This PDF appears to be empty or corrupt.')
                    return
                  }
                  setNumPages(p.numPages)
                }}
                onLoadError={(err: Error) => setReaderError(`PDF error: ${err.message}`)}
                error={
                  <div className="bg-white rounded-2xl border border-red-100 p-6 text-center text-red-700">
                    This PDF could not be rendered.
                  </div>
                }
                loading={
                  <div className="flex justify-center py-20">
                    <div className="w-8 h-8 border-4 border-[#9B7FD4] border-t-transparent rounded-full animate-spin" />
                  </div>
                }
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
                className="flex items-center gap-1.5 px-4 py-2.5 min-h-[44px] bg-[#F3F4F6] rounded-xl font-semibold text-[#1A1D23] hover:bg-[#E5E7EB] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={20} /> Prev
              </button>

              <div className="text-center">
                <span className="font-bold text-[#1A1D23]">{currentPage}</span>
                <span className="text-[#4B5563]"> / {numPages || '…'}</span>
                {annotatedPages.has(currentPage) && (
                  <div className="text-xs text-[#9B7FD4] font-semibold mt-0.5">📝 You annotated this page</div>
                )}
              </div>

              <button
                onClick={() => setCurrentPage((p) => Math.min(numPages, p + 1))}
                disabled={currentPage >= numPages}
                aria-label="Next page"
                className="flex items-center gap-1.5 px-4 py-2.5 min-h-[44px] bg-[#F3F4F6] rounded-xl font-semibold text-[#1A1D23] hover:bg-[#E5E7EB] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Next <ChevronRight size={20} />
              </button>
            </div>

            {/* Annotation toolbar */}
            <div className="w-full mt-4 bg-white rounded-2xl shadow-sm border border-[#F3F4F6] p-4">
              <p className="text-sm font-bold text-[#1A1D23] mb-1">Add a model annotation</p>
              <p className="text-xs text-[#6B7280] mb-3">Select text above, then choose a reaction — or tap a reaction without selecting to annotate the whole page.</p>
              <div className="grid grid-cols-5 gap-2">
                {(Object.entries(REACTIONS) as [ReactionType, typeof REACTIONS[ReactionType]][]).map(([type, r]) => (
                  <button
                    key={type}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => openAnnotationPanel(type)}
                    aria-label={r.label}
                    className="flex flex-col items-center gap-1 p-2 rounded-xl border-2 border-transparent hover:border-[#9B7FD4] hover:bg-purple-50 transition-all"
                  >
                    <span className="text-2xl sm:text-3xl">{r.emoji}</span>
                    <span className="text-xs text-[#4B5563] font-medium text-center leading-tight hidden sm:block">{r.label}</span>
                  </button>
                ))}
              </div>

              {pageAnnotations.length > 0 && (
                <div className="mt-4 pt-4 border-t border-[#F3F4F6]">
                  <p className="text-xs font-bold text-[#4B5563] uppercase tracking-wide mb-2">Your model annotations on this page</p>
                  <div className="space-y-2">
                    {pageAnnotations.map((ann) => {
                      const r = REACTIONS[ann.reactionType]
                      return (
                        <div key={ann.id} className="flex items-start gap-2 bg-purple-50 rounded-xl p-3 border border-purple-100">
                          <span className="text-xl">{r.emoji}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-[#9B7FD4]">{r.label}</p>
                            {ann.selectedText && (
                              <p className="text-sm text-[#1A1D23] mt-1 bg-white border-l-4 border-purple-300 rounded-r-lg px-3 py-2">
                                &quot;{ann.selectedText}&quot;
                              </p>
                            )}
                            {ann.noteText
                              ? <p className="text-sm text-[#1A1D23] mt-1">{ann.noteText}</p>
                              : <p className="text-xs text-[#9CA3AF] italic mt-1">No note — tap Edit to add one</p>
                            }
                          </div>
                          <button
                            onClick={() => openAnnotationPanel(undefined, ann)}
                            className="text-xs text-[#9B7FD4] hover:underline shrink-0"
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
          </main>

          {/* Sidebar */}
          <aside className="lg:sticky lg:top-20 space-y-4">
            <section className="bg-white rounded-2xl shadow-sm border border-[#F3F4F6] p-4">
              <div className="flex items-center gap-2 mb-3">
                <MessageSquare size={18} className="text-[#9B7FD4]" />
                <h3 className="font-bold text-[#1A1D23]">Model Annotations</h3>
              </div>
              <div className="grid grid-cols-2 gap-2 mb-4">
                <MiniStat label="Total" value={annotations.length} />
                <MiniStat label="Pages" value={annotatedPages.size} />
              </div>

              {/* Share toggle in sidebar */}
              <div className="mb-4 p-3 rounded-xl border border-[#E5E7EB] bg-[#F8F9FC]">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-[#1A1D23]">Share with students</p>
                    <p className="text-[11px] text-[#6B7280] mt-0.5">
                      {sharingEnabled
                        ? 'Students see these as model annotations'
                        : 'Currently private — only you can see these'}
                    </p>
                  </div>
                  <button
                    onClick={toggleSharing}
                    disabled={sharingToggling}
                    aria-pressed={sharingEnabled}
                    className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none disabled:opacity-60 ${
                      sharingEnabled ? 'bg-[#9B7FD4]' : 'bg-[#D1D5DB]'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                        sharingEnabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {annotations.length === 0 ? (
                <p className="text-sm text-[#6B7280]">Select text on a page and choose a reaction to add your first model annotation.</p>
              ) : (
                <div className="space-y-2 max-h-[42vh] overflow-y-auto pr-1">
                  {annotations
                    .slice()
                    .sort((a, b) => a.pageNumber - b.pageNumber || a.timestamp.getTime() - b.timestamp.getTime())
                    .map((ann) => {
                      const r = REACTIONS[ann.reactionType]
                      return (
                        <button
                          key={ann.id}
                          onClick={() => {
                            setCurrentPage(Math.max(1, ann.pageNumber))
                            openAnnotationPanel(undefined, ann)
                          }}
                          className="w-full text-left bg-purple-50 hover:bg-purple-100 border border-purple-100 rounded-xl p-3 transition-colors"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-bold text-[#1A1D23]">{r.emoji} Page {ann.pageNumber}</span>
                            <span className="text-[11px] text-[#9B7FD4]">{r.label}</span>
                          </div>
                          {ann.selectedText && (
                            <p className="text-xs text-[#4B5563] mt-1 line-clamp-2">&quot;{ann.selectedText}&quot;</p>
                          )}
                          {ann.noteText
                            ? <p className="text-xs text-[#1A1D23] mt-1 line-clamp-2">{ann.noteText}</p>
                            : <p className="text-xs text-[#9CA3AF] italic mt-1">Tap to add a note</p>
                          }
                        </button>
                      )
                    })}
                </div>
              )}
            </section>
          </aside>
        </div>
      </div>

      {/* Floating emoji picker */}
      {floatingBar && !annotationPanel.open && (
        <div
          className="fixed z-[45] bg-white rounded-2xl shadow-xl border border-[#E5E7EB] px-2 py-1.5 flex items-center gap-0.5"
          style={{
            left: Math.max(8, Math.min(floatingBar.x - 148, window.innerWidth - 304)),
            top: Math.max(56, floatingBar.y - 64),
          }}
        >
          <span className="text-xs text-[#6B7280] font-medium px-1.5 shrink-0 select-none">Model:</span>
          {(Object.entries(REACTIONS) as [ReactionType, typeof REACTIONS[ReactionType]][]).map(([type, r]) => (
            <button
              key={type}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                const text = capturedSelection
                setCapturedSelection('')
                setFloatingBar(null)
                openAnnotationPanel(type, undefined, text)
              }}
              title={r.label}
              aria-label={r.label}
              className="w-11 h-11 flex items-center justify-center rounded-xl text-2xl hover:bg-purple-50 active:scale-95 transition-all"
            >
              {r.emoji}
            </button>
          ))}
          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => { setCapturedSelection(''); setFloatingBar(null); window.getSelection()?.removeAllRanges() }}
            aria-label="Dismiss"
            className="w-8 h-8 flex items-center justify-center rounded-xl text-[#9CA3AF] hover:bg-[#F3F4F6] transition-colors ml-0.5 text-base"
          >
            ✕
          </button>
        </div>
      )}

      {/* Organizer example modal */}
      {organizerOpen && profile && (
        <OrganizerModal
          book={book}
          profile={profile}
          onClose={() => setOrganizerOpen(false)}
          isTeacherMode={true}
        />
      )}

      {/* Annotation panel modal */}
      {annotationPanel.open && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-4" onClick={closePanel}>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="annotation-panel-title"
            className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="annotation-panel-title" className="font-bold text-xl text-[#1A1D23] mb-1">
              {annotationPanel.editing ? 'Edit Model Annotation' : 'Add Model Annotation'}
            </h3>
            <p className="text-xs text-[#9B7FD4] font-semibold mb-4">Page {currentPage} · Teacher prompt</p>

            <div className="grid grid-cols-5 gap-2 mb-5">
              {(Object.entries(REACTIONS) as [ReactionType, typeof REACTIONS[ReactionType]][]).map(([type, r]) => (
                <button
                  key={type}
                  onClick={() => setSelectedReaction(type)}
                  aria-label={r.label}
                  aria-pressed={selectedReaction === type}
                  className={`flex flex-col items-center gap-1 p-2 rounded-xl border-2 transition-all ${
                    selectedReaction === type
                      ? 'border-[#9B7FD4] bg-purple-50 scale-105'
                      : 'border-transparent hover:border-[#E5E7EB]'
                  }`}
                >
                  <span className="text-2xl">{r.emoji}</span>
                  <span className="text-xs text-[#4B5563] text-center leading-tight">{r.label}</span>
                </button>
              ))}
            </div>

            <div className="mb-5">
              <label className="block text-sm font-semibold text-[#1A1D23] mb-1">Highlighted text</label>
              {selectedText ? (
                <div className="bg-purple-50 border-l-4 border-purple-300 rounded-r-xl px-4 py-3 text-sm text-[#1A1D23] max-h-32 overflow-y-auto">
                  &quot;{selectedText}&quot;
                </div>
              ) : (
                <div className="bg-[#F8F9FC] border border-[#E5E7EB] rounded-xl px-4 py-3 text-sm text-[#6B7280]">
                  Select text on the page before choosing a reaction to highlight a passage.
                </div>
              )}
            </div>

            <div className="mb-5">
              <label className="block text-sm font-semibold text-[#1A1D23] mb-1">
                Model note <span className="text-[#9CA3AF] font-normal">(optional — what should students notice here?)</span>
              </label>
              <textarea
                autoFocus
                value={noteText}
                onChange={(e) => { setNoteText(e.target.value); setSaveError('') }}
                rows={3}
                maxLength={500}
                placeholder="e.g. 'Notice how the author uses contrast here — now look for a similar moment…'"
                className="w-full border border-[#D1D5DB] rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-[#9B7FD4] resize-none"
              />
            </div>

            {saveError && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5 mb-1">{saveError}</p>
            )}

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
                className="flex-1 bg-[#9B7FD4] text-white px-4 py-3 rounded-xl font-bold hover:bg-[#8A6EC3] disabled:opacity-60 transition-colors"
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

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-purple-50 border border-purple-100 rounded-xl px-3 py-2 text-center">
      <div className="text-lg font-bold text-[#9B7FD4]">{value}</div>
      <div className="text-[11px] font-semibold text-[#6B7280]">{label}</div>
    </div>
  )
}
