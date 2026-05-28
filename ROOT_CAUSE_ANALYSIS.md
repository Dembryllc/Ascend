# Root Cause Analysis — Easy Annotate

**Generated:** 2026-05-28  
**Method:** Static analysis of all source files, Firebase rules, and git history  
**Scope:** Both the feature branch and main/production

---

## CRITICAL

---

### RC-01 — Teacher Annotation Viewer Is Completely Broken

**Rank:** CRITICAL  
**Status:** Present on both branches (production impact)

**Problem:**  
Teachers cannot view any student annotations through the Annotations Viewer. The viewer appears to work (dropdowns populate, "View Annotations" button responds) but always returns an empty list.

**Evidence:**  
`src/firebase/annotations.ts` `saveAnnotation()` lines 35-42:
```ts
const ref = await addDoc(collection(db, 'annotations'), {
  studentId,
  bookId,
  pageNumber,
  reactionType,
  noteText,
  timestamp: serverTimestamp(),
  // classroomId: NEVER WRITTEN
})
```

`firestore.rules` lines 115-127:
```
allow read: if isSignedIn() && (
  isOwner(resource.data.studentId)
  || (
    resource.data.keys().hasAll(['classroomId'])  // requires this field
    && resource.data.classroomId is string
    && isClassTeacher(resource.data.classroomId)
  )
);
```

`src/pages/teacher/AnnotationsViewerPage.tsx` lines 38-44:
```tsx
async function fetchAnnotations() {
  if (!selectedStudent || !selectedBook) return
  setFetching(true)
  const ann = await getAnnotationsByStudentAndBook(selectedStudent, selectedBook)
  // no .catch() — exception is silently swallowed
  setAnnotations(ann)
  setFetching(false)
}
```

**Root cause:** The Firestore rule for teacher read access requires a `classroomId` field in every annotation document, but `saveAnnotation()` never writes that field. Every teacher read is permission-denied. The `AnnotationsViewerPage` has no error handler, so the empty result looks like "no annotations" rather than an error.

**Affected users:** All teachers. The annotations viewer has never worked.

**Potential impact:** Core teacher feature is non-functional. Teachers cannot monitor student reading progress or see what students are reacting to.

**Fix:** `saveAnnotation()` must accept and write `classroomId`. The student's `classroomId` must be passed in from the component. The Firestore rule then becomes satisfiable.

---

### RC-02 — CDN PDF Worker Fails on School Networks (Feature Branch)

**Rank:** CRITICAL (feature branch) / Resolved (production)  
**Status:** Present on feature branch only

**Problem:**  
On this feature branch, zero PDFs render if the user's network blocks `unpkg.com`. This is extremely common on school district networks, which is the target user base.

**Evidence:**  
`src/pages/student/ReadingPage.tsx` line 14:
```tsx
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`
```

This is the approach that previously caused: `"Importing a module script failed."` on iOS Safari and failed on school networks with CDN blocks.

The fix (on `main`) is:
```tsx
pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.mjs'
```

**Root cause:** Feature branch was forked before the worker fix was applied to `main`. The `vite.config.ts` `pdfWorkerPlugin` was brought into this branch, but the `ReadingPage.tsx` still points to CDN.

**Affected users:** All students on school networks (likely majority of users).

**Potential impact:** Total PDF rendering failure. Students cannot read books.

**Fix:** Bring `ReadingPage.tsx` from `main` onto this branch. Or at minimum, change line 14 to `/pdf.worker.mjs`.

---

### RC-03 — Infinite Loading Spinner with No Error Recovery

**Rank:** CRITICAL  
**Status:** Present on both branches (production impact)

**Problem:**  
Three separate pages show a loading spinner that never resolves if a Firestore query throws or returns unexpected data. Users are stuck with no explanation and no way to recover except a full page reload.

**Evidence:**

`src/pages/student/StudentHome.tsx` lines 14-20:
```tsx
useEffect(() => {
  if (!profile) return
  getBooksByStudent(profile.uid).then((b) => {
    setBooks(b)
    setLoading(false)
    // .catch() is MISSING — loading stays true on error
  })
}, [profile])
```

`src/pages/student/ReadingPage.tsx` lines 117-121:
```tsx
if (!book) return (
  <div className="...spinner..." />
  // No timeout, no error state, no "book not found"
)
```

`src/pages/student/MyAnnotationsPage.tsx` lines 20-30:
```tsx
Promise.all([...]).then(([ann, bks]) => {
  ...
  // .catch() is MISSING
})
```

**Root cause:** Async operations use `.then()` without `.catch()`, and loading state is only set to `false` in the happy path. Any Firestore network error, permission denial, or data absence leaves `loading: true` permanently.

**Affected users:** Any user who experiences a network hiccup, permission error, or loads a deleted book.

**Potential impact:** App appears broken. Users assume the app is down rather than retrying.

**Fix:** Add `.catch(err => { setError(err.message); setLoading(false) })` to all async data-loading effects. Add error display in each page.

---

### RC-04 — AuthContext Profile Failure Causes Redirect Loop

**Rank:** CRITICAL  
**Status:** Present on both branches

**Problem:**  
If the Firestore call to load a user's profile fails (network error, Firestore offline mode, rule mismatch), the user is authenticated at the Firebase Auth layer but has no profile. `ProtectedRoute` sees `user != null` but `profile == null`, and its role check `profile?.role !== requiredRole` evaluates to `undefined !== 'student'` = `true` → redirects to `/student` or `/teacher`. But those routes also have ProtectedRoute guards. The app may enter a redirect loop or strand the user on the login page while still authenticated.

**Evidence:**  
`src/context/AuthContext.tsx` lines 21-29:
```tsx
const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
  setUser(firebaseUser)
  if (firebaseUser) {
    const p = await getUserProfile(firebaseUser.uid)  // can throw, no try/catch
    setProfile(p)
  } else {
    setProfile(null)
  }
  setLoading(false)  // called even if getUserProfile threw
})
```

If `getUserProfile` throws, the exception propagates to the `onAuthStateChanged` callback which is not wrapped in `try/catch`. This can cause the `setLoading(false)` to never be called if the exception is uncaught, OR `setLoading(false)` is called but `profile` is null.

`src/components/shared/ProtectedRoute.tsx` lines 24-28:
```tsx
if (!user) return <Navigate to="/login" replace />
if (requiredRole && profile?.role !== requiredRole) {
  return <Navigate to={profile?.role === 'teacher' ? '/teacher' : '/student'} replace />
}
```
If `user` exists but `profile` is null, `profile?.role` is `undefined`. `undefined !== 'student'` is true. The second `Navigate` fires → navigates to `/student` → ProtectedRoute checks again → same condition → infinite redirect.

**Root cause:** No error handling around the async profile fetch in `AuthContext`. No fallback state when profile is unavailable.

**Affected users:** Any user who experiences a transient Firestore error at login time.

**Fix:** Wrap `getUserProfile` in `try/catch` in `AuthContext`. Add an `authError` state. Show an error screen rather than entering a redirect loop.

---

## HIGH

---

### RC-05 — Annotation Composite Indexes May Not Be Deployed

**Rank:** HIGH  
**Status:** Unknown (cannot verify without live Firestore access)

**Problem:**  
Three Firestore composite indexes are defined in `firestore.indexes.json` but are explicitly NOT deployed by CI (`--only hosting`). If these indexes weren't manually deployed, two critical queries silently fail:
- `getAnnotationsByStudent()` — requires `studentId + timestamp DESC` index
- `getAnnotationsByClassAndBook()` — requires `bookId + studentId + pageNumber` index

**Evidence:**  
`firestore.indexes.json` defines 3 indexes.  
`.github/workflows/firebase-deploy.yml` step 3: `firebase deploy --only hosting`  
`CLAUDE.md`: "Firestore rules and indexes are not deployed by CI — apply them manually."

**Affected users:** All students (My Annotations page), all teachers (Annotation Viewer).

**Potential impact:** Both annotation retrieval flows appear to work (no UI error) but return empty results. Users think they have no annotations.

**Fix:** Deploy indexes manually OR add `--only hosting,firestore:indexes` to the CI workflow (after testing that it doesn't re-apply rules unnecessarily).

---

### RC-06 — `navigate()` Called During Render in LoginPage

**Rank:** HIGH  
**Status:** Both branches

**Problem:**  
Calling `navigate()` as a side effect during the render function body violates React's rules. In React 19 concurrent mode, the component may render multiple times before committing. This can trigger multiple navigations or React warnings.

**Evidence:**  
`src/pages/auth/LoginPage.tsx` lines 16-19:
```tsx
if (profile) {
  navigate(profile.role === 'teacher' ? '/teacher' : '/student', { replace: true })
  return null
}
```

**Root cause:** The author intended this as a guard redirect, but it should be in a `useEffect`. React Router's own docs explicitly say to use `<Navigate>` component or `useEffect` for redirects.

**Fix:** Replace with `<Navigate to={...} replace />` component:
```tsx
if (profile) {
  return <Navigate to={profile.role === 'teacher' ? '/teacher' : '/student'} replace />
}
```

---

### RC-07 — Classroom Join Code Security Bypass

**Rank:** HIGH  
**Status:** Both branches

**Problem:**  
The join code check is client-side only. The Firestore rule for classroom `update` allows any authenticated user to add themselves to any classroom, regardless of whether they know the join code. A user with Firestore SDK access can add themselves to any classroom by calling `updateDoc` directly.

**Evidence:**  
`firestore.rules` lines 70-79:
```
allow update: if isSignedIn() && (
  isOwner(resource.data.teacherId)
  || (
    request.resource.data.diff(resource.data).affectedKeys().hasOnly(['studentIds'])
    && !(request.auth.uid in resource.data.studentIds)
    && request.auth.uid in request.resource.data.studentIds
    && request.resource.data.studentIds.hasAll(resource.data.studentIds)
    && request.resource.data.studentIds.size() == resource.data.studentIds.size() + 1
  )
);
```
The rule only checks that the user adds themselves (not that they know the join code). Join code validation only happens in `auth.ts` `resolveJoinCode()` — on the client.

**Affected users:** Privacy exposure for all classrooms.

**Potential impact:** Students or malicious actors can join any classroom they find the ID for (by guessing or by reading publicly accessible classroom data — all classrooms are readable by any signed-in user).

**Fix:** Move join code validation to Firestore rules, or use Firebase Functions to validate join codes server-side. The rule should check `request.resource.data.joinCode == resource.data.joinCode`.

---

### RC-08 — No Error Feedback When Annotation Save Fails

**Rank:** HIGH  
**Status:** Both branches

**Problem:**  
If `saveAnnotation()` or `updateAnnotation()` fails (Firestore offline, network error), the annotation modal closes (or stays open) with no error message. The student doesn't know the annotation wasn't saved.

**Evidence:**  
`src/pages/student/ReadingPage.tsx` lines 78-99:
```tsx
async function handleSave() {
  if (!profile || !bookId) return
  setSaving(true)
  try {
    if (annotationPanel.editing) {
      await updateAnnotation(...)
      // update local state
    } else {
      const ann = await saveAnnotation(...)
      // update local state
    }
    closePanel()
  } finally {  // NO CATCH — error is silently discarded
    setSaving(false)
  }
}
```

**Fix:** Add `catch (err)` block that sets an error state and displays it in the modal.

---

### RC-09 — ClassroomPage: N Sequential Firestore Reads for Student Profiles

**Rank:** HIGH  
**Status:** Both branches

**Problem:**  
`ClassroomPage` fetches every student's full profile individually:
```tsx
const profiles = await Promise.all(c.studentIds.map((id) => getUserProfile(id)))
```
With 30 students = 30 Firestore `getDoc` calls. Each has network latency. Firestore charges per read. This is slow, expensive, and shows a spinner the entire time.

**Evidence:**  
`src/pages/teacher/ClassroomPage.tsx` lines 29-33.

**Fix:** Firestore doesn't support "get all documents by ID array" natively. Options: (a) denormalize student display names into the classroom document, (b) use `getDocs` with `where('uid', 'in', studentIds)` in batches of 30, or (c) accept the N reads but show incremental loading.

---

### RC-10 — Teacher Classroom Scoped to One Classroom

**Rank:** HIGH (design limitation)

**Problem:**  
`getClassroomByTeacher()` returns only the FIRST classroom matching the teacher's UID:
```ts
if (snap.empty) return null
const d = snap.docs[0]
```
A teacher cannot manage multiple classrooms. If a teacher accidentally creates two classrooms, the second is invisible in the UI.

**Affected users:** Any teacher who teaches multiple classes.

**Fix:** `getClassroomByTeacher` should return `Classroom[]`. ClassroomPage should support selecting among multiple classrooms.

---

## MEDIUM

---

### RC-11 — No Password Reset Flow

**Rank:** MEDIUM  
**Status:** Both branches

**Problem:** No "Forgot password?" link. Firebase provides `sendPasswordResetEmail`. Users who lose their password cannot recover without contacting someone who has Firebase Console access.

**Fix:** Add "Forgot password?" link to LoginPage that calls `sendPasswordResetEmail(auth, email)`.

---

### RC-12 — Student Cannot Register Without Classroom Code

**Rank:** MEDIUM  
**Status:** Both branches

**Problem:**  
`RegisterPage` requires a join code for students. If a teacher hasn't created a classroom yet, students cannot register. There is no out-of-band mechanism (e.g., teacher shares classroom first, then students register).

**Fix:** Allow optional join code at registration, with ability to join a classroom later from the student home page. Or add an onboarding flow that makes the sequence clear.

---

### RC-13 — No File Size Feedback on PDF Upload

**Rank:** MEDIUM  
**Status:** Both branches

**Problem:**  
Storage rejects files >50 MB, but the UI provides no guidance. The error message is generic: "Upload failed. Please try again."

**Evidence:** `UploadBookPage.tsx` — no file size check anywhere.

**Fix:** 
```tsx
if (f.size > 52428800) {
  setError('PDF must be under 50 MB. Please compress it first.')
  return
}
```

---

### RC-14 — No Error Boundary

**Rank:** MEDIUM  
**Status:** Both branches

**Problem:** Any unhandled JavaScript exception in a React component tree crashes the entire app to a blank white screen with no message. React 18+ requires explicit `ErrorBoundary` components.

**Fix:** Wrap `<App>` (or each page) in a `<ErrorBoundary>` component that shows a "Something went wrong" message with a reload button.

---

### RC-15 — Speech Synthesis Timing Race Condition

**Rank:** MEDIUM  
**Status:** Both branches (simpler version on feature branch)

**Problem:**  
`speakPage()` queries `document.querySelector('.react-pdf__Page__textContent')`. If called immediately after page navigation, the text layer may not have rendered yet. The user hears "Page 3" instead of the page content.

**Fix:** Use `pdfDocument.getPage(n).getTextContent()` (the PDF.js API) instead of scraping the DOM. This is independent of render state.

---

### RC-16 — No Deletion Confirmation for Annotations

**Rank:** MEDIUM  
**Status:** Both branches

**Problem:** Delete button immediately deletes without confirming. Irreversible.

**Fix:** `if (!confirm('Delete this annotation?')) return` or a proper confirm modal.

---

### RC-17 — Book Assigned to Student But Not in Their Classroom

**Rank:** MEDIUM  
**Status:** Both branches

**Problem:**  
`assignBookToStudent` adds a student to `book.assignedStudentIds`, but the Firestore read rule checks `request.auth.uid in resource.data.assignedStudentIds`. There's no check that the student is in the teacher's classroom. A teacher can assign any book to any student by UID if they know the student's UID. This is unlikely in practice but a data hygiene gap.

---

### RC-18 — No Offline or Network Error Indicator

**Rank:** MEDIUM  
**Status:** Both branches

**Problem:** No detection of Firebase offline state, no "You're offline" banner, no retry logic. A student in a spotty wifi area experiences an unresponsive app with no explanation.

**Fix:** Use Firestore's `enableNetwork`/`disableNetwork` + Firebase's connection state listener to show an offline banner.

---

## LOW

---

### RC-19 — Indefinite Session for School Shared Computers

**Rank:** LOW  
**Status:** Both branches

Firebase email/password sessions don't expire. On a school computer, student A logs in, forgets to log out, student B uses the same browser and sees student A's books and annotations.

**Fix:** Call `setPersistence(auth, browserSessionPersistence)` so sessions clear on tab close.

---

### RC-20 — No Teacher PDF Delete in UI

**Rank:** LOW  
**Status:** Both branches

Teachers have no way to remove a book from the UI. Only student-uploaded books have delete functionality (on `main`). Teachers can't remove a book assigned by mistake.

**Fix:** Add a delete action on `TeacherDashboard`'s book list.

---

## Priority Summary

| # | Issue | Rank | Branch | User Impact |
|---|---|---|---|---|
| RC-01 | Teacher viewer broken (no classroomId in annotations) | CRITICAL | Both | All teachers — core feature doesn't work |
| RC-02 | CDN PDF worker (school network blocks) | CRITICAL | Feature branch | All students on feature branch |
| RC-03 | Infinite spinner on any data error | CRITICAL | Both | Any user on bad network |
| RC-04 | Auth profile failure → redirect loop | CRITICAL | Both | Any user on transient error |
| RC-05 | Firestore indexes may not be deployed | HIGH | Both | All annotation queries |
| RC-06 | navigate() in render (React anti-pattern) | HIGH | Both | All users on login |
| RC-07 | Classroom join bypass in Firestore rules | HIGH | Both | Privacy/security |
| RC-08 | Silent annotation save failure | HIGH | Both | Students losing notes |
| RC-09 | N Firestore reads for student profiles | HIGH | Both | Teacher classroom page slow |
| RC-10 | One classroom per teacher (design limit) | HIGH | Both | Multi-class teachers |
| RC-11 | No password reset | MEDIUM | Both | Locked-out users |
| RC-12 | Student requires join code to register | MEDIUM | Both | New student onboarding |
| RC-13 | No file size feedback on upload | MEDIUM | Both | Teachers with large PDFs |
| RC-14 | No error boundary | MEDIUM | Both | App crashes on white screen |
| RC-15 | Speech synthesis timing | MEDIUM | Both | Read-aloud reads nothing |
| RC-16 | No annotation delete confirmation | MEDIUM | Both | Accidental data loss |
| RC-17 | Book assignment cross-classroom | MEDIUM | Both | Data hygiene |
| RC-18 | No offline indicator | MEDIUM | Both | Students on bad wifi |
| RC-19 | Session doesn't expire on shared computers | LOW | Both | School computer privacy |
| RC-20 | No teacher book delete in UI | LOW | Both | Admin convenience |
