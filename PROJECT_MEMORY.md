# Easy Annotate — Project Memory

**Purpose:** Students read PDFs page-by-page and leave emoji-based reactions + notes. Teachers upload books, manage classrooms, review annotations.  
**Live site:** easy-annotate.com (Firebase Hosting; DNS managed at Netlify DNS)  
**Firebase project:** `ascend-annotate`  
**Repo:** Dembryllc/Ascend, default branch `main`  
**Last updated:** 2026-06-19

---

## Stack
| | |
|---|---|
| React 19 + TypeScript + Vite 8 | Frontend SPA |
| Tailwind CSS v4 (`@tailwindcss/vite`) | Styling — no tailwind.config.js |
| Firebase Auth + Firestore + Storage | Backend |
| react-pdf v10 + pdfjs-dist v5 | PDF rendering |
| jsPDF v4 | Annotation PDF export |
| React Router v7 | Routing |
| Firebase Hosting | Auto-deploy via GitHub Actions |
| Stripe (webhook deployed) | Subscription billing (checkout flow not yet wired in UI) |

**Node 22+ required.** Install with `npm install --legacy-peer-deps`.

---

## Key Files
| File | Purpose |
|------|---------|
| `src/pages/student/ReadingPage.tsx` | Main reader — PDF viewer, annotation toolbar, floating emoji bar, speech, progress |
| `src/pages/student/MyAnnotationsPage.tsx` | All annotations across books, filter, edit modal |
| `src/pages/student/StudentProgressPage.tsx` | Student reading stats — `/student/progress` |
| `src/pages/teacher/AnnotationsViewerPage.tsx` | Teacher view of annotations + PDF export; trial/expired gates |
| `src/pages/teacher/ProgressDashboardPage.tsx` | Reading time + completion per student |
| `src/pages/teacher/UploadBookPage.tsx` | Book upload; trial/expired gate at 5-book free limit |
| `src/firebase/annotations.ts` | save/update/delete/get annotation helpers |
| `src/firebase/auth.ts` | registerUser, loginUser, logoutUser, getUserProfile |
| `src/firebase/books.ts` | uploadBook (teacher), uploadStudentBook (student) — ≤50 MB |
| `src/firebase/readingProgress.ts` | Upserts progress; `totalSecondsRead` + `highestPageRead` never decrease |
| `src/types/index.ts` | All shared types; `isPro()` and `getTrialDaysRemaining()` helpers |
| `src/components/layout/AppShell.tsx` | App chrome + `TrialBanner` (teachers only, session-dismissible) |
| `src/components/shared/TrialExpiredModal.tsx` | Shown when trial ended + Pro gate hit |
| `src/components/shared/UpgradeModal.tsx` | For free-tier teachers (no trial) |
| `vite.config.ts` | `pdfWorkerPlugin` — copies `pdf.worker.mjs` to `dist/` at build |
| `functions/src/index.ts` | Stripe webhook CF (Gen 2) — checkout.session.completed, subscription deleted/updated |

---

## Roles
| Role | Access |
|------|--------|
| `student` | Read books, annotate, view own annotations |
| `teacher` | Upload books, manage classrooms, view all annotations |

Role set at registration, never changes. `ProtectedRoute` enforces per route.

---

## Firestore Collections
| Collection | Purpose |
|---|---|
| `users` | Auth profile — `role`, `displayName`, `classroomId`, `subscriptionStatus`, `trialEndsAt?` |
| `classrooms` | Teacher-owned; students join via 6-char code |
| `books` | PDF metadata; `assignedStudentIds[]` controls access |
| `annotations` | Per-student per-book per-page reactions + notes |
| `readingProgress` | Last page, total time, completion % per student+book |

---

## FERPA Compliance (do not reverse)
- **Student email NOT stored in Firestore** — Firebase Auth only. `UserProfile.email` is `email?: string`.
- `registerUser()` intentionally omits `email` from student `setDoc`.
- Teacher email IS stored (needed for billing/recovery).
- FERPA notice on `AnnotationsViewerPage` + `ProgressDashboardPage` — do not remove.
- Student registration prompts for first name / nickname, not full name.

---

## Trial System (Reverse Free Trial)
- New teachers get 14 days full Pro access automatically — no credit card.
- `registerUser()` writes `trialEndsAt: new Date(now + 14 days)` for teachers.
- `isPro(profile)` → true if `subscriptionStatus === 'pro'|'district'` OR `trialEndsAt > now`.
- `TrialBanner` urgency: blue (8+ days) → amber (4–7 days) → red (1–3 days). Session-dismissible.
- `TrialExpiredModal` (not `UpgradeModal`) when trial ended + Pro gate hit.

---

## PDF.js Worker — Do Not Change
- Copied to `dist/pdf.worker.mjs` by `pdfWorkerPlugin` in `vite.config.ts`.
- `pdfjs-dist` is nested inside `react-pdf/node_modules` — not at root.
- Never switch to CDN URL or `?url` import — both fail on iOS Safari.

---

## Annotation Flow
1. `selectionchange` listener captures selected text into `capturedSelection` state (never cleared when selection goes empty — only on `closePanel()` or page change).
2. Floating emoji bar appears above selection (position: fixed); passes captured text via `openAnnotationPanel()`.
3. Bottom toolbar buttons also read `capturedSelection` state (live selection already cleared by tap).
4. Annotation panel slides up from bottom on mobile.

---

## Composite Firestore Indexes (required)
Defined in `firestore.indexes.json`. Missing indexes cause silent annotation query failures:
- `annotations`: `studentId ASC → bookId ASC → pageNumber ASC`
- `annotations`: `studentId ASC → timestamp DESC`
- `annotations`: `bookId ASC → studentId ASC → pageNumber ASC`

---

## Critical Constraints
- **Do not add `user-select: none`** inside `#pdf-container` — breaks text selection.
- **Do not change `annotationKind` field values** (`'annotation'` | `'reflection'`).
- **Do not write student email to Firestore** — FERPA violation.
- **Do not make `UserProfile.email` required** — students have no email in Firestore.
- **Do not use `UpgradeModal` for trial-expired teachers** — use `TrialExpiredModal`.
- **Do not reorder registration steps** — `setDoc` must happen before classroom join.
- **Do not push to main without a passing build** — CI deploys on every push.

---

## Registration Flow (order matters)
1. `createUserWithEmailAndPassword`
2. `updateProfile` (display name)
3. *(Students only)* Validate join code (requires being signed in)
4. `setDoc users/{uid}` — critical; deletes auth account + rethrows on failure
5. *(Students only, non-critical)* `joinClassroomByCode` WriteBatch

---

## DNS / Hosting
| Record | Value |
|--------|-------|
| A `easy-annotate.com` | `199.36.158.100` (Firebase) |
| CNAME `www.easy-annotate.com` | `ascend-annotate.web.app` |

DNS managed at Netlify DNS (`app.netlify.com/teams/dembryllc/dns`). Both `easy-annotate.com` and `www.easy-annotate.com` must stay in Firebase Auth Authorized Domains.

---

## CI/CD
`.github/workflows/firebase-deploy.yml` → push to `main`:
1. Node 22 → `npm ci --legacy-peer-deps`
2. `npm run build` (all `VITE_FIREBASE_*` vars inline)
3. Firebase CLI deploy (`--only hosting`)

Firestore rules + indexes **not** deployed by CI — apply manually from Firebase Console.

---

## Pending Work
- **Stripe checkout UI** — webhook is deployed, payment links are in CI, but the checkout button/redirect is not wired in the UI yet (Phase 2)
- **Trial-expiry email** — Phase 3 (Cloud Function scheduled task)
- **Server-side trial enforcement** — currently client-only; Firestore rules don't gate on `trialEndsAt`

---

## Stripe (Webhook)
- **Live URL:** `https://stripewebhook-v7wgh3m3ca-uc.a.run.app`
- Secrets: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` (set via `firebase functions:secrets:set`)
- Events: `checkout.session.completed`, `customer.subscription.deleted`, `customer.subscription.updated`
- Writes `subscriptionStatus` + `stripeCustomerId` to `users/{uid}`
