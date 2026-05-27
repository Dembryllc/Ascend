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
| Hosting | Netlify (static SPA) |

---

## Local Development

### 1. Clone and install

```bash
git clone https://github.com/Dembryllc/Ascend.git
cd Ascend
npm install --legacy-peer-deps
```

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

Get these values from **Firebase Console → Project settings → Your apps → SDK setup**.

### 3. Run

```bash
npm run dev
```

The app runs at `http://localhost:5173`.

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
│       └── AnnotationsViewerPage.tsx # View + export student annotations
├── types/
│   └── index.ts                  # Shared TypeScript types
└── utils/
    └── exportPDF.ts              # jsPDF annotation export
```

---

## Firebase Setup

### Authentication

1. Firebase Console → **Authentication → Sign-in method** → enable **Email/Password**.
2. Firebase Console → **Authentication → Settings → Authorized domains** → add `easy-annotate.com` and `localhost`.

### Firestore Rules

Paste the contents of `firestore.rules` into **Firebase Console → Firestore → Rules**.

### Firestore Composite Indexes

Paste the contents of `firestore.indexes.json` into **Firebase Console → Firestore → Indexes → Import**, or create the three indexes manually:

| Collection | Fields | Order |
|---|---|---|
| `annotations` | `studentId` → `bookId` → `pageNumber` | ASC / ASC / ASC |
| `annotations` | `studentId` → `timestamp` | ASC / DESC |
| `annotations` | `bookId` → `studentId` → `pageNumber` | ASC / ASC / ASC |

Without these indexes, annotation queries will fail silently.

### Storage Rules

Paste the contents of `storage.rules` into **Firebase Console → Storage → Rules**.

---

## Netlify Deployment

The site deploys automatically when commits are pushed to `main`.

### Required environment variables

Set all six `VITE_FIREBASE_*` variables in **Netlify → Site configuration → Environment variables**. Without them the build succeeds but Firebase calls will fail at runtime.

### SPA redirect

`netlify.toml` includes the required redirect rule so React Router handles all navigation:

```toml
[[redirects]]
  from = "/*"
  to   = "/index.html"
  status = 200
```

### PDF.js worker

The Vite build copies `pdfjs-dist/build/pdf.worker.mjs` to `dist/pdf.worker.mjs` via a plugin in `vite.config.ts`. This gives the worker a stable, unhashed URL (`/pdf.worker.mjs`) that is not affected by the SPA redirect and works correctly on iOS Safari.

---

## User Roles

| Role | Can do |
|---|---|
| **Student** | Register (class code optional), read assigned books, upload personal PDFs, annotate pages with emoji reactions + notes, view/export own annotations |
| **Teacher** | Upload books with assignment prompts, create classrooms with join codes, assign books to individual students or the whole class, view and export all student annotations |

---

## Build

```bash
npm run build   # outputs to dist/
```

Type errors fail the build (`tsc -b` runs before Vite). The chunk size warning for `index.js` is pre-existing and does not affect functionality.
