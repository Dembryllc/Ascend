# Easy Annotate — Claude Code Rules

> **Source of truth:** This repo's commit history is authoritative. If anything in this file conflicts with actual code in the repo, the code wins. Verify HEAD before acting on any status claim.

## CI/CD Status
- ✅ **CI WORKING (verified 2026-06-30).** The latest `main` deploy (`firebase-deploy.yml`, run for PR #4 "Redesign landing page", 2026-06-30 00:39) ran green and deployed to Firebase Hosting. The `FIREBASE_SERVICE_ACCOUNT_ASCEND_ANNOTATE` secret has been refreshed — auth no longer fails.
- Build + deploy both succeed on push to `main`. Live at easy-annotate.com.
- If auth breaks again: new JSON key from GCP Console → IAM → Service Accounts → update the `FIREBASE_SERVICE_ACCOUNT_ASCEND_ANNOTATE` GitHub secret. Manual fallback: `npm run build && firebase deploy --only hosting --project ascend-annotate`.

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
- **`annotationKind` values** — `'annotation'` | `'reflection'` only. These are stored together and filtered throughout.
- **`TrialExpiredModal` vs `UpgradeModal`** — expired trial teachers get `TrialExpiredModal`. Free-tier teachers (never had trial) get `UpgradeModal`. Not interchangeable.
- **Text selection capture** — `capturedSelection` state is intentionally NOT cleared when live selection goes empty. This is required on mobile because tapping the emoji bar clears `window.getSelection()` before the click fires.

## Firestore Indexes — Manual Deploy Required
CI does NOT deploy Firestore rules or indexes. Apply manually from Firebase Console:
- `annotations`: `studentId ASC → bookId ASC → pageNumber ASC`
- `annotations`: `studentId ASC → timestamp DESC`
- `annotations`: `bookId ASC → studentId ASC → pageNumber ASC`
- Composite index for graphic organizer: `organizers` collection, `studentId ASC + bookId ASC`
- Writing Tasks (`writingTasks`, `writingResponses`) need **no** composite indexes — tasks are
  queried by single-field equality (`createdBy` / `classroomId`) and responses are fetched by
  deterministic doc id `${studentId}_${taskId}` (see Writing Tasks section below).

## Writing Tasks (book-free writing) — added 2026-07-03
Standalone graphic-organizer writing that is **not tied to a book**. Reuses `ORGANIZER_TEMPLATES`.
- **Collections:** `writingTasks` (the prompt/assignment) and `writingResponses` (a learner's answer,
  doc id `${studentId}_${taskId}`). Types in `src/types/index.ts`; data layer in
  `src/firebase/writingTasks.ts` + `src/firebase/writingResponses.ts`.
- **Roles:** teachers create tasks assigned to their classroom (`classroomId` set) and can author a
  **sample/exemplar** (`sampleFields`, gated by `sampleVisible`). Students **and** individuals open a
  standalone `WritingTaskModal` from their home (`WritingSection` in `StudentHome.tsx`) and can also
  self-start a **personal** task (`classroomId: null` → private, never shown to a teacher).
- **Teacher UI:** `/teacher/writing` (`WritingTasksPage`) + dashboard quick action + nav item.
- **FERPA scoping** mirrors `organizers`: a response is readable by its owner and, only when
  `classroomId` is a string, by that classroom's teacher. Personal (null-classroom) writing stays
  private. Do not weaken this.
- **⚠️ Deploy step:** `firestore.rules` gained `writingTasks` + `writingResponses` blocks and the
  `isClassStudent` / `canAccessWritingTask` helpers. CI does NOT deploy rules — **publish
  `firestore.rules` manually** (Firebase Console → Firestore → Rules, or
  `firebase deploy --only firestore:rules --project ascend-annotate`) or the feature fails with
  permission-denied.

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
