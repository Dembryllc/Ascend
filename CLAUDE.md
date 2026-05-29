# CLAUDE.md — Easy Annotate (Dembryllc/Ascend)

## Project overview

Easy Annotate is a React SPA where students read PDFs page-by-page and leave emoji-based reactions with optional written notes. Teachers upload books, manage classrooms, and review student annotations.

- **Live URL:** easy-annotate.com
- **Firebase project:** `ascend-annotate`
- **Repo:** Dembryllc/Ascend, default branch `main`

---

## Commands

```bash
npm install --legacy-peer-deps   # install (requires --legacy-peer-deps)
npm run dev                      # dev server at localhost:5173
npm run build                    # tsc -b && vite build → dist/
npm run lint                     # eslint
```

**Node 22+ is required.** Vite 8 and TypeScript 6 do not run on Node 20.

Build must be clean (zero TypeScript errors) before pushing. `tsc -b` runs before Vite in the build script.

---

## Stack

| | |
|---|---|
| React 19 + TypeScript + Vite 8 | Frontend |
| Tailwind CSS v4 (`@tailwindcss/vite`) | Styling — no tailwind.config.js, configured inline |
| Firebase 12 (Auth + Firestore + Storage) | Backend |
| react-pdf v10 + pdfjs-dist v5 | PDF rendering |
| jsPDF v4 | Annotation PDF export |
| React Router v7 | Routing |
| Firebase Hosting | Production hosting (auto-deploy via GitHub Actions) |

---

## Architecture

### Roles

Two roles defined in Firestore `users/{uid}.role`:
- `student` — reads books, annotates, views own annotations
- `teacher` — uploads books, manages classrooms, views all annotations

Role is set at registration and never changes. `ProtectedRoute` enforces role per route.

### Firebase collections

| Collection | Purpose |
|---|---|
| `users` | Auth profile (uid, role, displayName, classroomId) |
| `classrooms` | Teacher-owned, students join via 6-char code |
| `books` | PDFs in Storage, metadata in Firestore; `assignedStudentIds[]` controls access |
| `annotations` | Per-student per-book per-page reactions + notes |
| `readingProgress` | Last page, total time, completion % per student+book |

### Firestore security rules summary

- Users read their own profile; any signed-in user reads classrooms (join-code lookup).
- Books readable only if `uid ∈ assignedStudentIds` or `uploadedBy == uid`.
- Annotations: students own theirs; teachers read any annotation in their classroom.
- Reading progress: students write their own; progress `totalSecondsRead` and `highestPageRead` can only increase (enforced in rules).

### Composite Firestore indexes required

Defined in `firestore.indexes.json`. Without them annotation queries fail silently:
- `annotations`: `studentId ASC → bookId ASC → pageNumber ASC`
- `annotations`: `studentId ASC → timestamp DESC`
- `annotations`: `bookId ASC → studentId ASC → pageNumber ASC`

---

## Key files

| File | Notes |
|---|---|
| `src/pages/student/ReadingPage.tsx` | Main reader. PDF viewer, annotation toolbar, floating emoji bar, speech, progress tracking. Most complexity lives here. |
| `src/pages/student/MyAnnotationsPage.tsx` | All annotations across books, filter by book/reaction, edit modal. |
| `src/pages/teacher/AnnotationsViewerPage.tsx` | Teacher view of student annotations, PDF export. |
| `src/pages/teacher/ProgressDashboardPage.tsx` | Reading time + completion tracking per student. |
| `src/firebase/annotations.ts` | `saveAnnotation`, `updateAnnotation`, `deleteAnnotation`, `getAnnotationsByStudentAndBook`, `getAnnotationsByStudent`, `getAnnotationsByClassAndBook` |
| `src/firebase/books.ts` | `uploadBook` (teacher), `uploadStudentBook` (student), both ≤50 MB, both wrap Firestore `addDoc` in try/catch with Storage rollback on failure. |
| `src/firebase/readingProgress.ts` | Upserts progress; never allows `totalSecondsRead` or `highestPageRead` to decrease. |
| `src/types/index.ts` | All shared types. `ReactionType`, `Annotation`, `Book`, `ReadingProgress`, `REACTIONS` map. |
| `vite.config.ts` | Contains `pdfWorkerPlugin` — copies `pdf.worker.mjs` to `dist/` at build time. |
| `.github/workflows/firebase-deploy.yml` | CI/CD pipeline. Node 22, `npm ci --legacy-peer-deps`, Vite build, Firebase CLI deploy. |

---

## PDF.js worker — do not change

The worker is copied to `dist/pdf.worker.mjs` by `pdfWorkerPlugin` in `vite.config.ts`. `ReadingPage.tsx` hardcodes `pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.mjs'`.

**`pdfjs-dist` is nested inside `react-pdf`'s node_modules**, not at the root. The plugin resolves it from `node_modules/react-pdf/node_modules/pdfjs-dist/build/pdf.worker.mjs` with a root-first fallback. Do not change the worker path, switch to a CDN URL, or use a `?url` import — all three approaches were tried and failed.

---

## Annotation flow — how it works

1. **Text selection capture:** A `selectionchange` listener stores selected text in `capturedSelection` state the moment the user selects it. The state is never cleared when selection goes empty — only cleared on `closePanel()` or page change. This is required because tapping the emoji toolbar clears the live `window.getSelection()` on mobile before the click handler fires.

2. **Floating emoji bar:** When text is selected inside `#pdf-container`, a `position: fixed` emoji bar appears above the selection (using `getBoundingClientRect()` for coordinates). The user taps an emoji there to annotate without scrolling. The bar passes the captured text directly via `openAnnotationPanel(type, undefined, capturedText)`.

3. **Bottom toolbar:** The five reaction buttons below the PDF also work — they call `openAnnotationPanel(type)` which reads `capturedSelection` state (already captured before the tap cleared the live selection).

4. **Annotation panel modal:** Slides up from bottom on mobile. Shows: emoji selector, highlighted quote (from `selectedText` state), note textarea (optional, max 500 chars), Save / Cancel / Delete.

5. **Editing existing annotations:** In the reading page sidebar, tapping any annotation navigates to its page and opens the edit panel. The "Your notes on this page" section below the PDF also has an Edit button per annotation.

---

## Speech / Read Aloud

Uses `window.speechSynthesis` (Web Speech API — no third-party SDK).

- `speakPage()` extracts page text via `pdfDocument.getPage(n).getTextContent()`.
- `pickVoice()` ranks available voices: `enhanced/neural/premium` → `Google` → `en-US` → any English. Handles the `voiceschanged` async timing issue.
- Header shows **Read Aloud** button when idle, **Stop** button while speaking (min 44×44px touch target).
- `stopSpeaking()` calls `speechSynthesis.cancel()` immediately.
- Speech auto-stops on page navigation.

---

## Do not do these things

- **Do not change the Firebase project ID** (`ascend-annotate`) or Storage bucket name anywhere.
- **Do not install new npm packages** without explaining why — the peer-dep situation is fragile (`--legacy-peer-deps` is required).
- **Do not add `user-select: none`** to anything inside `#pdf-container` — it breaks text selection for annotation.
- **Do not use `?url` imports or CDN URLs for the PDF.js worker** — been tried, broken on iOS Safari and across build environments.
- **Do not weaken Firestore security rules.** The annotation read rule allows teacher access scoped to `classroomId`; the progress write rule enforces monotonic increases.
- **Do not change the `annotationKind` field values** (`'annotation'` | `'reflection'`). Reflections are stored in the same collection and filtered by this field throughout.
- **Do not push to main without a passing build.** The CI workflow (`firebase-deploy.yml`) will attempt a deploy on every push.

---

## CI/CD

`.github/workflows/firebase-deploy.yml` triggers on every push to `main`:
1. Checkout → Node 22 → `npm ci --legacy-peer-deps`
2. `npm run build` with all `VITE_FIREBASE_*` env vars set inline in the workflow
3. Firebase CLI deploy via `GOOGLE_APPLICATION_CREDENTIALS` pointing to the service account JSON stored in GitHub secret `FIREBASE_SERVICE_ACCOUNT_ASCEND_ANNOTATE`

The deploy targets Firebase Hosting only (`--only hosting`). Firestore rules and indexes are **not** deployed by CI — apply them manually from the Firebase Console.

---

## Hosting: Netlify → Firebase (migrated 2026-05-28)

**easy-annotate.com is fully served by Firebase Hosting.** Netlify is no longer the live host.

### DNS (managed at Netlify DNS — not a third-party registrar)

DNS nameservers: `dns1-4.p03.nsone.net`. Records are edited at `app.netlify.com/teams/dembryllc/dns`, not at a separate registrar.

Current records pointing to Firebase:

| Type | Name | Value |
|---|---|---|
| A | `easy-annotate.com` | `199.36.158.100` |
| CNAME | `www.easy-annotate.com` | `ascend-annotate.web.app` |
| TXT | `easy-annotate.com` | `hosting-site=ascend-annotate` (Firebase ownership verification) |

### Firebase Auth authorized domains

Both `easy-annotate.com` and `www.easy-annotate.com` are in Firebase Console → Authentication → Settings → Authorized Domains. Both must remain there or logins will fail with `auth/unauthorized-domain`.

### Key facts

- **Firebase project ID:** `ascend-annotate`
- **Firebase Hosting URL:** `ascend-annotate.web.app`
- **Firebase Hosting IP (apex A record):** `199.36.158.100`
- **Domain auto-renews:** 2027-04-20 (through Netlify)
- **Netlify project:** still exists but paused (credit limit exceeded) — do not rely on it, do not delete it until billing is resolved

### Rollback to Netlify

Go to Netlify DNS → delete the `A` record for `199.36.158.100` → add a NETLIFY-type record pointing `easy-annotate.com` to `ascend-annotate.netlify.app`. Netlify DNS propagates in seconds. Requires Netlify billing to be active.

---

## Environment variables

Required at build time (baked into the bundle by Vite):

```
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
```

For local dev, put these in a `.env` file (gitignored). In CI, they are hardcoded in the workflow YAML. Firebase API keys are safe to expose in client bundles — security is enforced by Firestore and Storage rules.
