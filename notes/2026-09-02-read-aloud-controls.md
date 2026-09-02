---
date: 2026-09-02
project: Easy Annotate
tags: [easy-annotate, read-aloud, accessibility, tts, ocr, e2e]
---

# Read aloud: speed, voice, and steering

## What was asked

Natural voices, a way to slow the voice down, and letting a student skip ahead or pick where
reading starts. Plus a report that CamScanner PDFs were being called "pictures."

## What was actually there

`ReadingPage.tsx` had a working but unsteerable engine: `utt.rate = 0.92` hardcoded, one
utterance for the entire page, and a `pickVoice()` that already scored voices by quality with no
way for a reader to override it. So the voice was already the best the device had — what was
missing was every control.

The single-utterance design is why there was no skip: there is nothing to seek within one
utterance. It was also a latent bug, since Chrome stops long utterances partway with no error.

## What landed

Engine extracted to `src/hooks/useReadAloud.ts` (`ReadingPage` was 1116 lines), UI in
`ReadAloudBar`. The page now only supplies `getPageText()`.

- **Chunking.** `splitIntoChunks` breaks the page into sentence-sized pieces (max 220 chars, short
  fragments merged forward so Skip never lands on a single word, long sentences broken at clause
  boundaries). This gives skip, start-anywhere, and robustness on dense pages in one change.
- **Speed** — 0.6× to 1.5×, persisted. Default stays 0.92: browser TTS at a true 1.0 outruns a
  child reader.
- **Voice picker** — "Best available" plus every English voice on the device.
- **Start from** — a dropdown of the page's actual sentences. Deliberately *not* tap-a-sentence-on-
  the-page: tapping the text layer is how annotation selection works, and competing for that
  gesture would break the core feature.
- **Sentence stepping** — ◀ ▶ with "Sentence N of M".

## Two things that needed care

**The generation ref.** `cancel()` fires `onend` for the utterance it kills. Without a guard, that
stale event chains to the next chunk — press Stop and the page carries on reading. Every
stop/restart bumps `genRef`; every callback checks it before doing anything.

**Rate is fixed on a live utterance.** Changing speed mid-sentence can only take effect by
restarting the current chunk. That restart lives in `setRate`/`setVoiceURI` rather than an effect,
because it is user-initiated and an effect trips `react-hooks/set-state-in-effect`.

Also: `stop()` keeps the sentence list (so you can restart from a sentence), `reset()` clears it,
and turning the page calls `reset()` — the chunks belong to the page you left.

## The honest ceiling on "natural"

Web Speech gives you whatever the OS installed and nothing more. Edge/Windows has genuinely good
neural voices; iPad ships robotic defaults unless the user downloads an Enhanced voice in Settings.
So `suggestBetterVoices` detects exactly that case — Apple device, no enhanced voice present — and
tells the reader where to get one. That is the whole free lever.

Consistently natural across every device means cloud TTS (Google/Polly/ElevenLabs): a Cloud
Function, per-character cost, cached audio per book+page, and a privacy-policy line for sending
book text to a third party. Roughly $10 once per 300-page book if cached. Not built; it is a
decision, not an oversight.

Found while testing: devices with no speech engine at all (some Chromebooks, Linux without
speech-dispatcher) never fire `voiceschanged`, so read aloud sat on "Loading…" forever. Now it
gives up after 3s and explains.

## CamScanner

Not a bug — the app was right and the wording was wrong. The probe checks `getTextContent()` for a
non-empty string; a CamScanner export really is a PDF whose pages are photographs, so there is no
text underneath. But "This page is a picture, not text" reads as *your upload was rejected*, which
is exactly how it was reported.

Reworded to open with "The file is a real PDF — nothing is wrong with the upload," then explain the
missing text layer, then name the fix: turn on the scanner app's OCR / "Searchable PDF" before
exporting. Real OCR in-app is still the only way to make existing scans work, and still isn't built.

## Verification

Build and lint clean. All seven E2E flows green, including the new
`tests/e2e/readaloud.e2e.mjs` — controls render, the sentence list is built from the page's real
text (5 sentences on the fixture), jump and skip move the counter, and speed survives a reload.
It deliberately does not assert playback: headless Chromium produces no audio, and a test that
claimed otherwise would be lying.
