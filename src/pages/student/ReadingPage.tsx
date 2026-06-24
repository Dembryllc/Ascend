import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'
import { useAuth } from '@/context/auth-context'
import { getBook } from '@/firebase/books'
import { getAnnotationsByStudentAndBook, saveAnnotation, updateAnnotation, deleteAnnotation } from '@/firebase/annotations'
import { getReadingProgress, recordReadingProgress } from '@/firebase/readingProgress'
import type { Book, Annotation, ReadingProgress, ReactionType } from '@/types'
import { REACTIONS } from '@/types'
import { ChevronLeft, ChevronRight, Volume2, ArrowLeft, CheckCircle, Clock, MessageSquare, Target } from 'lucide-react'

pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.mjs'

const HIGHLIGHT_STOP_WORDS = new Set(['and', 'are', 'for', 'not', 'that', 'the', 'this', 'was', 'with'])

type PdfDocument = {
  numPages: number
  getPage(pageNumber: number): Promise<{
    getTextContent(): Promise<{ items: unknown[] }>
  }>
}

export default function ReadingPage() {
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
  const [savingReflection, setSavingReflection] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [containerWidth, setContainerWidth] = useState(700)
  const [loadingBook, setLoadingBook] = useState(true)
  const [readerError, setReaderError] = useState('')
  const [pdfDocument, setPdfDocument] = useState<PdfDocument | null>(null)
  const [readAloudStatus, setReadAloudStatus] = useState('')
  const [reflectionText, setReflectionText] = useState('')
  const [reflectionError, setReflectionError] = useState('')
  const [readingProgress, setReadingProgress] = useState<ReadingProgress | null>(null)
  const [markingComplete, setMarkingComplete] = useState(false)
  const lastProgressTickRef = useRef(0)
  const highlightedSpanRef = useRef<HTMLElement | null>(null)
  const [capturedSelection, setCapturedSelection] = useState('')
  const [floatingBar, setFloatingBar] = useState<{ x: number; y: number } | null>(null)
  const [isSpeaking, setIsSpeaking] = useState(false)

  useEffect(() => {
    if (!bookId) return
    if (!profile) return
    Promise.all([
      getBook(bookId),
      getAnnotationsByStudentAndBook(profile.uid, bookId),
      getReadingProgress(profile.uid, bookId),
    ]).then(([b, ann, progress]) => {
      if (!b) {
        setReaderError('This book could not be found. It may have been deleted or not assigned to you.')
      }
      setBook(b)
      setAnnotations(ann)
      setReadingProgress(progress)
      if (progress?.lastReadPage) setCurrentPage(Math.max(1, progress.lastReadPage))
      setLoadingBook(false)
    }).catch((err: unknown) => {
      console.error('Failed to open book:', err)
      setReaderError(err instanceof Error ? err.message : 'Could not open this book. Please try again.')
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
        .filter((ann) => ann.annotationKind !== 'reflection')
        .map((ann) => ann.selectedText?.replace(/\s+/g, ' ').trim().toLowerCase())
        .filter((quote): quote is string => Boolean(quote && quote.length > 0))

      if (quotes.length === 0) return

      spans.forEach((span) => {
        const spanText = span.textContent?.replace(/\s+/g, ' ').trim().toLowerCase()
        if (!spanText || spanText.length < 4 || HIGHLIGHT_STOP_WORDS.has(spanText)) return
        const shouldHighlight = quotes.some((quote) => quote.includes(spanText) || spanText.includes(quote))
        if (shouldHighlight) {
          span.style.backgroundColor = 'rgba(250, 204, 21, 0.42)'
          span.style.borderRadius = '3px'
          span.style.boxShadow = '0 0 0 2px rgba(250, 204, 21, 0.2)'
        }
      })
    }, 150)

    return () => window.clearTimeout(timer)
  }, [pageAnnotations, currentPage])

  // Responsive PDF width
  useEffect(() => {
    function measure() {
      const el = document.getElementById('pdf-main-column')
      if (el) setContainerWidth(Math.min(el.clientWidth - 32, 900))
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [])

  function onDocumentLoaded(pdf: unknown) {
    const loadedPdf = pdf as PdfDocument
    if (!loadedPdf.numPages || loadedPdf.numPages < 1) {
      setReaderError('This PDF appears to be empty or corrupt. Please contact your teacher.')
      return
    }
    setPdfDocument(loadedPdf)
    setNumPages(loadedPdf.numPages)
    setReaderError('')
  }

  const persistProgress = useCallback(async (secondsRead = 0, completed = false) => {
    if (!profile || !bookId || numPages === 0) return
    const progress = await recordReadingProgress({
      studentId: profile.uid,
      bookId,
      classroomId: profile.classroomId,
      pageNumber: currentPage,
      totalPages: numPages,
      secondsRead,
      completed,
    })
    setReadingProgress(progress)
  }, [bookId, currentPage, numPages, profile])

  useEffect(() => {
    if (numPages === 0) return
    const timer = window.setTimeout(() => {
      void persistProgress(0)
    }, 250)
    return () => window.clearTimeout(timer)
  }, [currentPage, numPages, persistProgress])

  useEffect(() => {
    if (numPages === 0) return
    lastProgressTickRef.current = Date.now()
    const interval = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return
      const now = Date.now()
      const secondsRead = Math.max(5, Math.round((now - lastProgressTickRef.current) / 1000))
      lastProgressTickRef.current = now
      void persistProgress(secondsRead)
    }, 30000)

    return () => window.clearInterval(interval)
  }, [numPages, persistProgress])

  useEffect(() => {
    if (numPages === 0) return
    const onVisibilityChange = () => {
      if (document.visibilityState !== 'hidden') return
      const now = Date.now()
      const secondsRead = Math.round((now - lastProgressTickRef.current) / 1000)
      lastProgressTickRef.current = now
      if (secondsRead > 3) void persistProgress(secondsRead)
    }

    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => document.removeEventListener('visibilitychange', onVisibilityChange)
  }, [numPages, persistProgress])

  // Capture text selection into state the moment it happens so that tapping
  // the emoji toolbar (which clears the live selection on mobile) still has
  // the text available. We never clear capturedSelection on empty-selection
  // events — only when the user acts (closePanel) or turns the page.
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
    // Defer all setState calls out of the synchronous effect body to satisfy
    // the react-hooks/set-state-in-effect rule while preserving the behaviour.
    const speaking = window.speechSynthesis?.speaking
    if (speaking) window.speechSynthesis.cancel()
    const id = requestAnimationFrame(() => {
      setCapturedSelection('')
      setFloatingBar(null)
      setAnnotationPanel({ open: false })
      setSaveError('')
      if (speaking) setIsSpeaking(false)
      clearReadAloudHighlight()
    })
    return () => cancelAnimationFrame(id)
  }, [currentPage])

  useEffect(() => {
    if (!annotationPanel.open) return
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') closePanel()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [annotationPanel.open])

  async function handleMarkComplete() {
    setMarkingComplete(true)
    try {
      await persistProgress(0, true)
    } finally {
      setMarkingComplete(false)
    }
  }

  function onDocumentLoadError(err: Error) {
    console.error('Failed to render PDF:', err)
    setReaderError(`PDF.js error: ${err.message}`)
  }

  function getSelectedPdfText() {
    // Prefer the state-captured selection — it survives the tap that clears
    // the live browser selection on mobile.
    if (capturedSelection) return capturedSelection
    const selection = window.getSelection()
    const text = selection?.toString().replace(/\s+/g, ' ').trim() ?? ''
    if (!selection || !text) return ''
    const container = document.getElementById('pdf-container')
    if (!container || selection.rangeCount === 0) return text
    const range = selection.getRangeAt(0)
    const startIsInReader = container.contains(range.startContainer)
    const endIsInReader = container.contains(range.endContainer)
    return startIsInReader && endIsInReader ? text : ''
  }

  function openAnnotationPanel(reactionType?: ReactionType, editing?: Annotation, textOverride?: string) {
    if (editing) {
      setSelectedReaction(editing.reactionType)
      setSelectedText(editing.selectedText ?? '')
      setNoteText(editing.noteText)
      setAnnotationPanel({ open: true, editing })
    } else {
      setSelectedReaction(reactionType ?? 'think')
      setSelectedText(textOverride !== undefined ? textOverride : getSelectedPdfText())
      setNoteText('')
      setAnnotationPanel({ open: true })
    }
  }

  function closePanel() {
    setAnnotationPanel({ open: false })
    setCapturedSelection('')
    setFloatingBar(null)
    setSaveError('')
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
              : a
          )
        )
      } else {
        const ann = await saveAnnotation(profile.uid, bookId, currentPage, selectedReaction, noteText, selectedText, 'annotation', profile.classroomId)
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

  async function handleReflectionSave() {
    if (!profile || !bookId || !reflectionText.trim()) return
    setSavingReflection(true)
    setReflectionError('')
    try {
      const ann = await saveAnnotation(
        profile.uid,
        bookId,
        currentPage,
        'important',
        reflectionText.trim(),
        '',
        'reflection',
        profile.classroomId,
      )
      setAnnotations((prev) => [...prev, ann])
      setReflectionText('')
    } catch {
      setReflectionError('Could not save. Check your connection and try again.')
    } finally {
      setSavingReflection(false)
    }
  }

  function clearReadAloudHighlight() {
    if (highlightedSpanRef.current) {
      highlightedSpanRef.current.style.backgroundColor = ''
      highlightedSpanRef.current.style.borderRadius = ''
      highlightedSpanRef.current = null
    }
  }

  function stopSpeaking() {
    window.speechSynthesis?.cancel()
    clearReadAloudHighlight()
    setIsSpeaking(false)
    setReadAloudStatus('')
  }

  const speakPage = useCallback(async () => {
    if (!window.speechSynthesis) {
      setReadAloudStatus('Read aloud is not available in this browser.')
      return
    }
    if (!pdfDocument) {
      setReadAloudStatus('The page is still loading. Try again in a moment.')
      return
    }

    window.speechSynthesis.cancel()
    setIsSpeaking(false)
    setReadAloudStatus('Loading…')

    let page: Awaited<ReturnType<PdfDocument['getPage']>>
    try {
      page = await pdfDocument.getPage(currentPage)
    } catch {
      setReadAloudStatus('Could not load this page for reading. Try navigating away and back.')
      return
    }

    let content: Awaited<ReturnType<typeof page.getTextContent>>
    try {
      content = await page.getTextContent()
    } catch {
      setReadAloudStatus('Could not extract text from this page.')
      return
    }
    const rawText = content.items
      .map((item) => (typeof item === 'object' && item && 'str' in item ? String(item.str) : ''))
      .join(' ')

    // Clean up common PDF extraction artifacts before speaking
    const text = rawText
      .replace(/(\w)-\s+(\w)/g, '$1$2')        // rejoin hyphenated line-breaks: "nat- ural" → "natural"
      .replace(/\s+/g, ' ')                      // collapse whitespace
      .replace(/\b(\d{1,3})\b(?=\s|$)/g, '')   // strip bare page numbers
      .replace(/[ \t]{2,}/g, ' ')               // remove extra spaces
      .trim()

    if (!text) {
      setReadAloudStatus('No readable text was found on this page.')
      return
    }

    // Score voices by quality. Microsoft Edge neural voices and Apple enhanced
    // voices are the most natural available through Web Speech API.
    function pickVoice(): SpeechSynthesisVoice | null {
      const voices = window.speechSynthesis.getVoices()
      const en = voices.filter((v) => v.lang.startsWith('en'))

      function score(v: SpeechSynthesisVoice): number {
        const n = v.name
        if (/Microsoft.*Neural|Aria Neural|Guy Neural|Jenny Neural|Ana Neural|Christopher Neural|Eric Neural|Michelle Neural/i.test(n)) return 6
        if (/Microsoft.*Online/i.test(n)) return 5
        if (/enhanced/i.test(n) && /Samantha|Karen|Daniel|Moira|Tessa|Fiona/i.test(n)) return 4
        if (/enhanced|premium|neural/i.test(n)) return 3
        if (/google/i.test(n)) return 2
        if (v.lang === 'en-US') return 1
        return 0
      }

      const sorted = [...en].sort((a, b) => score(b) - score(a))
      return sorted[0] ?? null
    }

    const trySpeak = () => {
      const utt = new SpeechSynthesisUtterance(text)
      const voice = pickVoice()
      if (voice) utt.voice = voice
      utt.rate = 0.92
      utt.pitch = 1.0
      utt.volume = 1.0
      utt.onstart = () => { setIsSpeaking(true); setReadAloudStatus('') }
      utt.onend = () => { clearReadAloudHighlight(); setIsSpeaking(false); setReadAloudStatus('') }
      utt.onerror = () => { clearReadAloudHighlight(); setIsSpeaking(false); setReadAloudStatus('Read aloud stopped.') }

      // Word-by-word highlight using the SpeechSynthesisEvent boundary event.
      // Fires reliably in Chrome/Edge; degrades gracefully (no highlight) in Firefox/iOS Safari.
      const ttsSpans = Array.from(
        document.querySelectorAll<HTMLElement>('.react-pdf__Page__textContent span')
      )
      let spanIdx = 0
      utt.addEventListener('boundary', (e: SpeechSynthesisEvent) => {
        if (e.name !== 'word') return
        const charLen = e.charLength ?? 0
        const raw = charLen > 0 ? text.slice(e.charIndex, e.charIndex + charLen) : text.slice(e.charIndex).split(/\s/)[0]
        const word = raw.replace(/\W/g, '').toLowerCase()
        if (word.length < 2) return
        if (highlightedSpanRef.current) {
          highlightedSpanRef.current.style.backgroundColor = ''
          highlightedSpanRef.current.style.borderRadius = ''
        }
        for (let i = spanIdx; i < ttsSpans.length; i++) {
          const spanWord = (ttsSpans[i].textContent ?? '').replace(/\W/g, '').toLowerCase()
          if (spanWord && spanWord.includes(word)) {
            ttsSpans[i].style.backgroundColor = 'rgba(74, 144, 217, 0.3)'
            ttsSpans[i].style.borderRadius = '2px'
            highlightedSpanRef.current = ttsSpans[i]
            spanIdx = i + 1
            break
          }
        }
      })

      window.speechSynthesis.speak(utt)
    }

    // Voices may not be populated yet on first call — wait for voiceschanged
    if (window.speechSynthesis.getVoices().length > 0) {
      trySpeak()
    } else {
      window.speechSynthesis.addEventListener('voiceschanged', trySpeak, { once: true })
    }
  }, [currentPage, pdfDocument])

  if (!bookId) return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8F9FC] p-4">
      <div className="bg-white rounded-2xl border border-[#F3F4F6] shadow-sm max-w-md w-full p-6 text-center">
        <h2 className="text-xl font-bold text-[#1A1D23] mb-2">We couldn&apos;t open this book</h2>
        <p className="text-[#4B5563] text-sm mb-6">Missing book id.</p>
        <button
          onClick={() => navigate('/student')}
          className="bg-[#4A90D9] text-white font-bold px-5 py-3 rounded-xl hover:bg-[#357ABD] transition-colors"
        >
          Back to Bookshelf
        </button>
      </div>
    </div>
  )

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
        <p className="text-[#4B5563] text-sm mb-6 break-all">{readerError || 'The book was not found.'}</p>
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
  const reflectionCount = annotations.filter((a) => a.annotationKind === 'reflection').length
  const quoteCount = annotations.filter((a) => a.selectedText && a.annotationKind !== 'reflection').length
  const taskCount = Math.max(4, quoteCount + reflectionCount)
  const completedTaskCount = Math.min(taskCount, quoteCount + reflectionCount)
  const completionPct = Math.round((completedTaskCount / taskCount) * 100)
  const readingCompletionPct = readingProgress?.completionPercent ?? (numPages > 0 ? Math.round((currentPage / numPages) * 100) : 0)
  const minutesRead = Math.max(0, Math.round((readingProgress?.totalSecondsRead ?? 0) / 60))

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
          <div className="flex items-center gap-1">
            {isSpeaking ? (
              <button
                onClick={stopSpeaking}
                aria-label="Stop reading"
                className="flex items-center gap-1.5 min-w-[44px] min-h-[44px] px-3 py-2 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 transition-colors font-semibold text-sm"
              >
                <span className="text-base leading-none">⏹</span>
                <span className="hidden sm:inline">Stop</span>
              </button>
            ) : (
              <button
                onClick={speakPage}
                aria-label="Read page aloud"
                className="flex items-center gap-1.5 min-w-[44px] min-h-[44px] px-3 py-2 rounded-xl text-[#4A90D9] hover:bg-blue-50 transition-colors font-semibold text-sm"
              >
                <Volume2 size={20} />
                <span className="hidden sm:inline">Read aloud</span>
              </button>
            )}
          </div>
        </div>
      </header>

      <div id="pdf-container" className="flex-1 px-3 sm:px-4 py-4 max-w-7xl mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px] gap-4 items-start">
          <main id="pdf-main-column" className="min-w-0">
            {(book.assignmentPrompt || book.successCriteria) && (
              <section className="w-full mb-4 bg-white rounded-2xl shadow-sm border border-[#F3F4F6] p-4">
                <div className="flex items-start gap-3">
                  <div className="bg-blue-50 text-[#4A90D9] p-2 rounded-xl shrink-0">
                    <Target size={20} />
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-[#1A1D23] text-sm">Today&apos;s reading task</p>
                    {book.assignmentPrompt && <p className="text-sm text-[#4B5563] mt-1">{book.assignmentPrompt}</p>}
                    {book.successCriteria && <p className="text-xs font-semibold text-[#5BB974] mt-2">{book.successCriteria}</p>}
                    <div className="mt-3 h-2 bg-[#E5E7EB] rounded-full overflow-hidden">
                      <div
                        role="progressbar"
                        aria-valuenow={completionPct}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label="Reading task completion"
                        className="h-full bg-[#4A90D9] rounded-full"
                        style={{ width: `${completionPct}%` }}
                      />
                    </div>
                    <p className="text-xs text-[#6B7280] mt-1">{completedTaskCount} of {taskCount} reading actions complete</p>
                  </div>
                </div>
              </section>
            )}

            <section className="w-full mb-4 bg-white rounded-2xl shadow-sm border border-[#F3F4F6] p-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-bold text-[#1A1D23] text-sm">Reading progress</p>
                  <p className="text-xs text-[#4B5563] mt-1">
                    Page {currentPage} of {numPages || '...'} · {minutesRead} minute{minutesRead === 1 ? '' : 's'} tracked
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {readingProgress?.completed && (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-[#5BB974] bg-green-50 px-3 py-2 rounded-xl">
                      <CheckCircle size={14} /> Complete
                    </span>
                  )}
                  <button
                    onClick={handleMarkComplete}
                    disabled={markingComplete || readingProgress?.completed}
                    className="text-xs font-bold bg-[#1A1D23] text-white px-3 py-2 rounded-xl hover:bg-[#2A2F3A] disabled:opacity-50 transition-colors"
                  >
                    {readingProgress?.completed ? 'Completed' : markingComplete ? 'Saving...' : 'Mark Complete'}
                  </button>
                </div>
              </div>
              <div className="mt-3 h-2 bg-[#E5E7EB] rounded-full overflow-hidden">
                <div
                  role="progressbar"
                  aria-valuenow={readingCompletionPct}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label="Book reading progress"
                  className="h-full bg-[#5BB974] rounded-full"
                  style={{ width: `${readingCompletionPct}%` }}
                />
              </div>
            </section>

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
            className="flex items-center gap-1.5 px-4 py-2.5 min-h-[44px] bg-[#F3F4F6] rounded-xl font-semibold text-[#1A1D23] hover:bg-[#E5E7EB] disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-base"
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
            className="flex items-center gap-1.5 px-4 py-2.5 min-h-[44px] bg-[#F3F4F6] rounded-xl font-semibold text-[#1A1D23] hover:bg-[#E5E7EB] disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-base"
          >
            Next <ChevronRight size={20} />
          </button>
            </div>
            {readAloudStatus && (
              <p className="w-full mt-2 text-center text-xs font-semibold text-[#4B5563]">{readAloudStatus}</p>
            )}

            {/* Annotation toolbar */}
            <div className="w-full mt-4 bg-white rounded-2xl shadow-sm border border-[#F3F4F6] p-4">
          <p className="text-sm font-bold text-[#1A1D23] mb-3">How does this page make you feel?</p>
          <div className="grid grid-cols-5 gap-2">
            {(Object.entries(REACTIONS) as [ReactionType, typeof REACTIONS[ReactionType]][]).map(([type, r]) => (
              <button
                key={type}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => openAnnotationPanel(type)}
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
                        {ann.selectedText && (
                          <p className="text-sm text-[#1A1D23] mt-1 bg-yellow-50 border-l-4 border-yellow-300 rounded-r-lg px-3 py-2">
                            “{ann.selectedText}”
                          </p>
                        )}
                        {ann.noteText
                          ? <p className="text-sm text-[#1A1D23] mt-1">{ann.noteText}</p>
                          : <p className="text-xs text-[#9CA3AF] italic mt-1">No note yet — tap Edit to add one</p>
                        }
                      </div>
                      <button
                        onClick={() => openAnnotationPanel(undefined, ann)}
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
          </main>

          <aside className="lg:sticky lg:top-20 space-y-4">
            <section className="bg-white rounded-2xl shadow-sm border border-[#F3F4F6] p-4">
              <div className="flex items-center gap-2 mb-3">
                <MessageSquare size={18} className="text-[#9B7FD4]" />
                <h3 className="font-bold text-[#1A1D23]">Annotation sidebar</h3>
              </div>
              <div className="grid grid-cols-3 gap-2 mb-4">
                <MiniStat label="Notes" value={annotations.filter((ann) => ann.annotationKind !== 'reflection').length} />
                <MiniStat label="Quotes" value={quoteCount} />
                <MiniStat label="Pages" value={annotatedPages.size} />
              </div>
              {annotations.length === 0 ? (
                <p className="text-sm text-[#6B7280]">Select a passage, choose an emoji, and save your first note.</p>
              ) : (
                <div className="space-y-2 max-h-[42vh] overflow-y-auto pr-1">
                  {annotations
                    .slice()
                    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
                    .map((ann) => {
                      const r = REACTIONS[ann.reactionType]
                      return (
                        <button
                          key={ann.id}
                          onClick={() => {
                            setCurrentPage(Math.max(1, ann.pageNumber))
                            openAnnotationPanel(undefined, ann)
                          }}
                          className="w-full text-left bg-[#F8F9FC] hover:bg-blue-50 border border-[#EEF0F4] rounded-xl p-3 transition-colors"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-bold text-[#1A1D23]">{r.emoji} Page {ann.pageNumber}</span>
                            <span className="text-[11px] text-[#9CA3AF]">{r.label}</span>
                          </div>
                          {ann.annotationKind === 'reflection' && (
                            <p className="text-xs font-semibold text-[#5BB974] mt-1">Reflection</p>
                          )}
                          {ann.selectedText && ann.annotationKind !== 'reflection' && (
                            <p className="text-xs text-[#4B5563] mt-1 line-clamp-2">“{ann.selectedText}”</p>
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

            <section className="bg-white rounded-2xl shadow-sm border border-[#F3F4F6] p-4">
              <div className="flex items-center gap-2 mb-3 text-sm text-[#4B5563]">
                <Clock size={16} className="text-[#4A90D9]" />
                <span>{minutesRead} minute{minutesRead === 1 ? '' : 's'} tracked in this book</span>
              </div>
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle size={18} className="text-[#5BB974]" />
                <h3 className="font-bold text-[#1A1D23]">After reading</h3>
              </div>
              <p className="text-sm text-[#4B5563] mb-3">Write one short reflection when you finish a chunk of reading.</p>
              <textarea
                value={reflectionText}
                onChange={(e) => setReflectionText(e.target.value)}
                rows={4}
                maxLength={600}
                placeholder="What changed in your thinking? What should your teacher notice?"
                className="w-full border border-[#D1D5DB] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#4A90D9] resize-none"
              />
              <button
                onClick={handleReflectionSave}
                disabled={!reflectionText.trim() || savingReflection}
                className="mt-3 w-full bg-[#5BB974] hover:bg-[#4AA863] disabled:opacity-50 text-white rounded-xl py-2.5 font-bold transition-colors"
              >
                {savingReflection ? 'Saving…' : 'Save Reflection'}
              </button>
              {reflectionError && (
                <p className="mt-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{reflectionError}</p>
              )}
            </section>
          </aside>
        </div>
      </div>

      {/* Floating emoji picker — appears above selected text on mobile and desktop */}
      {floatingBar && !annotationPanel.open && (
        <div
          className="fixed z-[45] bg-white rounded-2xl shadow-xl border border-[#E5E7EB] px-2 py-1.5 flex items-center gap-0.5"
          style={{
            left: Math.max(8, Math.min(floatingBar.x - 148, window.innerWidth - 304)),
            top: Math.max(56, floatingBar.y - 64),
          }}
        >
          <span className="text-xs text-[#6B7280] font-medium px-1.5 shrink-0 select-none">React:</span>
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
              className="w-11 h-11 flex items-center justify-center rounded-xl text-2xl hover:bg-[#F3F4F6] active:scale-95 transition-all"
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
            <h3 id="annotation-panel-title" className="font-bold text-xl text-[#1A1D23] mb-4">
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

            <div className="mb-5">
              <label className="block text-sm font-semibold text-[#1A1D23] mb-1">
                Highlighted text
              </label>
              {selectedText ? (
                <div className="bg-yellow-50 border-l-4 border-yellow-300 rounded-r-xl px-4 py-3 text-sm text-[#1A1D23] max-h-32 overflow-y-auto">
                  “{selectedText}”
                </div>
              ) : (
                <div className="bg-[#F8F9FC] border border-[#E5E7EB] rounded-xl px-4 py-3 text-sm text-[#6B7280]">
                  Select text on the page before choosing a reaction to attach a passage.
                </div>
              )}
            </div>

            {/* Note text */}
            <div className="mb-5">
              <label className="block text-sm font-semibold text-[#1A1D23] mb-1">
                Add a note <span className="text-[#9CA3AF] font-normal">(optional)</span>
              </label>
              <textarea
                autoFocus
                value={noteText}
                onChange={(e) => { setNoteText(e.target.value); setSaveError('') }}
                rows={3}
                maxLength={500}
                placeholder="Write a short note… (2–3 sentences is perfect)"
                className="w-full border border-[#D1D5DB] rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-[#4A90D9] resize-none"
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

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-[#F8F9FC] border border-[#EEF0F4] rounded-xl px-3 py-2 text-center">
      <div className="text-lg font-bold text-[#1A1D23]">{value}</div>
      <div className="text-[11px] font-semibold text-[#6B7280]">{label}</div>
    </div>
  )
}
