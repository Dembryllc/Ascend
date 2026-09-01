---
date: 2026-09-01
project: Easy Annotate
tags: [bug, pdf, accessibility, read-aloud, annotation]
---

# "Colour PDF" where highlighting and read aloud do nothing

## Report
Uploaded a colour PDF; annotation and Read aloud both did not work.

## Finding — the colour is a red herring; the text layer is the issue
Both features read the PDF's **text layer** via pdf.js `getTextContent()`:
highlighting needs selectable text spans, read aloud needs extracted words.
A PDF that was **scanned, photographed, or exported from a design tool** is a
picture of a page with no text underneath. It renders perfectly — in full
colour — and has nothing to select or speak.

Proved it with two PDFs of the *identical* colourful page
(`tests/e2e/fixtures/`), one printed with a text layer and one rasterised:

| | text-layer PDF | image-only PDF |
|---|---|---|
| renders in colour | yes (54 colour buckets) | yes (64 colour buckets) |
| text-layer spans | 7 | **0** |
| chars selectable by dragging | 162 | **0** |
| Read aloud | speaks | **"No readable text was found on this page."** |
| emoji + typed note | saves | saves |

So nothing in the app was broken. It just failed silently: dragging did
nothing at all, and read aloud's explanation was one small grey line below the
page navigation, easy to miss.

## Change
`ReadingPage` now probes each page for extractable text (`pageTextProbe`, keyed
by page number so a stale result can never describe the current page) and, when
a page is image-only:

- shows an amber "This page is a picture, not text" notice above the page,
  explaining why highlighting and Read aloud can't work and that emoji
  reactions and notes still can;
- disables the Read aloud button rather than offering an action that cannot
  succeed;
- swaps the annotation modal's "Select text on the page…" hint for one that
  makes sense on a picture.

The probe defaults to "has text" if it throws, so a failed probe never blocks
reading or read aloud.

## Verification
`tests/e2e/pdftext.e2e.mjs` drives both fixtures through the real reader and
asserts each side: the text PDF still selects (162 chars), is not flagged, and
keeps Read aloud enabled; the image-only PDF shows the notice, disables Read
aloud, and still saves an emoji + note. Pre-fix the image-only side reports
`banner=0 readAloudDisabled=false` and the flow fails. Full suite (writing,
register, pdftext) green.

## Still open — decision needed
This makes the failure legible; it does not make a scanned book readable.
**OCR is the only thing that would**, and it is a real decision:
client-side (tesseract.js — free, private, slow, ~2-4s/page and a few MB of
worker) vs. a cloud OCR API (fast, accurate, costs per page, and sends student
reading material off-device — a FERPA question). Not started; not to be added
without an explicit call.
