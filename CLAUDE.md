# Easy Annotate — Claude Code Rules

> **Source of truth:** This repo's commit history is authoritative. If anything in this file conflicts with actual code in the repo, the code wins. Verify HEAD before acting on any status claim.

## CI/CD Status
- ✅ **CI WORKING (verified 2026-07-03).** Latest `main` deploy — "Deploy to Firebase" run #65 (commit `1308dd0`, the standalone Writing feature) — ran green in ~1 min: hosting + `firestore:rules` + `firestore:indexes` all released (`✔ firestore: released rules firestore.rules to cloud.firestore`). Live at easy-annotate.com.
- `firebase-deploy.yml` deploys `--only hosting,firestore:rules,firestore:indexes` on push to `main`, authenticating with the `FIREBASE_SERVICE_ACCOUNT_ASCEND_ANNOTATE` secret. Rules + indexes ship automatically — do NOT assume a manual Console step is needed.
- If auth breaks again: new JSON key from GCP Console → IAM → Service Accounts → update the `FIREBASE_SERVICE_ACCOUNT_ASCEND_ANNOTATE` GitHub secret. Manual fallback: `npm run build && firebase deploy --only hosting --project ascend-annotate`.

## Notes / Session Log
- Session logs live in the repo at `notes/` (e.g. `notes/2026-07-03-writing-feature.md`), Obsidian-friendly frontmatter (date/project/tags).
- The Obsidian vault is **local** (Mac / iCloud) — cloud/remote sessions CANNOT reach it. Sync locally: `git pull origin main` → copy the note into the vault, or run the local `/record-to-vault` skill.

## Stack
- React 19 + TypeScript + Vite 8 + Tailwind CSS v4 (no tailwind.config.js — configured inline)
- Firebase 12: Auth + Firestore + Storage + Hosting
- Firebase project: `ascend-annotate`
- Live: easy-annotate.com (Firebase Hosting — not Netlify, Netlify is paused)
- **Node 22 required** — Vite 8 and TypeScript 6 do not run on Node 20
- Install: `npm install --legacy-peer-deps` (required — peer-dep situation is fragile, don't add new packages without flagging why)

## FERPA — Absolute Rules
- Student email is NOT stored in Firestore — Firebase Auth only (intentional PII minimization)
- `UserProfile.email` is typed `email?: string` — always handle undefined
- Teacher access to annotations and progress is classroom-scoped by Firestore rules — never weaken this
- FERPA notices on `AnnotationsViewerPage` and `ProgressDashboardPage` must remain visible
- Do not write student names (only nicknames/first names at registration)

## Critical Gotchas — Do Not Change
- **PDF.js worker** — do not use `?url` imports or CDN URLs. The `pdfWorkerPlugin` in `vite.config.ts` copies `pdf.worker.mjs` to `dist/`. Hardcoded as `'/pdf.worker.mjs'` in ReadingPage.tsx. All three alternatives were tried and failed.
- **`--legacy-peer-deps`** — required for all npm operations. Do not remove.
- **`user-select: none`** — do not apply inside `#pdf-container`. Breaks text selection for annotation.
- **Registration step order** — profile `setDoc` must happen BEFORE classroom join in `registerUser()`. Do not reorder. See `src/firebase/auth.ts`.
- **Registration profile race** — `createUserWithEmailAndPassword` signs the user in *before* `registerUser()` writes the Firestore profile, so `onAuthStateChanged` fires and reads an empty profile (a class join code widens the window with two extra round-trips). Three guards must stay in place, or new accounts get a false "Account setup incomplete": (1) `AuthContext` re-reads the profile with backoff (`PROFILE_RETRY_DELAYS_MS`) before settling on `null`, (2) `RegisterPage` awaits `refreshProfile()` before `navigate()`, (3) `ProtectedRoute` does one more `refreshProfile()` before showing the recovery screen. Covered by `tests/e2e/register.e2e.mjs`.
- **Text layer is required for highlighting + read aloud** — both features read the PDF's text layer (`getTextContent()`). A scanned, photographed, or design-tool-exported PDF is a picture with no text underneath, so both are impossible on it however well the page renders. `ReadingPage` probes each page (`pageTextProbe` / `pageIsImageOnly`) and shows a "This page is a picture, not text" notice plus a disabled Read aloud button. Emoji reactions and typed notes still work on those pages — do not gate them on the text layer. There is no OCR; adding it is the only way to change this. Covered by `tests/e2e/pdftext.e2e.mjs`.
- **`annotationKind` values** — `'annotation'` | `'reflection'` only. These are stored together and filtered throughout.
- **`TrialExpiredModal` vs `UpgradeModal`** — expired trial teachers get `TrialExpiredModal`. Free-tier teachers (never had trial) get `UpgradeModal`. Not interchangeable.
- **Text selection capture** — `capturedSelection` state is intentionally NOT cleared when live selection goes empty. This is required on mobile because tapping the emoji bar clears `window.getSelection()` before the click fires.

## Firestore Rules & Indexes — Auto-Deployed by CI
`firebase-deploy.yml` runs `firebase deploy --only hosting,firestore:rules,firestore:indexes` on
push to `main` (rules from `firestore.rules`, indexes from `firestore.indexes.json`). Edit those
files and merge to `main` and they publish automatically — no manual Console step. Composite indexes
currently defined:
- `annotations`: `studentId ASC → bookId ASC → pageNumber ASC`
- `annotations`: `studentId ASC → timestamp DESC`
- `annotations`: `bookId ASC → studentId ASC → pageNumber ASC`
- Composite index for graphic organizer: `organizers` collection, `studentId ASC + bookId ASC`
- Writing Tasks (`writingTasks`, `writingResponses`) need **no** composite indexes — tasks are
  queried by single-field equality (`createdBy` / `classroomId`) and responses are fetched by
  deterministic doc id `${studentId}_${taskId}` (see Writing Tasks section below).

## Writing Tasks (book-free writing) — added 2026-07-03
Standalone graphic-organizer writing that is **not tied to a book**. Reuses `ORGANIZER_TEMPLATES`.
- **Collections:** `writingTasks` (the prompt/assignment), `writingResponses` (a learner's answer,
  doc id `${studentId}_${taskId}`), and `writingFeedback` (teacher comment + reviewed flag, doc id
  `${studentId}_${taskId}`, kept separate so student writes the response and teacher writes the
  feedback). Types in `src/types/index.ts`; data layer in `src/firebase/writingTasks.ts`,
  `writingResponses.ts`, `writingFeedback.ts`.
- **Roles:** teachers create tasks assigned to their classroom (`classroomId` set) and can author a
  **sample/exemplar** (`sampleFields`, gated by `sampleVisible`). Students **and** individuals open a
  standalone `WritingTaskModal` from their home (`WritingSection` in `StudentHome.tsx`) and can also
  self-start a **personal** task (`classroomId: null` → private, never shown to a teacher).
- **Teacher UI:** `/teacher/writing` (`WritingTasksPage`, create/assign/sample) and
  `/teacher/writing/:taskId` (`WritingResponsesPage`) — per-student responses, completion roll-up,
  and a comment + "reviewed" feedback box. Feedback shows back to the learner on the home card
  (Feedback chip) and inside `WritingTaskModal`.
- **FERPA scoping** mirrors `organizers`: a response is readable by its owner and, only when
  `classroomId` is a string, by that classroom's teacher; feedback is written only by the class
  teacher and read by that teacher + the student it's about. Personal (null-classroom) writing stays
  private. Do not weaken this.
- **Deploy:** `firestore.rules` gained `writingTasks`, `writingResponses`, `writingFeedback` blocks
  and the `isClassStudent` / `canAccessWritingTask` helpers. These ship automatically — CI deploys
  `firestore:rules` on push to `main` (see "Firestore Rules & Indexes" above). No new composite
  indexes required.
- **Rules tests:** `npm run test:rules` boots the Firestore emulator (needs Java) and runs
  `tests/rules/*.test.mjs` against `firestore.rules` — covers read/write scoping for all three
  writing collections, incl. the classroom-pinning edge cases. Dev-only deps: `firebase-tools`,
  `@firebase/rules-unit-testing`. Emulator config is `firebase.test.json` (separate from the deploy
  `firebase.json`).
- **Browser E2E:** `npm run test:e2e` boots Auth+Firestore emulators (`firebase.emulator.json`),
  seeds a teacher/student/task (`tests/e2e/seed.mjs`), runs Vite with `VITE_USE_EMULATORS=true`, and
  drives Chromium through the full write → review → feedback loop (`tests/e2e/writing.e2e.mjs`)
  then the sign-up regression flow (`tests/e2e/register.e2e.mjs` — student registration with and
  without a class join code, asserting the "Account setup incomplete" screen never appears), then the
  image-only-PDF flow (`tests/e2e/pdftext.e2e.mjs` — the same colourful page as a text-layer PDF and
  as a scan, asserting selection + read aloud work on one and are explained away on the other),
  screenshotting each step. `tests/e2e/seed-pdfs.mjs` seeds the two fixture books;
  `tests/e2e/fixtures/make-pdfs.mjs` regenerates the fixture PDFs. `run.sh` takes the screenshot dir as `$1` and a space-separated flow list
  as `$2`. `src/firebase/config.ts` connects to the emulators only when
  `VITE_USE_EMULATORS === 'true'` (no-op in prod). Dev-only dep: `playwright` (uses the image's
  pre-installed Chromium via `executablePath`, so no `playwright install`).

## Read Aloud (Chrome fixes — do not revert)
- `window.speechSynthesis.resume()` before `speak()` — fixes Chrome stall bug
- 50ms setTimeout after `cancel()` before calling `speak()` — fixes Chrome race condition
- `interrupted` errors from `cancel()` are swallowed — they should NOT show "Read aloud stopped"

## Stripe — Current State
- Webhook deployed as Cloud Function (`stripewebhook-v7wgh3m3ca-uc.a.run.app`)
- Phase 2 (checkout button/redirect in UI) NOT yet done — do not add it without explicit instruction
- Phase 3 (trial-expiry email) NOT started — do not add it without explicit instruction
- Do not duplicate the webhook backend — it's already deployed

## DNS (Netlify DNS — not a registrar)
DNS is managed at `app.netlify.com/teams/dembryllc/dns`, not at a separate domain registrar.
If you need to change DNS, go there, not to a registrar.

## Branches
- `main` is the only active branch — push goes directly to main
- Git auth: HTTPS may fail. Use SSH: `git remote set-url origin git@github.com:Dembryllc/Ascend.git`
