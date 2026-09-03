---
date: 2026-09-03
project: Easy Annotate
tags: [easy-annotate, pdf, upload, jspdf, ocr-deferred]
---

# Photo upload — convert phone photos to a PDF client-side

## Starting point
Came in with a two-part ask: fix scanned/CamScanner PDFs, and add support for
photos of book pages. Re-diagnosed the first part live before touching
anything, per the "GitHub is source of truth" rule.

## Diagnosis: the scanned-PDF bug was already fixed
`notes/2026-09-01-image-only-pdf.md` already covers this. Re-ran
`tests/e2e/pdftext.e2e.mjs` against a live CamScanner-equivalent fixture and
confirmed nothing regressed: rendering, the "no text layer yet" notice, the
disabled Read aloud button, and emoji + note annotations all behave correctly
on an image-only PDF. Also confirmed by direct pixel inspection that the page
canvas is fully painted (no blank-render bug) — annotations in this app are
page + optional-text-snippet records, not canvas-coordinate pins, so there was
never a "placement" mechanism that scanning could break. **No fix needed here.**

## What was actually missing: photo upload
Both upload forms (`UploadBookPage.tsx`, `StudentUploadPage.tsx`) only accepted
a single `.pdf` file. Added: select one or more JPG/PNG (and best-effort HEIC)
photos instead, and the app converts them into a single multi-page PDF
client-side before handing it to the exact same `uploadBook`/`uploadStudentBook`
functions used today.

**New:** `src/utils/imagesToPdf.ts` — `convertImagesToPdf()`:
- Each photo is downscaled to a 2000px max dimension and re-encoded as JPEG
  (quality 0.85) via Canvas, so a handful of 4000px phone photos don't blow
  past the existing 50 MB Storage cap.
- Built into a PDF with `jsPDF` (already a dependency, previously only used by
  `exportOrganizerPDF`), one image per page, `unit: 'px'` matching the pattern
  already proven in `tests/e2e/fixtures/make-pdfs.mjs`.
- Multi-photo selections are sorted by filename first, so a folder of
  `IMG_0001.jpg, IMG_0002.jpg, …` becomes pages in the right order.
- HEIC files are accepted but only decode where the browser can (Safari);
  elsewhere the user gets a named error telling them to export as JPEG.

Because the output is a plain `File` with `type: 'application/pdf'`, it needs
**no changes** to Storage rules (already gate on `contentType ==
'application/pdf'`), Firestore rules, or `ReadingPage` — a converted photo-PDF
is indistinguishable from any other image-only PDF, so it gets the exact
"no text layer yet" treatment from the 2026-09-01 fix for free.

Zero new paid services — jsPDF + Canvas + File API, all client-side.

## Verification
No Storage emulator exists in this repo's test harness (`firebase.emulator.json`
only runs Auth + Firestore), so the real Storage `uploadBytesResumable` leg
isn't covered by `test:e2e`. Verified everything up to that boundary directly
in a real browser instead:
- Called `convertImagesToPdf()` on 3 generated photos and parsed the result
  with the app's own `pdfjs-dist` — valid 3-page PDF, 96 KB, 0 text
  items/page (correctly behaves as image-only).
- Rendered each resulting page to canvas and screenshotted — correct order,
  colors, orientation.
- Drove the real `StudentUploadPage` UI with `setInputFiles([...3 jpgs])` —
  shows "Converting photos to a PDF…" then "3 photos → scanned-book.pdf",
  auto-fills title, enables submit.
- Full existing e2e suite (writing, register, pdftext, annotations,
  navigation, readaloud, removal) — all 7 flows green, no regressions.
- Rules suite — 35/35 green (untouched, as expected).
- `tsc -b`, `eslint .`, `npm run build` all clean.

## Still open — OCR (unchanged from 2026-09-01)
Explicitly deferred again this session per the "don't add complexity that
delays the core fix" instruction. Tesseract.js remains the right free/
browser-native answer if this comes up again — it's a separate feature
(synthesizing a text layer + word bounding boxes for highlight support,
5-15s/page), not a small addition to this one.

## Shipped
Commit `adab3a6` on `main`, deployed by `firebase-deploy.yml` run #95 —
green in ~2 min (rules tests → build → hosting/rules/storage deploy). Live at
easy-annotate.com.
