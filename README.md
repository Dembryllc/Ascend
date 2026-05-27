# Easy Annotate

A web-based PDF annotation app for students with special needs. Students read PDFs page-by-page and leave emoji-based reactions and written notes. Teachers upload books, manage classrooms, and review student annotations.

**Live site:** [easy-annotate.com](https://easy-annotate.com)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + TypeScript + Vite 8 |
| Styling | Tailwind CSS v4 (`@tailwindcss/vite`) |
| Auth | Firebase Authentication (email/password) |
| Database | Cloud Firestore |
| File storage | Firebase Storage |
| PDF rendering | react-pdf v10 + pdfjs-dist v5 |
| PDF export | jsPDF v4 |
| Routing | React Router v7 |
| Hosting | Firebase Hosting (auto-deploy via GitHub Actions) |

---

## Local Development

### 1. Clone and install

```bash
git clone https://github.com/Dembryllc/Ascend.git
cd Ascend
npm install --legacy-peer-deps
```

> Requires **Node.js 22+**. Vite 8 and TypeScript 6 do not support Node 20.

### 2. Create `.env`

Create a `.env` file in the project root (never commit this):

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

Get these from **Firebase Console → Project settings → Your apps → SDK setup**.

### 3. Run

```bash
npm run dev
```

App runs at `http://localhost:5173`.

---

## Project Structure

```
src/
├── components/
│   ├── layout/
│   │   └── AppShell.tsx          # Top nav + page wrapper
│   └── shared/
│       └── ProtectedRoute.tsx    # Auth + role guard
├── context/
│   └── AuthContext.tsx           # Firebase auth state + user profile
├── firebase/
│   ├── config.ts                 # Firebase initialization
│   ├── auth.ts                   # register / login / logout / getUserProfile
│   ├── books.ts                  # upload / fetch / assign / delete books
│   ├── annotations.ts            # save / update / delete / fetch annotations
│   ├── classrooms.ts             # create classroom, generate join code
│   └── readingProgress.ts        # track pages read and time spent
├── pages/
│   ├── auth/
│   │   ├── LoginPage.tsx
│   │   └── RegisterPage.tsx
│   ├── student/
│   │   ├── StudentHome.tsx       # Bookshelf (assigned + own books)
│   │   ├── ReadingPage.tsx       # PDF viewer + annotation toolbar
│   │   ├── StudentUploadPage.tsx # Student self-upload
│   │   └── MyAnnotationsPage.tsx # All annotations across books
│   └── teacher/
│       ├── TeacherDashboard.tsx  # Book library + classroom overview
│       ├── UploadBookPage.tsx    # Teacher book upload
│       ├── ClassroomPage.tsx     # Manage students + assign books
│       ├── AnnotationsViewerPage.tsx  # View + export student annotations
│       └── ProgressDashboardPage.tsx  # Reading time + completion dashboard
├── types/
│   └── index.ts                  # Shared TypeScript types
└── utils/
    ├── exportPDF.ts              # jsPDF annotation export
    ├── studentProgress.ts        # Progress aggregation helpers
    └── teacherSummary.ts         # Teacher-side summary helpers
```

---

## Firebase Setup

### Authentication

1. Firebase Console → **Authentication → Sign-in method** → enable **Email/Password**.
2. Firebase Console → **Authentication → Settings → Authorized domains** → add `easy-annotate.com` and `localhost`.

### Firestore Rules

Paste `firestore.rules` into **Firebase Console → Firestore → Rules**.

### Firestore Composite Indexes

The app requires three composite indexes on the `annotations` collection. Create them via **Firebase Console → Firestore → Indexes**, or deploy with `firebase deploy --only firestore:indexes`.

| Collection | Fields | Order |
|---|---|---|
| `annotations` | `studentId` → `bookId` → `pageNumber` | ASC / ASC / ASC |
| `annotations` | `studentId` → `timestamp` | ASC / DESC |
| `annotations` | `bookId` → `studentId` → `pageNumber` | ASC / ASC / ASC |

Without these, annotation queries fail silently.

### Storage Rules

Paste `storage.rules` into **Firebase Console → Storage → Rules**.

---

## Deployment

### GitHub Actions (auto-deploy)

Every push to `main` triggers `.github/workflows/firebase-deploy.yml`, which:
1. Installs dependencies with Node 22
2. Builds the app with the Firebase env vars baked in
3. Deploys to Firebase Hosting using a service account

**Required GitHub secret:** `FIREBASE_SERVICE_ACCOUNT_ASCEND_ANNOTATE` — a Firebase service account JSON with Hosting deploy permissions. Add it under **GitHub repo → Settings → Secrets and variables → Actions**.

The live deploy URL is `ascend-annotate.web.app`. The custom domain `easy-annotate.com` points there via Firebase Hosting.

### Manual build

```bash
npm run build   # outputs to dist/
```

Type errors fail the build (`tsc -b` runs before Vite).

---

## PDF.js Worker

The Vite build copies the PDF.js worker to `dist/pdf.worker.mjs` via a plugin in `vite.config.ts`. This gives it a stable, unhashed URL (`/pdf.worker.mjs`) that works correctly across environments and on iOS Safari.

`pdfjs-dist` is a transitive dependency of `react-pdf` and is resolved from `node_modules/react-pdf/node_modules/pdfjs-dist/`. The plugin tries the root `node_modules` path first and falls back to the nested path automatically.

---

## Annotation Flow (Student)

1. Student opens a book and reads page-by-page.
2. **To annotate selected text:** tap and hold on any text in the PDF — a floating emoji bar appears directly above the selection. Tap an emoji to open the annotation panel with the passage pre-filled. Works on mobile and desktop.
3. **To annotate the whole page:** tap any emoji in the "How does this page make you feel?" toolbar below the PDF.
4. In the annotation panel: confirm the emoji reaction, optionally type a note (up to 500 characters), and tap Save.
5. **To add or edit a note later:** tap any annotation in the sidebar — it navigates to that page and opens the edit panel.
6. All annotations are visible across sessions and reviewable by the teacher.

---

## Speech / Read Aloud

The **Read Aloud** button in the header reads the current page using the Web Speech API:

- Automatically picks the most natural available en-US voice (prefers enhanced/neural/premium voices, then Google, then any en-US).
- While reading, the button switches to a **Stop** button that halts playback immediately.
- Speech stops automatically when the student turns the page.
- Not available in browsers that do not support `window.speechSynthesis`.

---

## User Roles

| Role | Can do |
|---|---|
| **Student** | Register (class join code optional), read assigned books, upload personal PDFs, annotate with emoji + notes, view and edit all annotations, use read aloud |
| **Teacher** | Upload books with assignment prompts and success criteria, create classrooms with join codes, assign books to individual students or the whole class, view and export all student annotations, track reading progress |

---

## File Size Limit

PDFs are capped at **50 MB** on upload (both teacher and student upload paths). This is enforced client-side before the Firebase Storage upload begins.
