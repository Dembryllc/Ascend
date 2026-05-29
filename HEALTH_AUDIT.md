# Health Audit — Easy Annotate

**Generated:** 2026-05-28  
**Auditor:** Static analysis of codebase (no live environment access)  
**Branch audited:** `claude/ascend-project-migration-Bw1rM` + comparison with `origin/main`

---

## System 1: Authentication

**Status: Partially Working**  
**Confidence: 7/10**

### Working
- Email/password login and registration work end-to-end
- `onAuthStateChanged` correctly drives `AuthContext` state
- Role-based routing (`ProtectedRoute`) is logically correct
- Session persistence is handled by Firebase (survives page refresh)
- Logout clears the session and redirects to `/login`

### Problems

**P1 — Silent profile fetch failure → infinite redirect loop**  
File: `src/context/AuthContext.tsx` line 23  
```tsx
const p = await getUserProfile(firebaseUser.uid)
setProfile(p)   // if null, ProtectedRoute sends user to /login
```
If `getUserProfile` throws (network error, Firestore offline, permission denied), the `try/catch` does NOT exist around this call. However `setLoading(false)` is still called (line 27). Result: user is authenticated (`user` is set), but `profile` is `null`. `ProtectedRoute` checks `profile?.role !== requiredRole` — role is undefined — redirects to login. Login page sees `profile` is still null → doesn't redirect → user lands on login while authenticated. If they try to log in again, Firebase returns the already-signed-in user, triggering `onAuthStateChanged` again. This may loop indefinitely or sit on a blank login page.

**P2 — `navigate()` called during render in `LoginPage`**  
File: `src/pages/auth/LoginPage.tsx` lines 16-18  
```tsx
if (profile) {
  navigate(profile.role === 'teacher' ? '/teacher' : '/student', { replace: true })
  return null
}
```
React prohibits side effects during render. This is not inside `useEffect`. Causes React 19 concurrent mode warnings and can trigger double-render issues. React Router's navigate during render is flagged as a pattern to avoid.

**P3 — No password reset**  
No `sendPasswordResetEmail` call anywhere. No "Forgot password" link. Users who lose their password are permanently locked out.

**P4 — Student registration: chicken-and-egg**  
`RegisterPage.tsx` line 20: students must have a join code. A join code only exists after a teacher creates a classroom. If a teacher deploys this to a new class, students cannot register until the teacher creates the classroom first AND shares the code. There is no teacher-onboarding sequence that enforces this.

---

## System 2: PDF Upload

**Status: Partially Working**  
**Confidence: 7/10**

### Working
- `uploadBytesResumable` correctly shows upload progress
- Firebase Storage accepts PDFs under 50 MB
- Firestore document is created after upload
- On failure, the uploaded Storage file is deleted (rollback exists — line 56 `deleteObject`)
- Storage rules correctly restrict to `application/pdf` and `< 52428800` bytes

### Problems

**P5 — No client-side file size validation**  
File: `src/pages/teacher/UploadBookPage.tsx` — no size check  
Storage.rules rejects files >50 MB, but the UI doesn't check first. Teacher uploads a 75 MB PDF → upload starts → Firebase Storage returns a permission-denied-style error → UI shows generic "Upload failed. Please try again." Teacher has no idea why.

**P6 — Feature branch: `uploadBook()` missing `assignmentPrompt` / `successCriteria`**  
File: `src/firebase/books.ts` (feature branch)  
The production `main` branch's `uploadBook` accepts 8 parameters including `assignmentPrompt` and `successCriteria`. The feature branch has the 6-param version. Merging this branch would regress those fields.

---

## System 3: PDF Rendering

**Status: Partially Working (feature branch) / Working (main)**  
**Confidence: 8/10 for main, 4/10 for feature branch**

### Working (main/production)
- Local PDF worker (`/pdf.worker.mjs`) is copied to `dist/` by `pdfWorkerPlugin`
- Firebase Hosting serves `.mjs` with correct MIME type (`application/javascript`)
- MIME headers in `firebase.json` prevent iOS Safari rejection
- PDF renders page-by-page with text layer

### Problems

**P7 — CRITICAL (feature branch only): CDN worker URL**  
File: `src/pages/student/ReadingPage.tsx` line 14  
```tsx
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`
```
This CDN approach was the root cause of prior iOS Safari failures and was fixed on `main`. This branch reverts to it. On many school networks, `unpkg.com` is blocked → all PDF rendering fails. This would be production-breaking if this branch were merged to main.

**P8 — No error state for PDF load failure**  
File: `src/pages/student/ReadingPage.tsx` — no `onLoadError` prop on `<Document>`  
If the PDF fails to load (CORS, network error, deleted file), the user sees a spinner forever. `react-pdf`'s `<Document>` accepts an `onLoadError` callback.

**P9 — Infinite spinner if `getBook()` returns null**  
File: `src/pages/student/ReadingPage.tsx` lines 117-121  
```tsx
if (!book) return <spinner />
```
If the book doesn't exist in Firestore or the query throws, `book` stays `null` forever. No timeout, no error message, no "book not found."

**P10 — Speech synthesis scrapes rendered DOM**  
File: `src/pages/student/ReadingPage.tsx` line 110-111  
```tsx
const textLayer = document.querySelector('.react-pdf__Page__textContent')
const text = textLayer?.textContent ?? `Page ${currentPage}`
```
Race condition: if the text layer hasn't finished rendering (PDF is still loading), `textLayer` is null and the user hears "Page 3." Also doesn't work for image-only / scanned PDFs.

---

## System 4: Annotation Creation

**Status: Partially Working**  
**Confidence: 6/10**

### Working
- `saveAnnotation()` correctly writes to Firestore
- Firestore rule allows create if `request.resource.data.studentId == request.auth.uid`
- Local state is updated optimistically (no page reload needed)
- Edit and delete flows work on the student's own annotations

### Problems

**P11 — `saveAnnotation()` never writes `classroomId`**  
File: `src/firebase/annotations.ts` line 35-42  
The `addDoc` payload does not include `classroomId`. The Firestore rule for teacher reads of annotations requires:
```
resource.data.keys().hasAll(['classroomId'])
&& resource.data.classroomId is string
&& isClassTeacher(resource.data.classroomId)
```
Since `classroomId` is never in the document, this rule arm can never pass. **Teachers cannot read student annotations.** (See System 6.)

**P12 — No confirmation before delete**  
File: `src/pages/student/ReadingPage.tsx` line 101  
`handleDelete` immediately deletes without asking "Are you sure?" Students can accidentally delete annotations.

**P13 — Feature branch: no text selection capture**  
The feature branch's `ReadingPage.tsx` uses simple emoji reaction buttons with no text selection. The `main` branch has `selectionchange` listener, `capturedSelection` state, and floating emoji bar above selected text. Merging this branch would lose that feature.

---

## System 5: Annotation Saving

**Status: Working**  
**Confidence: 8/10**

### Working
- `saveAnnotation` and `updateAnnotation` use Firestore `addDoc` / `updateDoc`
- `serverTimestamp()` used for timestamps
- Local state is updated after server confirms write
- Optimistic update is accurate (matches server data)

### Problems

**P14 — No error handling in `handleSave`**  
File: `src/pages/student/ReadingPage.tsx` lines 78-99  
```tsx
async function handleSave() {
  ...
  try {
    ...
  } finally {
    setSaving(false)
  }
}
```
The `try` block has no `catch`. If `saveAnnotation()` throws (network error, permission denied), the error is swallowed. The modal closes, the annotation doesn't save, and the user has no idea. (The `finally` sets `saving=false` and `closePanel()` is called in the try... actually `closePanel()` is called only if successful. If it throws, the modal stays open. But the error is still invisible.)

Actually re-reading: `closePanel()` is inside `try`, so on error the modal stays open. But there's no `catch` to show an error message. The user sees the button un-spin but no explanation.

---

## System 6: Annotation Retrieval (Teacher)

**Status: BROKEN**  
**Confidence: 9/10**

### Problem

**P15 — CRITICAL: Teacher viewer is broken by Firestore rules**  
File: `src/firebase/annotations.ts` `getAnnotationsByClassAndBook()` line 86-99  
File: `firestore.rules` lines 115-127  

The teacher annotation viewer calls:
```ts
getAnnotationsByClassAndBook(studentIds, selectedBook)
```
This runs a Firestore query:
```
where('bookId', '==', bookId)
where('studentId', 'in', studentIds)
orderBy('pageNumber')
```

The Firestore read rule for annotations:
```
allow read: if isSignedIn() && (
  isOwner(resource.data.studentId)         // student reading own
  || (
    resource.data.keys().hasAll(['classroomId'])  // classroomId must exist
    && resource.data.classroomId is string
    && isClassTeacher(resource.data.classroomId)
  )
);
```

Since `saveAnnotation()` never writes `classroomId`, **no annotation document has this field**. The teacher read rule arm can never pass. Every teacher query will be denied.

**In practice:** Firestore collection queries that hit a permission-denied document on ANY matching doc will throw a `PERMISSION_DENIED` error for the entire query. The `AnnotationsViewerPage.tsx` has no `.catch()` on `fetchAnnotations()`, so the error is silently swallowed and the annotation list shows empty.

**P16 — 30-student silent truncation**  
File: `src/firebase/annotations.ts` line 93  
```ts
studentIds.slice(0, 30)
```
Firestore's `in` operator has a 30-item limit. If a classroom has >30 students, annotations for students 31+ are silently omitted with no warning to the teacher.

---

## System 7: Annotation Retrieval (Student)

**Status: Partially Working**  
**Confidence: 7/10**

### Working
- `getAnnotationsByStudent()` query with `orderBy('timestamp', 'desc')` works if the composite index exists
- `getAnnotationsByStudentAndBook()` with `orderBy('pageNumber')` works if the index exists

### Problems

**P17 — Indexes may not be deployed**  
The `firestore.indexes.json` defines three composite indexes. CLAUDE.md notes: "Firestore rules and indexes are NOT deployed by CI — apply them manually." If indexes haven't been manually deployed to the live project, both `getAnnotationsByStudent` and `getAnnotationsByClassAndBook` will fail with a Firestore error (no fallback client-side sort is attempted). The failure is silent.

**P18 — `MyAnnotationsPage.tsx` no error handling**  
File: `src/pages/student/MyAnnotationsPage.tsx` lines 20-30  
`Promise.all([...]).then([...])` — no `.catch()`. If either query throws, `loading` stays `true` and the page shows a spinner forever.

---

## System 8: Firebase Storage

**Status: Working**  
**Confidence: 8/10**

### Working
- Teacher PDF upload path: `books/{timestamp}_{name}`
- Authenticated read access for all signed-in users
- Write restricted to PDF, <50 MB
- Storage rules are correctly scoped per path

### Problems

**P19 — No CORS configuration verified**  
Storage CORS is not configured in code. Default Firebase Storage CORS allows any origin with `*`. This is fine for this app but means if a custom domain was added to CORS restrictions, it could break. Currently not an issue.

**P20 — Deleted books leave orphaned Storage files if `deleteStudentBook` is not called**  
File: `src/firebase/books.ts` (main only — not on feature branch)  
The teacher book upload has no delete function exposed in the UI. Only student books can be deleted. If a teacher wants to remove a book, they must do it manually in the Firebase Console. The Storage file would be orphaned.

---

## System 9: User Sessions

**Status: Working**  
**Confidence: 8/10**

### Working
- Firebase handles session persistence via `indexedDB` (default)
- Page refresh does not lose the session
- `onAuthStateChanged` correctly fires on mount with the persisted user

### Problems

**P21 — No session timeout**  
Firebase email/password sessions are indefinite by default. A student on a shared school computer stays logged in until they explicitly sign out. No automatic expiry.

**P22 — No loading state on logout**  
`AppShell.tsx` `handleLogout` calls `logoutUser()` then `navigate('/login')`. If `signOut()` is slow, the UI shows nothing. In practice signOut is instant, but there's no feedback.

---

## System 10: Permissions (Firestore Rules)

**Status: Partially Working**  
**Confidence: 8/10**

### Working
- Users can only read/write their own data (annotations, progress)
- Teacher classroom ownership is enforced
- Books are readable only by assigned students or the uploading teacher
- `readingProgress` monotonic increase is enforced in rules

### Problems

**P23 — Annotation read rule blocks teacher viewer (see P15)**  
The annotation read rule design is correct in intent but broken in execution because `classroomId` is never written by the client.

**P24 — `validProgressData` uses `hasOnly()` — very strict**  
File: `firestore.rules` lines 25-37  
```
data.keys().hasOnly([...exact list...])
```
If a future code change adds ANY new field to a progress write, it will be rejected by Firestore with a permissions error. This is brittle — any schema evolution requires a rules update first.

**P25 — Classroom update rule allows any single-student add**  
File: `firestore.rules` lines 70-79  
Any authenticated user can add themselves to ANY classroom (the rule only checks that they add themselves, not that they have the join code). The join code verification happens client-side in `auth.ts`. A malicious user could bypass the client and add themselves to any classroom by calling Firestore directly. This is a security gap.

---

## System 11: Deployment

**Status: Working**  
**Confidence: 9/10**

### Working
- GitHub Actions workflow triggers on push to `main`
- Node 22, `--legacy-peer-deps`, and all env vars are correct
- Firebase Hosting deploy is confirmed working (green CI)
- `pdfWorkerPlugin` correctly copies worker on main
- MIME headers in `firebase.json` prevent iOS Safari issues
- Custom domain `easy-annotate.com` connected to Firebase Hosting

### Problems

**P26 — Firestore rules/indexes not in CI**  
Manual deployment required. If rules change in `firestore.rules` and are committed, the file changes but live rules don't update until someone runs `firebase deploy --only firestore`. This creates a drift risk.

**P27 — Service account JSON was in chat history**  
Per the session summary, the service account JSON was shared in a chat session. User was advised to regenerate it. If this wasn't done, the old key may still be active.

---

## Summary Table

| System | Status | Confidence | Critical Issues |
|---|---|---|---|
| Authentication | Partially Working | 7/10 | Silent profile failure, navigate in render, no password reset |
| PDF Upload | Partially Working | 7/10 | No size validation |
| PDF Rendering | Main: Working / Feature: BROKEN | 4-8/10 | CDN worker on feature branch |
| Annotation Creation | Partially Working | 6/10 | No classroomId written |
| Annotation Saving | Working | 8/10 | Silent error on save failure |
| Annotation Retrieval (Teacher) | BROKEN | 9/10 | Firestore rule blocks teacher reads |
| Annotation Retrieval (Student) | Partially Working | 7/10 | No error handling, index dependency |
| Firebase Storage | Working | 8/10 | No UI size validation |
| User Sessions | Working | 8/10 | No expiry for school computers |
| Firestore Permissions | Partially Working | 8/10 | Classroom join bypass |
| Deployment | Working | 9/10 | Rules not in CI |
