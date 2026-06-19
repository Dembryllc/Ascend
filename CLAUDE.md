# CLAUDE.md — Easy Annotate (Dembryllc/Ascend)

## Project overview

Easy Annotate is a React SPA where students read PDFs page-by-page and leave emoji-based reactions with optional written notes. Teachers upload books, manage classrooms, and review student annotations.

- **Live URL:** easy-annotate.com (Firebase Hosting; DNS at Netlify DNS)
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

**Node 22+ required.** Vite 8 and TypeScript 6 do not run on Node 20.  
Build must be clean (zero TypeScript errors) before pushing. `tsc -b` runs before Vite.

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

## Do not do these things

- **Do not change the Firebase project ID** (`ascend-annotate`) or Storage bucket name anywhere.
- **Do not install new npm packages** without explaining why — the peer-dep situation is fragile (`--legacy-peer-deps` is required).
- **Do not add `user-select: none`** to anything inside `#pdf-container` — it breaks text selection for annotation.
- **Do not use `?url` imports or CDN URLs for the PDF.js worker** — been tried, broken on iOS Safari and across build environments.
- **Do not weaken Firestore security rules.** The annotation read rule allows teacher access scoped to `classroomId`; the progress write rule enforces monotonic increases.
- **Do not change the `annotationKind` field values** (`'annotation'` | `'reflection'`). Reflections are stored in the same collection and filtered by this field throughout.
- **Do not push to main without a passing build.** The CI workflow (`firebase-deploy.yml`) will attempt a deploy on every push.
- **Do not add trial-expiry email logic yet** — Phase 3 (Cloud Function scheduled task). Stripe webhook backend is already deployed; don't conflict with it.
- **Do not reorder the registration steps in `registerUser()`** — profile `setDoc` must happen before the classroom join.
- **Do not use `UpgradeModal` for trial-expired teachers** — use `TrialExpiredModal`. `UpgradeModal` is for free-tier teachers who never had a trial.
- **Do not write student email to Firestore** — student emails belong in Firebase Auth only (FERPA PII minimization). Teachers still get their email stored.
- **Do not make `UserProfile.email` required** — it is `email?: string` because student profiles never have it.
- **Do not remove the FERPA notices** from `AnnotationsViewerPage` and `ProgressDashboardPage`.

---

## FERPA compliance

- **Student email is not stored in Firestore.** Firebase Auth only. The `setDoc` for students intentionally omits `email`.
- **Teacher email is stored** (needed for account recovery and billing).
- `UserProfile.email` is `email?: string` — always treat as potentially undefined.
- `RegisterPage` prompts students for first name or nickname, not full name.
- Teacher access scoped by Firestore rules to their own classroom only.
- FERPA notice on both `AnnotationsViewerPage` and `ProgressDashboardPage` — keep in sync with data model changes.

---

## Architecture

### Roles

Two roles in Firestore `users/{uid}.role`:
- `student` — reads books, annotates, views own annotations
- `teacher` — uploads books, manages classrooms, views all annotations

Role set at registration, never changes. `ProtectedRoute` enforces role per route.

### Firebase collections

| Collection | Purpose |
|---|---|
| `users` | Auth profile (uid, role, displayName, classroomId, subscriptionStatus, trialEndsAt?). Teachers include `email`. Students do not. |
| `classrooms` | Teacher-owned, students join via 6-char code |
| `books` | PDFs in Storage, metadata in Firestore; `assignedStudentIds[]` controls access |
| `annotations` | Per-student per-book per-page reactions + notes |
| `readingProgress` | Last page, total time, completion % per student+book |

### Firestore security rules summary

- Users read their own profile; any signed-in user reads classrooms (join-code lookup).
- Books readable only if `uid ∈ assignedStudentIds` or `uploadedBy == uid`.
- Annotations: students own theirs; teachers read any annotation in their classroom.
- Reading progress: students write their own; `totalSecondsRead` and `highestPageRead` can only increase.

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
| `src/pages/student/StudentProgressPage.tsx` | Student reading stats. Route: `/student/progress`. |
| `src/pages/teacher/AnnotationsViewerPage.tsx` | Teacher view of annotations + PDF export. Shows `TrialExpiredModal` at PDF export gate. FERPA notice here. |
| `src/pages/teacher/ProgressDashboardPage.tsx` | Reading time + completion per student. FERPA notice here. |
| `src/pages/teacher/UploadBookPage.tsx` | Book upload. Shows `TrialExpiredModal` at 5-book free limit. |
| `src/firebase/annotations.ts` | `saveAnnotation`, `updateAnnotation`, `deleteAnnotation`, `getAnnotationsByStudentAndBook`, `getAnnotationsByStudent`, `getAnnotationsByClassAndBook` |
| `src/firebase/auth.ts` | `registerUser` (sets `trialEndsAt` for teachers, omits student email), `loginUser`, `logoutUser`, `sendPasswordReset`, `getUserProfile` (deserializes `trialEndsAt` from Timestamp). |
| `src/firebase/books.ts` | `uploadBook` (teacher), `uploadStudentBook` (student) — ≤50 MB, Storage rollback on Firestore failure. |
| `src/firebase/readingProgress.ts` | Upserts progress; `totalSecondsRead` + `highestPageRead` never decrease. |
| `src/types/index.ts` | All shared types. `isPro()` and `getTrialDaysRemaining()` helpers. `UserProfile.email` is `email?: string`. |
| `src/components/layout/AppShell.tsx` | App chrome + `TrialBanner` (teachers only, session-dismissible). |
| `src/components/shared/TrialExpiredModal.tsx` | For teachers whose trial ended + hit Pro gate. |
| `src/components/shared/UpgradeModal.tsx` | For free-tier teachers (no trial). Keep as-is. |
| `vite.config.ts` | `pdfWorkerPlugin` — copies `pdf.worker.mjs` to `dist/` at build time. |
| `functions/src/index.ts` | Stripe webhook CF (firebase-functions v2). Secrets: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`. |

---

## PDF.js worker — do not change

Copied to `dist/pdf.worker.mjs` by `pdfWorkerPlugin` in `vite.config.ts`. `ReadingPage.tsx` hardcodes `pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.mjs'`.

`pdfjs-dist` is nested inside `react-pdf/node_modules`, not at the root. The plugin resolves it from `node_modules/react-pdf/node_modules/pdfjs-dist/build/pdf.worker.mjs`. Do not change the worker path, switch to a CDN URL, or use a `?url` import — all three fail.

---

## Annotation flow — how it works

1. **Text selection capture:** A `selectionchange` listener stores selected text in `capturedSelection` state immediately. State is never cleared when selection goes empty — only on `closePanel()` or page change. This is required because tapping the emoji toolbar clears the live `window.getSelection()` on mobile before the click handler fires.

2. **Floating emoji bar:** Position: fixed above the selection (via `getBoundingClientRect()`). Passes captured text directly via `openAnnotationPanel(type, undefined, capturedText)`.

3. **Bottom toolbar:** Calls `openAnnotationPanel(type)` which reads `capturedSelection` state (already captured before tap cleared live selection).

4. **Annotation panel modal:** Slides up from bottom on mobile. Shows emoji selector, quote, note textarea (max 500 chars), Save / Cancel / Delete.

5. **Editing:** Sidebar tapping navigates to the annotation's page and opens the edit panel.

---

## Reverse free trial

Every new **teacher** gets 14 days of full Pro access automatically — no credit card. Students never get a trial.

- `registerUser()` writes `trialEndsAt: new Date(now + 14 days)` for teachers only.
- `getUserProfile()` deserializes `trialEndsAt` from Firestore Timestamp to `Date`.
- `isPro(profile)` → true if `subscriptionStatus === 'pro' | 'district'` OR `trialEndsAt > now`.
- `getTrialDaysRemaining(profile)` → integer days left (ceiling) or `null` if expired/not set/paid.

### Trial banner (AppShell)
| Days remaining | Color |
|---|---|
| 8+ | Blue (`bg-blue-50`) |
| 4–7 | Amber (`bg-amber-50`) |
| 1–3 | Red (`bg-red-50`) |

Session-dismissible via `sessionStorage` key `trial-banner-dismissed`.

### Trial-expired gate (TrialExpiredModal)
```ts
const trialExpired = profile?.role === 'teacher'
  && profile?.trialEndsAt != null
  && profile.trialEndsAt <= new Date()
  && !isPro(profile)
```
Shown at: (1) upload book when `atLimit && trialExpired`; (2) PDF export when `trialExpired`.

### Pending (future phases)
- Stripe checkout UI — webhook deployed, payment links in CI, but checkout button not wired yet
- Trial-expiry email — Phase 3 (Cloud Function scheduled task)
- Server-side trial enforcement — currently client-only

---

## Student registration flow

`registerUser()` in `src/firebase/auth.ts` — order matters, do not reorder:

1. `createUserWithEmailAndPassword`
2. `updateProfile` (display name)
3. *(Students only)* Validate join code (requires being signed in). Invalid → delete auth account + throw.
4. `setDoc users/{uid}` — **critical.** Auth deleted + error re-thrown on failure. Always writes `subscriptionStatus: 'free'`. Teachers get `email` + `trialEndsAt`; students get neither.
5. *(Students only, non-critical)* `joinClassroomByCode` WriteBatch — failure logged but doesn't block registration.

---

## Speech / Read Aloud

Uses `window.speechSynthesis` (Web Speech API — no third-party SDK).

- `speakPage()` extracts text via `pdfDocument.getPage(n).getTextContent()`.
- `pickVoice()` ranks: `enhanced/neural/premium` → `Google` → `en-US` → any English. Handles `voiceschanged` async timing.
- Auto-stops on page navigation.

---

## CI/CD

`.github/workflows/firebase-deploy.yml` triggers on every push to `main`:
1. Node 22 → `npm ci --legacy-peer-deps`
2. `npm run build` with all `VITE_FIREBASE_*` vars inline
3. Firebase CLI deploy (`--only hosting`)

Firestore rules and indexes **not** deployed by CI — apply manually from Firebase Console.

### Stripe webhook (Cloud Function)
Deployed separately via `firebase deploy --only functions`.
- **Live URL:** `https://stripewebhook-v7wgh3m3ca-uc.a.run.app`
- **Events:** `checkout.session.completed`, `customer.subscription.deleted`, `customer.subscription.updated`
- Writes `subscriptionStatus` + `stripeCustomerId` to `users/{uid}`

---

## Hosting & DNS

`easy-annotate.com` → Firebase Hosting. DNS managed at Netlify DNS (`app.netlify.com/teams/dembryllc/dns`).

| Record | Value |
|--------|-------|
| A `easy-annotate.com` | `199.36.158.100` |
| CNAME `www.easy-annotate.com` | `ascend-annotate.web.app` |

Both `easy-annotate.com` and `www.easy-annotate.com` must stay in Firebase Auth Authorized Domains.  
Netlify project exists but paused (credit limit) — do not rely on it, do not delete until billing resolved.

---

## Environment variables

```
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
VITE_STRIPE_PRO_MONTHLY_URL
VITE_STRIPE_PRO_ANNUAL_URL
```

Local dev: `.env` (gitignored). CI: hardcoded in workflow YAML.
