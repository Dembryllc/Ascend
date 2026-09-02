import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Read aloud for a PDF page.
 *
 * The page is spoken as a list of short chunks rather than one long utterance.
 * That is what makes "skip ahead" and "start from here" possible at all — a
 * single utterance has nothing to seek within — and it also sidesteps a Chrome
 * bug where a long utterance stops partway through with no error.
 */

const RATE_KEY = 'ea-read-aloud-rate'
const VOICE_KEY = 'ea-read-aloud-voice'

// How long to wait for the browser to populate its voice list before telling
// the reader that this device simply has none.
const VOICE_WAIT_MS = 3000

export const RATE_OPTIONS = [
  { value: 0.6, label: '0.6× Slowest' },
  { value: 0.75, label: '0.75× Slower' },
  { value: 0.92, label: '1× Normal' },
  { value: 1.1, label: '1.25× Faster' },
  { value: 1.35, label: '1.5× Fastest' },
] as const

// 0.92 rather than 1.0 is the long-standing default here: browser TTS at a true
// 1.0 is faster than a child reader can follow.
export const DEFAULT_RATE = 0.92

function loadRate(): number {
  const stored = Number(localStorage.getItem(RATE_KEY))
  return RATE_OPTIONS.some((o) => o.value === stored) ? stored : DEFAULT_RATE
}

/**
 * Splits page text into speakable chunks: sentences, with very short fragments
 * merged forward and long ones broken at clause boundaries. Each chunk is what
 * one press of "skip" moves by, so they need to be sentence-sized — small
 * enough to seek usefully, large enough that the voice keeps its intonation.
 */
export function splitIntoChunks(text: string, maxLen = 220): string[] {
  const sentences = text.match(/[^.!?]+[.!?]+["')\]]*\s*|[^.!?]+$/g) ?? [text]
  const out: string[] = []

  for (const raw of sentences) {
    const sentence = raw.trim()
    if (!sentence) continue

    if (sentence.length <= maxLen) {
      // Merge a fragment too short to stand on its own ("Yes." "Chapter 2")
      // into the previous chunk, so skipping never lands on a single word.
      const prev = out[out.length - 1]
      if (prev && sentence.length < 25 && prev.length + sentence.length <= maxLen) {
        out[out.length - 1] = `${prev} ${sentence}`
      } else {
        out.push(sentence)
      }
      continue
    }

    // Too long for one chunk — break at clause boundaries, then by width.
    let rest = sentence
    while (rest.length > maxLen) {
      const window = rest.slice(0, maxLen)
      const cut = Math.max(window.lastIndexOf(', '), window.lastIndexOf('; '), window.lastIndexOf(' — '))
      const at = cut > maxLen * 0.5 ? cut + 1 : window.lastIndexOf(' ')
      const end = at > 0 ? at : maxLen
      out.push(rest.slice(0, end).trim())
      rest = rest.slice(end).trim()
    }
    if (rest) out.push(rest)
  }

  return out.filter(Boolean)
}

/**
 * Ranks the voices a device actually has. Web Speech offers no "natural voice"
 * of its own — you get whatever the OS installed, so the best we can do is
 * prefer the neural ones by name and let the reader override.
 */
export function scoreVoice(v: SpeechSynthesisVoice): number {
  const n = v.name
  if (/Microsoft.*Neural|Aria Neural|Guy Neural|Jenny Neural|Ana Neural|Christopher Neural|Eric Neural|Michelle Neural/i.test(n)) return 6
  if (/Microsoft.*Online/i.test(n)) return 5
  if (/enhanced/i.test(n) && /Samantha|Karen|Daniel|Moira|Tessa|Fiona/i.test(n)) return 4
  if (/enhanced|premium|neural|siri/i.test(n)) return 3
  if (/google/i.test(n)) return 2
  if (v.lang === 'en-US') return 1
  return 0
}

export interface ReadAloud {
  isSpeaking: boolean
  status: string
  chunks: string[]
  chunkIndex: number
  rate: number
  setRate: (r: number) => void
  voices: SpeechSynthesisVoice[]
  voiceURI: string
  setVoiceURI: (uri: string) => void
  /** True on an Apple device with no enhanced voice installed — the one case
   *  where the reader can fix the voice quality themselves, in Settings. */
  suggestBetterVoices: boolean
  start: (fromIndex?: number) => Promise<void>
  stop: () => void
  /** Stop and forget this page's chunks — for turning the page, where the
   *  sentence list belongs to the page you just left. */
  reset: () => void
  skip: (delta: number) => void
  jumpTo: (index: number) => void
}

export function useReadAloud(getPageText: () => Promise<string>): ReadAloud {
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [status, setStatus] = useState('')
  const [chunks, setChunks] = useState<string[]>([])
  const [chunkIndex, setChunkIndex] = useState(0)
  const [rate, setRateState] = useState<number>(() => loadRate())
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])
  const [voiceURI, setVoiceURIState] = useState<string>(() => localStorage.getItem(VOICE_KEY) ?? '')

  const chunksRef = useRef<string[]>([])
  const rateRef = useRef(rate)
  const voiceRef = useRef(voiceURI)
  const highlightRef = useRef<HTMLElement | null>(null)
  const spanIdxRef = useRef(0)
  // Bumped on every stop and every new start. cancel() fires onend for the
  // utterance it kills, and without this that stale event advances the chunk
  // index — the page would carry on reading after Stop.
  const genRef = useRef(0)


  // Voice lists populate asynchronously, and on Chrome the first read is empty.
  useEffect(() => {
    if (!window.speechSynthesis) return
    const read = () => {
      const all = window.speechSynthesis.getVoices().filter((v) => v.lang.startsWith('en'))
      setVoices([...all].sort((a, b) => scoreVoice(b) - scoreVoice(a)))
    }
    read()
    window.speechSynthesis.addEventListener('voiceschanged', read)
    return () => window.speechSynthesis.removeEventListener('voiceschanged', read)
  }, [])

  // Declared below runFrom; assigned here so the setters can restart playback.
  const restartRef = useRef<(() => void) | null>(null)

  const setRate = useCallback((r: number) => {
    setRateState(r)
    rateRef.current = r
    localStorage.setItem(RATE_KEY, String(r))
    // Rate is fixed on an utterance once it is speaking, so a live change only
    // takes effect by restarting the current sentence.
    restartRef.current?.()
  }, [])

  const setVoiceURI = useCallback((uri: string) => {
    setVoiceURIState(uri)
    voiceRef.current = uri
    localStorage.setItem(VOICE_KEY, uri)
    restartRef.current?.()
  }, [])

  const clearHighlight = useCallback(() => {
    if (highlightRef.current) {
      highlightRef.current.style.backgroundColor = ''
      highlightRef.current.style.borderRadius = ''
      highlightRef.current = null
    }
  }, [])

  const stop = useCallback(() => {
    genRef.current += 1
    window.speechSynthesis?.cancel()
    clearHighlight()
    setIsSpeaking(false)
    setStatus('')
  }, [clearHighlight])

  const reset = useCallback(() => {
    genRef.current += 1
    window.speechSynthesis?.cancel()
    clearHighlight()
    chunksRef.current = []
    spanIdxRef.current = 0
    setChunks([])
    setChunkIndex(0)
    setIsSpeaking(false)
    setStatus('')
  }, [clearHighlight])

  const pickVoice = useCallback((): SpeechSynthesisVoice | null => {
    const all = window.speechSynthesis.getVoices().filter((v) => v.lang.startsWith('en'))
    if (all.length === 0) return null
    const chosen = voiceRef.current && all.find((v) => v.voiceURI === voiceRef.current)
    if (chosen) return chosen
    return [...all].sort((a, b) => scoreVoice(b) - scoreVoice(a))[0] ?? null
  }, [])

  // Speaks one chunk and chains to the next. `gen` pins this run: any event
  // arriving after a stop or restart belongs to a run we no longer care about.
  // The chain goes through a ref because a useCallback cannot name itself.
  const speakFromRef = useRef<(index: number, gen: number) => void>(() => {})
  const speakFrom = useCallback((index: number, gen: number) => {
    const list = chunksRef.current
    if (gen !== genRef.current) return
    if (index >= list.length) {
      clearHighlight()
      setIsSpeaking(false)
      setStatus('')
      return
    }

    setChunkIndex(index)
    const utt = new SpeechSynthesisUtterance(list[index])
    const voice = pickVoice()
    if (voice) utt.voice = voice
    utt.rate = rateRef.current
    utt.pitch = 1.0
    utt.volume = 1.0

    utt.onstart = () => {
      if (gen !== genRef.current) return
      setIsSpeaking(true)
      setStatus('')
    }
    utt.onend = () => {
      if (gen !== genRef.current) return
      speakFromRef.current(index + 1, gen)
    }
    utt.onerror = (e) => {
      if (gen !== genRef.current) return
      // Chrome reports a cancel as 'interrupted' — that is a normal stop.
      if (e.error === 'interrupted') return
      clearHighlight()
      setIsSpeaking(false)
      setStatus('Read aloud stopped.')
    }

    // Word highlight, chunk-relative. Degrades to nothing where the browser
    // does not fire boundary events (Firefox, iOS Safari).
    const spans = Array.from(
      document.querySelectorAll<HTMLElement>('.react-pdf__Page__textContent span')
    )
    utt.addEventListener('boundary', (e: SpeechSynthesisEvent) => {
      if (gen !== genRef.current || e.name !== 'word') return
      const chunk = list[index]
      const charLen = e.charLength ?? 0
      const raw = charLen > 0
        ? chunk.slice(e.charIndex, e.charIndex + charLen)
        : chunk.slice(e.charIndex).split(/\s/)[0]
      const word = raw.replace(/\W/g, '').toLowerCase()
      if (word.length < 2) return
      clearHighlight()
      for (let i = spanIdxRef.current; i < spans.length; i++) {
        const spanWord = (spans[i].textContent ?? '').replace(/\W/g, '').toLowerCase()
        if (spanWord && spanWord.includes(word)) {
          spans[i].style.backgroundColor = 'rgba(74, 144, 217, 0.3)'
          spans[i].style.borderRadius = '2px'
          highlightRef.current = spans[i]
          spanIdxRef.current = i + 1
          break
        }
      }
    })

    // Chrome stalls if synthesis is left paused; resume() first is the fix.
    window.speechSynthesis.resume()
    window.speechSynthesis.speak(utt)
  }, [clearHighlight, pickVoice])

  useEffect(() => { speakFromRef.current = speakFrom }, [speakFrom])

  // Re-aims the highlight scan after a jump, so skipping backwards does not
  // leave it stranded at the end of the page.
  const resetHighlightScan = useCallback((index: number) => {
    spanIdxRef.current = 0
    const first = (chunksRef.current[index] ?? '').split(/\s+/)[0]?.replace(/\W/g, '').toLowerCase()
    if (!first || first.length < 2) return
    const spans = Array.from(
      document.querySelectorAll<HTMLElement>('.react-pdf__Page__textContent span')
    )
    const at = spans.findIndex((s) => (s.textContent ?? '').replace(/\W/g, '').toLowerCase().includes(first))
    if (at >= 0) spanIdxRef.current = at
  }, [])

  const runFrom = useCallback((index: number) => {
    genRef.current += 1
    const gen = genRef.current
    window.speechSynthesis.cancel()
    clearHighlight()
    resetHighlightScan(index)
    setIsSpeaking(true)
    // Chrome needs a beat after cancel() before the next speak() takes.
    setTimeout(() => speakFrom(index, gen), 50)
  }, [clearHighlight, resetHighlightScan, speakFrom])

  const start = useCallback(async (fromIndex = 0) => {
    if (!window.speechSynthesis) {
      setStatus('Read aloud is not available in this browser.')
      return
    }
    window.speechSynthesis.cancel()
    setIsSpeaking(false)
    setStatus('Loading…')

    let text: string
    try {
      text = await getPageText()
    } catch {
      setStatus('Could not load this page for reading. Try navigating away and back.')
      return
    }
    if (!text) {
      setStatus('No readable text was found on this page.')
      return
    }

    const list = splitIntoChunks(text)
    chunksRef.current = list
    setChunks(list)
    if (list.length === 0) {
      setStatus('No readable text was found on this page.')
      return
    }

    const begin = Math.min(Math.max(0, fromIndex), list.length - 1)
    setChunkIndex(begin)

    // Voices can still be empty on the very first press, and on a device with
    // no speech engine at all (some Chromebooks, Linux without speech-dispatcher)
    // 'voiceschanged' never fires. Without the timeout the reader would sit on
    // "Loading…" forever with nothing explaining why.
    if (window.speechSynthesis.getVoices().length > 0) {
      runFrom(begin)
      return
    }
    let settled = false
    const go = () => {
      if (settled) return
      settled = true
      runFrom(begin)
    }
    window.speechSynthesis.addEventListener('voiceschanged', go, { once: true })
    setTimeout(() => {
      if (settled) return
      settled = true
      if (window.speechSynthesis.getVoices().length > 0) runFrom(begin)
      else setStatus('This device has no speech voices installed, so Read aloud cannot play here.')
    }, VOICE_WAIT_MS)
  }, [getPageText, runFrom])

  const jumpTo = useCallback((index: number) => {
    const list = chunksRef.current
    if (list.length === 0) return
    runFrom(Math.min(Math.max(0, index), list.length - 1))
  }, [runFrom])

  const skip = useCallback((delta: number) => {
    setChunkIndex((current) => {
      const list = chunksRef.current
      if (list.length === 0) return current
      const next = Math.min(Math.max(0, current + delta), list.length - 1)
      runFrom(next)
      return next
    })
  }, [runFrom])

  const speakingRef = useRef(false)
  useEffect(() => { speakingRef.current = isSpeaking }, [isSpeaking])
  const chunkIndexRef = useRef(0)
  useEffect(() => { chunkIndexRef.current = chunkIndex }, [chunkIndex])
  useEffect(() => {
    restartRef.current = () => {
      if (speakingRef.current) runFrom(chunkIndexRef.current)
    }
  }, [runFrom])

  useEffect(() => () => { window.speechSynthesis?.cancel() }, [])

  const suggestBetterVoices =
    /iPad|iPhone|Mac/.test(navigator.userAgent) &&
    voices.length > 0 &&
    !voices.some((v) => scoreVoice(v) >= 3)

  return {
    isSpeaking, status, chunks, chunkIndex,
    rate, setRate, voices, voiceURI, setVoiceURI, suggestBetterVoices,
    start, stop, reset, skip, jumpTo,
  }
}
