# Easy Annotate — Claude Code Rules

> **Source of truth:** This repo's commit history is authoritative. If anything in this file conflicts with actual code in the repo, the code wins. Verify HEAD before acting on any status claim.

## CI/CD Status
- ✅ **CI WORKING (verified 2026-07-03).** Latest `main` deploy — "Deploy to Firebase" run #65 (commit `1308dd0`, the standalone Writing feature) — ran green in ~1 min: hosting + `firestore:rules` + `firestore:indexes` all released (`✔ firestore: released rules firestore.rules to cloud.firestore`). Live at easy-annotate.com.
- `firebase-deploy.yml` deploys `--only hosting,firestore:rules,firestore:indexes,storage` on push to `main`, authenticating with the `FIREBASE_SERVICE_ACCOUNT_ASCEND_ANNOTATE` secret. Firestore rules, indexes **and Storage rules** ship automatically — do NOT assume a manual Console step is needed. (`storage` was added 2026-09-02: book deletion needs a Storage rule, and storage.rules had never been deployed by CI.)
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
- **Navigation is rendered twice, and both are required** — `AppShell` renders a header nav row
  (`hidden sm:block`, >=640px) and a bottom bar (`sm:hidden`, <640px). Deleting either leaves that
  width with no navigation. This shipped once: the bottom bar was the only nav, so every teacher on
  an iPad had no route to Classroom, Upload, Writing, Annotations or Progress. Counting `nav a`
  links in the DOM does NOT prove navigation exists — the hidden bar is still in the DOM at desktop
  widths. Assert visibility at a real width. Covered by `tests/e2e/navigation.e2e.mjs`, which checks
  every destination at 390 / 768 / 1280px for both roles.
- **Storage deletes need their own `allow delete`** — `request.resource` is null on a delete, so a
  combined `allow write: if ... request.resource.contentType == 'application/pdf'` denies **every**
  delete. That is why student book deletions silently left their PDFs in the bucket until
  2026-09-02. `storage.rules` now splits `create, update` from `delete`. Teacher uploads also moved
  to `books/{teacherId}/...` so deletion can be scoped by owner — files uploaded before that are
  under a flat `books/` path and cannot be removed by any rule; their Firestore doc still deletes.
- **Book deletion order is load-bearing** — `deleteTeacherBook` deletes annotations, organizers and
  readingProgress BEFORE the book document. The rules authorising those deletes
  (`isAssignedBookTeacher`) resolve by reading the book doc, so removing the book first strands
  every child record permanently. The cascade also walks `assignedStudentIds` rather than querying
  annotations by `bookId` alone: a bookId-only query returns docs for unassigned students, the read
  rule rejects them, and one rejected doc fails the whole query.
- **Best-effort Storage cleanup must be time-boxed** — Storage requests have no deadline of their
  own, so an unreachable bucket leaves `deleteObject` pending forever and strands the teacher's
  confirmation dialog on "Deleting…". `deleteTeacherBook` races it against
  `STORAGE_CLEANUP_TIMEOUT_MS`. The Firestore doc is the source of truth and is already gone.
- **`npm run test:rules` runs one file at a time** — `--test-concurrency=1`. Every rules test file
  shares one emulator and calls `clearFirestore()` in `beforeEach`, so running them in parallel
  wipes each other's seed data and produces failures that look like broken rules but are not.
- **`annotationKind` values** — `'annotation'` | `'reflection'` only. These are stored together and filtered throughout.
- **`TrialExpiredModal` vs `UpgradeModal`** — expired trial teachers get `TrialExpiredModal`. Free-tier teachers (never had trial) get `UpgradeModal`. Not interchangeable.
- **Text selection capture** — `capturedSelection` state is intentionally NOT cleared when live selection goes empty. This is required on mobile because tapping the emoji bar clears `window.getSelection()` before the click fires.

## Firestore Rules & Indexes — Auto-Deployed by CI
`firebase-deploy.yml` runs `firebase deploy --only hosting,firestore:rules,firestore:indexes,storage`
on push to `main` (rules from `firestore.rules`, indexes from `firestore.indexes.json`, Storage rules
from `storage.rules`). Edit those files and merge to `main` and they publish automatically — no
manual Console step. Composite indexes
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

## Removing students and books — added 2026-09-02
Teachers can add students and books but for a long time could remove neither.
- **Remove a student** (`removeStudentFromClassroom`, ClassroomPage roster row) is **un-enrolment,
  not deletion**: the student keeps their account and everything they wrote, and the teacher simply
  stops being able to read it. Three writes, all required: drop them from `classrooms.studentIds`;
  clear their own `users/{uid}.classroomId` (or `validAnnotationClassroomLink` rejects every
  annotation they write from then on — a silent, total breakage); and drop them from the
  `assignedStudentIds` of the teacher's books, because `joinClassroomByCode` assigns the whole
  library on join and otherwise a removed student keeps read access to the teacher's PDFs.
- **Delete a book** (`deleteTeacherBook`, "Your Books" card) IS destructive and cascades to that
  book's annotations, organizers and readingProgress. The confirmation reads the count first
  (`countBookStudentRecords`) and names it — "This also deletes N student notes" — and the confirm
  button stays disabled until that count is known. See the two book-deletion gotchas above.
- **Rules:** `firestore.rules` gained the teacher-clears-`classroomId` branch on `users`, and
  `isAssignedBookTeacher` (renamed from `isBookTeacherForAnnotation`) now also authorises delete on
  `annotations`, `organizers` and `readingProgress`. That predicate is exactly the one that already
  granted the teacher READ on those documents, so this adds no visibility — only the ability to
  clear up what a deleted book leaves behind. Covered by `tests/rules/removal.test.mjs`.
- **E2E:** `tests/e2e/removal.e2e.mjs`, which must run LAST — it deletes seeded data the earlier
  flows read. It asserts the impact count, that both removals survive a reload, and that the student
  side shows no "Unknown Book" ghosts (MyAnnotationsPage's fallback for an orphaned annotation, and
  so the visible symptom of a cascade that did not run).

## Read Aloud — `src/hooks/useReadAloud.ts`
The engine lives in the hook, not `ReadingPage`; `ReadAloudBar` is the UI. The page only supplies
`getPageText()`.
- **Chrome fixes — do not revert:** `speechSynthesis.resume()` before `speak()` (stall bug); 50ms
  setTimeout after `cancel()` before `speak()` (race); `interrupted` errors from `cancel()` are
  swallowed — they should NOT show "Read aloud stopped".
- **A page is spoken as chunks, not one utterance** (`splitIntoChunks`, sentence-sized, max 220
  chars). This is what makes skip/start-anywhere possible — a single utterance has nothing to seek
  within — and it dodges a Chrome bug where long utterances stop partway with no error.
- **The generation ref (`genRef`) is load-bearing.** `cancel()` fires `onend` for the utterance it
  kills; without the guard that stale event chains to the next chunk and the page keeps reading
  after Stop. Every stop/restart bumps it, and every callback checks it.
- **Rate cannot change on a live utterance** — `setRate`/`setVoiceURI` restart the current sentence
  via `restartRef`. That restart lives in the setters, not an effect: it is user-initiated, and an
  effect trips `react-hooks/set-state-in-effect`.
- **`stop()` keeps the sentence list; `reset()` clears it.** Turning the page calls `reset()` — the
  chunks belong to the page just left, so Skip would otherwise walk the wrong text.
- **Voice quality is capped by the device.** Web Speech only exposes what the OS installed, so
  `scoreVoice` ranks Microsoft Neural > Online > Apple enhanced > Google. On Apple devices with no
  enhanced voice installed, `suggestBetterVoices` points the reader at Settings → Accessibility →
  Spoken Content → Voices. Consistently natural voices across all devices would need cloud TTS
  (backend + per-character cost + a privacy-policy line) — not built.
- **No-voice devices are handled** — some Chromebooks and Linux without speech-dispatcher never fire
  `voiceschanged`, so `start()` gives up after `VOICE_WAIT_MS` and says so rather than sitting on
  "Loading…" forever.
- Speed and voice persist in localStorage. Covered by `tests/e2e/readaloud.e2e.mjs`, which asserts
  the controls, sentence list, jump/skip and persistence — but deliberately NOT playback, since
  headless Chromium produces no audio.

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
