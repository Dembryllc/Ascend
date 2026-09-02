import { ChevronLeft, ChevronRight, Gauge, Square, Volume2 } from 'lucide-react'
import { RATE_OPTIONS, type ReadAloud } from '@/hooks/useReadAloud'

/**
 * The controls that turn read aloud from a single on/off button into something
 * a struggling reader can actually steer: slow it down, pick a clearer voice,
 * go back over the sentence they missed, or start somewhere other than the top
 * of the page.
 */
export default function ReadAloudBar({ readAloud }: { readAloud: ReadAloud }) {
  const {
    isSpeaking, chunks, chunkIndex, rate, setRate,
    voices, voiceURI, setVoiceURI, suggestBetterVoices, stop, skip, jumpTo,
  } = readAloud

  if (chunks.length === 0) return null

  const atStart = chunkIndex <= 0
  const atEnd = chunkIndex >= chunks.length - 1

  return (
    <section
      aria-label="Read aloud controls"
      className="w-full mb-4 bg-white border border-[#E5E7EB] rounded-2xl p-3 sm:p-4 shadow-sm"
    >
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        <div className="flex items-center gap-1.5 text-[#4A90D9] font-bold text-sm shrink-0">
          <Volume2 size={18} />
          Read aloud
        </div>

        {/* Sentence stepping */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => skip(-1)}
            disabled={atStart}
            aria-label="Previous sentence"
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-[#4B5563] hover:bg-[#F3F4F6] disabled:opacity-35 disabled:hover:bg-transparent transition-colors"
          >
            <ChevronLeft size={22} />
          </button>
          <span className="text-xs font-semibold text-[#4B5563] tabular-nums whitespace-nowrap px-1">
            Sentence {chunkIndex + 1} of {chunks.length}
          </span>
          <button
            onClick={() => skip(1)}
            disabled={atEnd}
            aria-label="Next sentence"
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-[#4B5563] hover:bg-[#F3F4F6] disabled:opacity-35 disabled:hover:bg-transparent transition-colors"
          >
            <ChevronRight size={22} />
          </button>
        </div>

        {isSpeaking && (
          <button
            onClick={stop}
            aria-label="Stop reading"
            className="flex items-center gap-1.5 min-h-[44px] px-3 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 transition-colors font-semibold text-sm"
          >
            <Square size={15} /> Stop
          </button>
        )}

        <div className="flex items-center gap-2 ml-auto">
          <label htmlFor="read-aloud-rate" className="flex items-center gap-1 text-xs font-semibold text-[#4B5563]">
            <Gauge size={15} /> Speed
          </label>
          <select
            id="read-aloud-rate"
            value={rate}
            onChange={(e) => setRate(Number(e.target.value))}
            className="min-h-[44px] text-sm border border-[#D1D5DB] rounded-xl px-2 focus:outline-none focus:ring-2 focus:ring-[#4A90D9]"
          >
            {RATE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-3">
        {/* Start anywhere. A dropdown rather than tapping the page itself:
            tapping the text layer is how annotation selection works, and
            competing for that gesture would break the core feature. */}
        <label htmlFor="read-aloud-start" className="text-xs font-semibold text-[#4B5563]">
          Start from
        </label>
        <select
          id="read-aloud-start"
          value={chunkIndex}
          onChange={(e) => jumpTo(Number(e.target.value))}
          className="flex-1 min-w-0 min-h-[44px] text-sm border border-[#D1D5DB] rounded-xl px-2 focus:outline-none focus:ring-2 focus:ring-[#4A90D9]"
        >
          {chunks.map((c, i) => (
            <option key={i} value={i}>
              {i + 1}. {c.length > 60 ? `${c.slice(0, 60)}…` : c}
            </option>
          ))}
        </select>

        {voices.length > 0 && (
          <>
            <label htmlFor="read-aloud-voice" className="text-xs font-semibold text-[#4B5563]">
              Voice
            </label>
            <select
              id="read-aloud-voice"
              value={voiceURI}
              onChange={(e) => setVoiceURI(e.target.value)}
              className="min-h-[44px] max-w-[45%] text-sm border border-[#D1D5DB] rounded-xl px-2 focus:outline-none focus:ring-2 focus:ring-[#4A90D9]"
            >
              <option value="">Best available</option>
              {voices.map((v) => (
                <option key={v.voiceURI} value={v.voiceURI}>{v.name}</option>
              ))}
            </select>
          </>
        )}
      </div>

      {suggestBetterVoices && (
        <p className="text-xs text-[#4B5563] mt-3 bg-blue-50 border border-blue-100 rounded-xl p-2.5">
          <span className="font-semibold text-[#185FA5]">Want a more natural voice?</span>{' '}
          This device only has its basic voices installed. In <strong>Settings → Accessibility →
          Spoken Content → Voices → English</strong>, download an <strong>Enhanced</strong> or
          <strong> Premium</strong> voice, then come back and pick it above.
        </p>
      )}
    </section>
  )
}
