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

## Claude Code settings

`.claude/settings.json` is committed to the repo and allows `git push` commands to run without a confirmation prompt. This means all code changes are committed and pushed to `origin/main` automatically without asking for approval.

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
| `users` | Auth profile (uid, role, displayName, classroomId, subscriptionStatus, trialEndsAt?). **Teachers** include `email`. **Students** do not — email stays in Firebase Auth only (FERPA PII minimization). |
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
| `src/pages/student/StudentProgressPage.tsx` | Student's own reading stats: minutes, annotations, books completed, streak, per-book progress bars with reaction breakdowns, weekly goal meter. Route: `/student/progress`. |
| `src/pages/teacher/AnnotationsViewerPage.tsx` | Teacher view of student annotations, PDF export. Shows `TrialExpiredModal` when trial is expired and teacher hits PDF export gate. Contains FERPA notice. |
| `src/pages/teacher/ProgressDashboardPage.tsx` | Reading time + completion tracking per student. Contains FERPA notice. |
| `src/pages/teacher/UploadBookPage.tsx` | Book upload form. Shows `TrialExpiredModal` when trial is expired and teacher hits the 5-book free limit. |
| `src/firebase/annotations.ts` | `saveAnnotation`, `updateAnnotation`, `deleteAnnotation`, `getAnnotationsByStudentAndBook`, `getAnnotationsByStudent`, `getAnnotationsByClassAndBook` |
| `src/firebase/auth.ts` | `registerUser` (sets `trialEndsAt` for teachers, writes `subscriptionStatus: 'free'` for all users, does NOT write student email to Firestore), `loginUser`, `logoutUser`, `sendPasswordReset`, `getUserProfile` (deserializes `trialEndsAt` from Firestore Timestamp). |
| `src/firebase/books.ts` | `uploadBook` (teacher), `uploadStudentBook` (student), both ≤50 MB, both wrap Firestore `addDoc` in try/catch with Storage rollback on failure. |
| `src/firebase/readingProgress.ts` | Upserts progress; never allows `totalSecondsRead` or `highestPageRead` to decrease. |
| `src/types/index.ts` | All shared types. `ReactionType`, `Annotation`, `Book`, `ReadingProgress`, `REACTIONS` map. `isPro()` and `getTrialDaysRemaining()` helpers. `UserProfile.email` is optional (`email?: string`) — students have no email in Firestore. |
| `src/components/layout/AppShell.tsx` | App chrome. Contains `TrialBanner` component (teachers only, dismissible per session via `sessionStorage`). |
| `src/components/shared/TrialExpiredModal.tsx` | Modal shown when a teacher's trial has ended and they hit a Pro gate. Distinct from `UpgradeModal`. |
| `src/components/shared/UpgradeModal.tsx` | Generic upgrade prompt for free-tier teachers (no trial). Keep as-is. |
| `vite.config.ts` | Contains `pdfWorkerPlugin` — copies `pdf.worker.mjs` to `dist/` at build time. |
| `functions/src/index.ts` | Stripe webhook Cloud Function (firebase-functions v2). Handles `checkout.session.completed` (→ `subscriptionStatus: 'pro'`), `customer.subscription.deleted/updated` (→ free/pro). Deployed to `us-central1`. Secrets: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`. |
| `.github/workflows/firebase-deploy.yml` | CI/CD pipeline. Node 22, `npm ci --legacy-peer-deps`, Vite build, Firebase CLI deploy. Includes `VITE_STRIPE_PRO_MONTHLY_URL` and `VITE_STRIPE_PRO_ANNUAL_URL`. |

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

## Reverse free trial

Every new **teacher** gets 14 days of full Pro access automatically at signup — no credit card required. Students never get a trial.

### How it works

- `registerUser()` writes `trialEndsAt: new Date(now + 14 days)` into the `users/{uid}` Firestore doc for teachers. Students get no `trialEndsAt` field.
- `getUserProfile()` deserializes `trialEndsAt` from Firestore Timestamp to `Date`.
- `isPro(profile)` returns `true` if `subscriptionStatus === 'pro' | 'district'` **OR** if `trialEndsAt > now`. Both conditions grant full Pro access.
- `getTrialDaysRemaining(profile)` returns the integer days left (ceiling), or `null` if trial is expired, not set, or user is already paid Pro.

### Trial banner (`AppShell`)

Renders between the sticky header and `<main>` for teachers with an active trial. Color shifts by urgency:

| Days remaining | Color |
|---|---|
| 8+ | Blue (`bg-blue-50`) |
| 4–7 | Amber (`bg-amber-50`) |
| 1–3 | Red (`bg-red-50`) |

Dismissible once per browser session via `sessionStorage` key `trial-banner-dismissed`. Disappears automatically when the trial expires.

### Trial-expired gate (`TrialExpiredModal`)

Shown instead of the generic `UpgradeModal` when a teacher's trial has ended and they hit a Pro-gated feature. Two places it appears:

1. **Upload book** — when `atLimit && trialExpired` (teacher is at the 5-book free cap AND their trial is past). `onClose` navigates to `/teacher`.
2. **PDF export** — when teacher clicks the locked Export button and `trialExpired` is true.

The `trialExpired` condition used in both pages:
```ts
const trialExpired = profile?.role === 'teacher'
  && profile?.trialEndsAt != null
  && profile.trialEndsAt <= new Date()
  && !isPro(profile)
```

### What is NOT done yet (future phases)

- **Stripe checkout flow** — the webhook is deployed and payment links are in CI, but the actual checkout button/redirect to Stripe is not wired in the UI yet (Phase 2 remaining work).
- No automated trial-expiry email — that is Phase 3 (a Cloud Function scheduled task).
- No server-side enforcement of trial expiry — the `trialEndsAt` check is client-only. Firestore rules do not gate on it.

---

## FERPA compliance

Easy Annotate is used in K-12 and higher-education classrooms. The following design decisions are intentional and must not be reversed:

### PII minimization

- **Student email is not stored in Firestore.** It lives in Firebase Authentication only, which is isolated from annotation and progress data. The `setDoc` call for student profiles intentionally omits `email`.
- **Teacher email is stored** (needed for account recovery and future billing).
- `UserProfile.email` is typed as `email?: string` — always treat it as potentially undefined.
- The `RegisterPage` prompts students for a first name or nickname, not their full name. The label, placeholder, and helper text are role-conditional.

### Data scoping

- Teacher access to annotations and progress is restricted by Firestore security rules to their own classroom only. No cross-classroom reads exist.
- FERPA notice ("Student data is protected under FERPA and used solely for educational purposes.") appears on both `AnnotationsViewerPage` and `ProgressDashboardPage`.

### PrivacyPage

`src/pages/legal/PrivacyPage.tsx` has a full FERPA section explaining purpose limitation, no third-party disclosure, PII minimization by design, scoped teacher access, and deletion-on-request policy. Keep it in sync with any future data model changes.

---

## Student registration flow

`registerUser()` in `src/firebase/auth.ts` — order matters:

1. `createUserWithEmailAndPassword` — auth account created, user is now signed in.
2. `updateProfile` — display name set.
3. *(Students only)* Validate join code via Firestore query (requires being signed in). Invalid code → delete auth account and throw so the user can retry.
4. `setDoc users/{uid}` — profile written. **This is the critical step.** Auth account is deleted and error re-thrown if this fails. Always writes `subscriptionStatus: 'free'`. Teachers get `email` and `trialEndsAt`; students get neither.
5. *(Students only, non-critical)* `joinClassroomByCode` WriteBatch — updates `classrooms/{id}.studentIds` and `users/{uid}.classroomId` atomically. Failure here is logged but does not block registration; the student joins later via the onboarding checklist.

**Do not reorder steps 4 and 5.** The profile must exist before the classroom join so that any classroom join failure leaves the user with a valid account rather than an orphaned auth entry.

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
- **Do not add trial-expiry email logic yet** — that is Phase 3 (Cloud Function scheduled task). Stripe webhook backend is already deployed; don't duplicate or conflict with it.
- **Do not reorder the registration steps in `registerUser()`** — profile `setDoc` must happen before the classroom join. See the Student registration flow section above.
- **Do not use `UpgradeModal` for trial-expired teachers** — use `TrialExpiredModal`. `UpgradeModal` is for free-tier teachers who never had a trial.
- **Do not write student email to Firestore** — student emails belong in Firebase Auth only. This is a deliberate FERPA PII minimization decision. Teachers still get their email stored.
- **Do not make `UserProfile.email` required** — it is `email?: string` because student profiles never have it. Any code reading `profile.email` must handle undefined.
- **Do not remove the FERPA notices** from `AnnotationsViewerPage` and `ProgressDashboardPage` — they are visible signals to teachers that student data is handled compliantly.

---

## CI/CD

`.github/workflows/firebase-deploy.yml` triggers on every push to `main`:
1. Checkout → Node 22 → `npm ci --legacy-peer-deps`
2. `npm run build` with all `VITE_FIREBASE_*` env vars set inline in the workflow
3. Firebase CLI deploy via `GOOGLE_APPLICATION_CREDENTIALS` pointing to the service account JSON stored in GitHub secret `FIREBASE_SERVICE_ACCOUNT_ASCEND_ANNOTATE`

The deploy targets Firebase Hosting only (`--only hosting`). Firestore rules and indexes are **not** deployed by CI — apply them manually from the Firebase Console.

### Stripe webhook (Cloud Function)

Deployed separately via Firebase CLI (`firebase deploy --only functions`). Not part of the GitHub Actions workflow.

- **Live URL:** `https://stripewebhook-v7wgh3m3ca-uc.a.run.app`
- **Secrets** (set via `firebase functions:secrets:set`): `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
- **Firestore writes:** sets `subscriptionStatus` and `stripeCustomerId` on `users/{uid}`
- **Events handled:** `checkout.session.completed`, `customer.subscription.deleted`, `customer.subscription.updated`

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
VITE_STRIPE_PRO_MONTHLY_URL   # Stripe payment link for monthly Pro plan
VITE_STRIPE_PRO_ANNUAL_URL    # Stripe payment link for annual Pro plan
```

For local dev, put these in a `.env` file (gitignored). In CI, they are hardcoded in the workflow YAML. Firebase API keys are safe to expose in client bundles — security is enforced by Firestore and Storage rules.
