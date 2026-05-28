# Architecture Map — Easy Annotate (Ascend Annotate)

**Generated:** 2026-05-28  
**Codebase branch audited:** `claude/ascend-project-migration-Bw1rM`  
**Production branch:** `main` (diverged — see Branch Divergence section)

---

## System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      Browser (SPA)                          │
│                                                             │
│  React 19 + TypeScript + Vite 8                             │
│  React Router v7 (client-side routing)                      │
│  Tailwind CSS v4 (utility styles)                           │
│  react-pdf v10 (PDF rendering)                              │
│  pdfjs-dist v5 (PDF.js engine)                              │
│  jsPDF v4 (annotation PDF export)                           │
│  Web Speech API (text-to-speech, browser native)            │
└───────────────┬─────────────────────────────────────────────┘
                │ Firebase SDK (REST over HTTPS)
                ▼
┌─────────────────────────────────────────────────────────────┐
│                   Firebase (project: ascend-annotate)       │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │ Firebase Auth│  │  Firestore   │  │ Firebase Storage │  │
│  │ Email/PW     │  │  (NoSQL DB)  │  │ (PDF files)      │  │
│  └──────────────┘  └──────────────┘  └──────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────────────────────────┐
│              Firebase Hosting (CDN)                          │
│  Domain: easy-annotate.com                                  │
│  DNS: Netlify DNS → A 199.36.158.100                        │
│  Deploy: GitHub Actions on push to main                     │
└─────────────────────────────────────────────────────────────┘
```

---

## Frontend Framework

| Item | Value |
|---|---|
| Language | TypeScript 6 |
| UI framework | React 19 |
| Build tool | Vite 8 |
| Node requirement | 22+ |
| CSS | Tailwind CSS v4 (no config file — `@tailwindcss/vite` plugin) |
| Router | React Router v7 (client-side, `BrowserRouter`) |
| PDF viewer | react-pdf v10 + pdfjs-dist v5 |
| PDF export | jsPDF v4 |
| Icons | lucide-react |
| Speech | Web Speech API (`window.speechSynthesis`) — no SDK |

**Build command:** `tsc -b && vite build` → outputs to `dist/`  
**Install:** `npm ci --legacy-peer-deps` (peer dep conflict requires flag)

---

## Route Map

```
/                       → redirect to /login
/login                  → LoginPage (public)
/register               → RegisterPage (public)

/teacher                → TeacherDashboard (role: teacher)
/teacher/upload         → UploadBookPage (role: teacher)
/teacher/classroom      → ClassroomPage (role: teacher)
/teacher/annotations    → AnnotationsViewerPage (role: teacher)

/student                → StudentHome (role: student)
/student/read/:bookId   → ReadingPage (role: student)
/student/annotations    → MyAnnotationsPage (role: student)

*                       → redirect to /login
```

All protected routes are wrapped in `ProtectedRoute` which:
1. Shows a spinner while `AuthContext.loading === true`
2. Redirects to `/login` if no authenticated user
3. Redirects to the user's own home if role doesn't match

---

## Backend Architecture

No server-side code. The app is a pure SPA — all backend logic is Firebase SDK calls from the browser.

```
src/firebase/
├── config.ts          Firebase app init, exports: auth, db, storage
├── auth.ts            registerUser, loginUser, logoutUser, getUserProfile
├── books.ts           uploadBook, getBooksByTeacher, getBooksByStudent,
│                      getBook, assignBookToStudent, assignBookToClass
│                      [main only: uploadStudentBook, deleteStudentBook]
├── annotations.ts     saveAnnotation, updateAnnotation, deleteAnnotation,
│                      getAnnotationsByStudentAndBook,
│                      getAnnotationsByStudent,
│                      getAnnotationsByClassAndBook
├── classrooms.ts      createClassroom, getClassroomByTeacher, getClassroom
└── readingProgress.ts [main only — missing from feature branch]
                       getReadingProgress, getReadingProgressByStudent,
                       getReadingProgressByClassroom, recordReadingProgress
```

---

## Firebase Services

### Firebase Authentication
- Provider: Email + Password only
- No OAuth providers (Google, etc.)
- No magic link / passwordless
- No MFA
- **No password reset flow** (significant gap)
- Auth state managed in `AuthContext` via `onAuthStateChanged` listener

### Firestore (NoSQL database)
Collections:

```
users/{uid}
  uid: string
  email: string
  displayName: string
  role: 'teacher' | 'student'
  classroomId: string | null
  createdAt: timestamp

classrooms/{classroomId}
  name: string
  teacherId: string
  joinCode: string (6-char uppercase alphanumeric)
  studentIds: string[]
  createdAt: timestamp

books/{bookId}
  title: string
  author: string
  readingLevel: string | null
  storageUrl: string
  uploadedBy: string (uid)
  assignedStudentIds: string[]
  [main only] assignmentPrompt: string | null
  [main only] successCriteria: string | null
  [main only] uploadedByStudent: boolean (student self-uploads)
  createdAt: timestamp

annotations/{annotationId}
  studentId: string
  bookId: string
  pageNumber: number
  reactionType: 'surprise'|'think'|'love'|'important'|'question'
  noteText: string
  timestamp: timestamp
  ⚠️ classroomId: NEVER WRITTEN by saveAnnotation()
     (required by Firestore rule for teacher read access — broken)

readingProgress/{studentId_bookId}
  [main only — no client code exists on feature branch]
  studentId, bookId, classroomId, lastReadPage, highestPageRead,
  totalPages, completionPercent, totalSecondsRead, completed,
  lastReadAt, createdAt
```

### Firebase Storage
Paths:
- `books/{timestamp}_{filename}` — teacher-uploaded PDFs
- `student-books/{studentId}/{timestamp}_{filename}` — student self-uploads

Size limit: 50 MB (enforced in storage.rules, NOT in UI)  
Type restriction: `application/pdf` only (enforced in rules)

---

## Authentication Flow

```
User visits app
      │
      ▼
BrowserRouter → Routes
      │
      ▼
ProtectedRoute reads AuthContext.{user, profile, loading}
      │
      ├─ loading=true → show spinner
      ├─ user=null → Navigate to /login
      └─ user exists, wrong role → Navigate to own home
      
AuthContext (singleton, mounts once):
  onAuthStateChanged fires:
    ├─ user=null → profile=null, loading=false
    └─ user exists → getUserProfile(uid) from Firestore
         ├─ success → profile set, loading=false
         └─ error → profile=null, loading=false
                    ⚠️ Causes redirect loop (user authed, no profile)

Login flow:
  LoginPage.handleSubmit
    → loginUser(email, password)  [Firebase signInWithEmailAndPassword]
    → onAuthStateChanged fires → profile loaded
    → ProtectedRoute now has profile → serves page
    ⚠️ LoginPage.tsx lines 16-18: navigate() called during render if
       profile exists (not in useEffect) — React anti-pattern

Register flow:
  RegisterPage.handleSubmit
    → if student && joinCode: resolveJoinCode → addStudentToClassroom
    → createUserWithEmailAndPassword
    → updateProfile (displayName)
    → setDoc users/{uid}
    → navigate to home
    ⚠️ Student CANNOT register without a valid join code
       Teacher must create classroom first (circular dependency)
```

---

## PDF Rendering Flow

```
ReadingPage mounts with :bookId
      │
      ▼
getBook(bookId) from Firestore
      │
      ├─ null (not found or error) → spinner forever ⚠️
      └─ book.storageUrl obtained
             │
             ▼
      react-pdf <Document file={storageUrl}>
             │
             ▼
      PDF.js worker fetches + parses PDF
             │
      ⚠️ Feature branch: worker URL = CDN (unpkg.com)
         Main branch:    worker URL = /pdf.worker.mjs (local copy)
             │
             ▼
      <Page pageNumber={n} renderTextLayer renderAnnotationLayer={false}>
             │
             ▼
      Text layer rendered (for speech + text selection)
```

**Worker source:**
- **Feature branch:** `https://unpkg.com/pdfjs-dist@${version}/build/pdf.worker.min.mjs` (CDN — blocked on many school networks)
- **Main/production:** `/pdf.worker.mjs` (local copy in `dist/`, copied by `pdfWorkerPlugin` in `vite.config.ts`)

---

## Annotation Flow

```
Student reads page N in ReadingPage
      │
      ▼
Student clicks emoji reaction button
      │
      ▼
openAnnotationPanel() → shows modal
      │
Student picks reaction + types optional note → Save
      │
      ▼
saveAnnotation(studentId, bookId, pageNumber, reactionType, noteText)
      │  → addDoc to annotations collection
      │  ⚠️ NO classroomId written to document
      │
      ▼
Local state updated (optimistic — no reload)
      │
      ▼
Annotation appears in sidebar on same page

──── Teacher side ────
AnnotationsViewerPage:
  select student + book → fetchAnnotations()
    → getAnnotationsByStudentAndBook(studentId, bookId)
      ⚠️ Firestore rule: read requires isOwner(studentId)
         OR classroomId field exists AND teacher owns that classroom
         Since classroomId is NEVER written: teacher read will FAIL
         (Permission denied — silently returns empty array or throws)
```

---

## Upload Flow (Teacher)

```
UploadBookPage:
  select PDF + enter title/author/readingLevel → Submit
      │
      ├─ no file size check ⚠️ (Storage rejects >50 MB with generic error)
      │
      ▼
uploadBook(file, title, author, readingLevel, teacherId, onProgress)
      │
      ├─ uploadBytesResumable to books/{timestamp}_{name}
      │    → onProgress callback updates UI
      │
      └─ getDownloadURL → storageUrl
             │
             ▼
      addDoc to books collection
      ⚠️ Feature branch: uploadBook() missing assignmentPrompt + successCriteria params
         Main branch: uploadBook() accepts all 8 params

      On success → navigate('/teacher')
      On error → generic "Upload failed"
```

---

## Deployment Flow

```
Developer pushes to main
      │
      ▼
GitHub Actions: .github/workflows/firebase-deploy.yml
      │
      ├─ Node 22 setup
      ├─ npm ci --legacy-peer-deps
      ├─ npm run build (tsc -b && vite build)
      │    ├─ All VITE_FIREBASE_* vars set inline in workflow YAML
      │    └─ pdfWorkerPlugin copies pdf.worker.mjs to dist/
      │
      └─ firebase deploy --only hosting --project ascend-annotate
           using GOOGLE_APPLICATION_CREDENTIALS from GitHub Secret
           FIREBASE_SERVICE_ACCOUNT_ASCEND_ANNOTATE

⚠️ Firestore rules and indexes are NOT deployed by CI
   They must be applied manually from Firebase Console
```

---

## Environment Variables

All are `VITE_*` — baked into JS bundle at build time by Vite. Firebase API keys are safe to expose (security enforced by Firestore/Storage rules).

| Variable | Purpose |
|---|---|
| `VITE_FIREBASE_API_KEY` | Firebase project API key |
| `VITE_FIREBASE_AUTH_DOMAIN` | `ascend-annotate.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | `ascend-annotate` |
| `VITE_FIREBASE_STORAGE_BUCKET` | `ascend-annotate.firebasestorage.app` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | `97329229065` |
| `VITE_FIREBASE_APP_ID` | `1:97329229065:web:7120ef7d461ff67ba6f7d8` |

Local dev: `.env` file (gitignored)  
CI: hardcoded in `firebase-deploy.yml`

---

## Critical Dependencies

| Package | Version | Notes |
|---|---|---|
| `firebase` | ^12.13.0 | Auth, Firestore, Storage SDK |
| `react-pdf` | ^10.4.1 | PDF rendering component |
| `pdfjs-dist` | ^5.7.284 | PDF.js engine (nested inside react-pdf/node_modules) |
| `react-router-dom` | ^7.15.1 | Client-side routing |
| `jspdf` | ^4.2.1 | Annotation PDF export |
| `lucide-react` | ^1.16.0 | Icons |
| `@tailwindcss/vite` | ^4.3.0 | CSS — no config file |
| `vite` | ^8.0.12 | Build tool (requires Node 22+) |
| `typescript` | ~6.0.2 | Type checking (requires Node 22+) |

**`--legacy-peer-deps` is required** for npm install due to unresolved peer dependency conflicts (react-pdf vs react 19 compatibility).

---

## Branch Divergence (Critical Context)

The feature branch (`claude/ascend-project-migration-Bw1rM`) diverged from `main` before several fixes were applied. The code on this branch is NOT the same as production.

| File | Feature branch | main (production) |
|---|---|---|
| `src/pages/student/ReadingPage.tsx` | Old — CDN worker, no floating bar, no capturedSelection, no ReadingProgress | Fixed — local worker, floating emoji bar, selectionchange, isSpeaking, ReadingProgress |
| `src/types/index.ts` | Missing ReadingProgress, assignmentPrompt, successCriteria, selectedText | Complete |
| `src/firebase/readingProgress.ts` | Does not exist | Exists |
| `src/firebase/books.ts` | No uploadStudentBook, no deleteStudentBook, no assignmentPrompt | Complete |
| `vite.config.ts` | Has pdfWorkerPlugin (brought in from main manually) | Has pdfWorkerPlugin |

**The production app at easy-annotate.com runs the `main` branch code, not this feature branch.**
