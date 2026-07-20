# Stabilization Plan — Easy Annotate

> **PARTIALLY HISTORICAL — 2026-05-28 snapshot.** Phases 1–2 (critical fixes, core functionality)
> are done — see PR #1 and later PRs. Sections 5.3–5.7 (district-readiness backlog: multi-classroom,
> accessibility audit, load testing, CSV export) are still an accurate outstanding roadmap as of
> 2026-07-19. Check `CLAUDE.md` and current code before treating any single line here as done or not.

**Generated:** 2026-05-28  
**Based on:** HEALTH_AUDIT.md + ROOT_CAUSE_ANALYSIS.md  
**Target:** Stable beta suitable for district deployment

---

## Phase 1: Critical Fixes
*Goal: Stop the bleeding. Fix issues that make core features completely non-functional.*  
*Estimated effort: 1–2 days*

---

### 1.1 Fix Teacher Annotation Viewer (RC-01)

**Why critical:** Teachers cannot see any student annotations. The central value proposition of the app is invisible to teachers. This has never worked.

**What to change:**

**`src/firebase/annotations.ts` — `saveAnnotation()`**  
Add `classroomId` parameter and write it to Firestore:
```ts
export async function saveAnnotation(
  studentId: string,
  bookId: string,
  classroomId: string | null,  // ADD THIS
  pageNumber: number,
  reactionType: ReactionType,
  noteText: string,
): Promise<Annotation>
```

**`src/pages/student/ReadingPage.tsx`**  
Pass `profile.classroomId` when calling `saveAnnotation`.

**`src/types/index.ts` — `Annotation` interface**  
Add `classroomId: string | null`.

**`src/firebase/annotations.ts` — `toAnnotation()`**  
Map `classroomId` from Firestore data.

**Verification:** After fix, teacher selects student + book → annotations appear.

---

### 1.2 Fix Infinite Loading Spinners (RC-03)

**Why critical:** Any network error leaves the user staring at a spinner with no path to recovery.

**Files to change:**

**`src/pages/student/StudentHome.tsx`**  
```tsx
getBooksByStudent(profile.uid)
  .then((b) => { setBooks(b); setLoading(false) })
  .catch(() => { setError('Could not load books. Please refresh.'); setLoading(false) })
```

**`src/pages/student/MyAnnotationsPage.tsx`**  
Same pattern — add `.catch()` to the `Promise.all`.

**`src/pages/student/ReadingPage.tsx`**  
Add `loadingBook` state and `readerError` state. Add `onLoadError` prop to `<Document>`. If `getBook()` returns null, show "Book not found" instead of spinner.

**`src/pages/teacher/ClassroomPage.tsx`**  
Add `.catch()` to the `Promise.all` in `useEffect`.

**`src/pages/teacher/TeacherDashboard.tsx`**  
Add `.catch()` to the `Promise.all` in `useEffect`.

**`src/pages/teacher/AnnotationsViewerPage.tsx`**  
Wrap `fetchAnnotations()` in try/catch. Display error if Firestore throws.

---

### 1.3 Fix AuthContext Profile Failure (RC-04)

**Why critical:** Transient Firestore errors strand users in a redirect loop. App appears completely broken.

**`src/context/AuthContext.tsx`**  
```tsx
const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
  setUser(firebaseUser)
  if (firebaseUser) {
    try {
      const p = await getUserProfile(firebaseUser.uid)
      setProfile(p)
    } catch {
      setProfile(null)
      // optionally set authError state
    }
  } else {
    setProfile(null)
  }
  setLoading(false)
})
```

---

### 1.4 Fix LoginPage React Anti-Pattern (RC-06)

**Why critical:** Calling `navigate()` during render can cause double-renders and React 19 strict mode warnings.

**`src/pages/auth/LoginPage.tsx`** lines 16-19:
```tsx
// BEFORE:
if (profile) {
  navigate(...)
  return null
}

// AFTER:
if (profile) {
  return <Navigate to={profile.role === 'teacher' ? '/teacher' : '/student'} replace />
}
```

---

### 1.5 Deploy Firestore Composite Indexes (RC-05)

**Why critical:** Student "My Annotations" page and teacher annotation viewer both require composite indexes. Without them, annotation queries silently fail.

**Action (manual — Firebase Console or CLI):**
```bash
firebase deploy --only firestore:indexes --project ascend-annotate
```

**Then add to CI workflow to prevent future drift:**
```yaml
- name: Deploy to Firebase Hosting + Firestore indexes
  run: |
    firebase deploy --only hosting,firestore:indexes --project ascend-annotate
```
*Note: Do NOT include `firestore:rules` in CI until rules changes are validated.*

---

### 1.6 Fix Silent Annotation Save Failure (RC-08)

**`src/pages/student/ReadingPage.tsx` — `handleSave()`**  
Add `catch` and show error inside the modal:
```tsx
const [saveError, setSaveError] = useState('')

async function handleSave() {
  setSaving(true)
  setSaveError('')
  try {
    // ... existing save logic
    closePanel()
  } catch {
    setSaveError('Could not save. Please try again.')
  } finally {
    setSaving(false)
  }
}
```
Display `saveError` in the annotation modal above the buttons.

---

## Phase 2: Major Functionality
*Goal: Core features work reliably. No data loss, no silent failures.*  
*Estimated effort: 2–3 days*

---

### 2.1 Add Password Reset Flow (RC-11)

**`src/pages/auth/LoginPage.tsx`**  
Add "Forgot password?" link. Create `ForgotPasswordPage.tsx`:
```tsx
import { sendPasswordResetEmail } from 'firebase/auth'

async function handleReset() {
  await sendPasswordResetEmail(auth, email)
  setMessage('Check your email for a reset link.')
}
```
Add route `/forgot-password` to `App.tsx`.

---

### 2.2 Add File Size Validation to Upload (RC-13)

**`src/pages/teacher/UploadBookPage.tsx` — `handleFileChange()`**  
```tsx
if (f.size > 52428800) {
  setError('This PDF is too large (max 50 MB). Please compress it and try again.')
  return
}
```

---

### 2.3 Add Error Boundary (RC-14)

Create `src/components/shared/ErrorBoundary.tsx`:
```tsx
class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null }
  static getDerivedStateFromError(error) { return { hasError: true, error } }
  render() {
    if (this.state.hasError) return <ErrorScreen onRetry={() => window.location.reload()} />
    return this.props.children
  }
}
```

Wrap `<App>` in `src/main.tsx`:
```tsx
<ErrorBoundary>
  <App />
</ErrorBoundary>
```

---

### 2.4 Flexible Student Registration (RC-12)

Allow students to register without a join code and join a classroom later. Add a "Join a Classroom" section to `StudentHome.tsx` for students with `classroomId === null`.

**`src/pages/auth/RegisterPage.tsx`**  
Make join code optional for students. Change validation from "required" to "if provided, must be valid."

**`src/pages/student/StudentHome.tsx`**  
Add "Join Classroom" card if `profile.classroomId` is null.

---

### 2.5 Fix Classroom Profile Loading Performance (RC-09)

**`src/pages/teacher/ClassroomPage.tsx`**  
Replace individual `getUserProfile` calls with a batched query:
```ts
const q = query(collection(db, 'users'), where('__name__', 'in', studentIds.slice(0, 30)))
```
Or denormalize student `displayName` into the classroom document's `studentIds` array as objects `{ uid, displayName }`.

---

### 2.6 Fortify Classroom Join Code in Firestore Rules (RC-07)

**`firestore.rules` — classroom update rule**  
Add join code verification:
```
allow update: if isSignedIn() && (
  isOwner(resource.data.teacherId)
  || (
    request.resource.data.diff(resource.data).affectedKeys().hasOnly(['studentIds'])
    && !(request.auth.uid in resource.data.studentIds)
    && request.auth.uid in request.resource.data.studentIds
    && request.resource.data.studentIds.hasAll(resource.data.studentIds)
    && request.resource.data.studentIds.size() == resource.data.studentIds.size() + 1
    && request.resource.data.joinCode == resource.data.joinCode  // ADD THIS
    // Can't verify the student KNOWS the code from rules alone without passing it in write
  )
);
```
*Note: True join-code enforcement requires server-side validation (Cloud Function) since the rule can't compare the "submitted" join code against the stored one during an update to a different field. Best fix: require the join code to be submitted in the update payload and verified against `resource.data.joinCode`.*

---

### 2.7 Multi-Classroom Support for Teachers (RC-10)

**`src/firebase/classrooms.ts`**  
Change `getClassroomByTeacher` to return `Classroom[]`:
```ts
export async function getClassroomsByTeacher(teacherId: string): Promise<Classroom[]>
```

Update `ClassroomPage.tsx` and `TeacherDashboard.tsx` to handle multiple classrooms. Add a classroom selector dropdown.

---

## Phase 3: UX Improvements
*Goal: The app feels professional and trustworthy. No confusing silent failures.*  
*Estimated effort: 2–3 days*

---

### 3.1 Annotation Delete Confirmation (RC-16)

Add a confirmation step before deleting annotations. Options:
- `window.confirm('Delete this annotation? This cannot be undone.')` — quick but ugly
- A small inline "Are you sure? [Yes, delete] [Cancel]" state in the annotation card — better UX

---

### 3.2 Fix Speech Synthesis Text Extraction (RC-15)

Replace DOM scraping with PDF.js API:
```tsx
async function speakPage() {
  if (!pdfDocument) return
  const page = await pdfDocument.getPage(currentPage)
  const textContent = await page.getTextContent()
  const text = textContent.items.map((item: { str: string }) => item.str).join(' ')
  const utt = new SpeechSynthesisUtterance(text || `Page ${currentPage}`)
  ...
}
```
This is already implemented on `main` branch — bring `ReadingPage.tsx` from main.

---

### 3.3 Offline / Network Error Indicator

Add a connection listener in `AuthContext` or `App`:
```tsx
useEffect(() => {
  const handler = () => setIsOnline(navigator.onLine)
  window.addEventListener('online', handler)
  window.addEventListener('offline', handler)
  return () => { ... }
}, [])
```
Show a banner: `"You're offline. Changes may not save until you reconnect."`

---

### 3.4 Session Expiry for School Computers (RC-19)

In `src/firebase/config.ts` or `src/firebase/auth.ts`:
```ts
import { browserSessionPersistence, setPersistence } from 'firebase/auth'
await setPersistence(auth, browserSessionPersistence)
```
This clears the session when the browser tab is closed. Sessions persist within the same tab session only.

*Trade-off: Students on personal devices will need to log in every time they open a new tab. Consider making this configurable or adding a "Remember me" checkbox.*

---

### 3.5 Better Empty States and Onboarding

- `StudentHome`: If no books, explain WHY and what to do ("Ask your teacher to assign books").
- `AnnotationsViewerPage`: If annotations are empty, distinguish between "no annotations exist" vs "query failed."
- `ClassroomPage`: If no classroom, make it more obvious what order to do things in.

---

### 3.6 Teacher Book Delete in UI (RC-20)

Add a delete button to each book card in `TeacherDashboard`. Connect to a `deleteBook(bookId, storageUrl)` function that removes both the Firestore doc and the Storage file.

---

## Phase 4: Hosting Migration (Complete)

*Status: Complete as of 2026-05-28*

- [x] Firebase Hosting configured (`firebase.json`, `.firebaserc`)
- [x] GitHub Actions CI/CD pipeline active (`firebase-deploy.yml`)
- [x] PDF.js worker served locally with correct MIME headers
- [x] Cache-Control headers optimized for SPA + hashed assets
- [x] Custom domain `easy-annotate.com` connected to Firebase Hosting
- [x] Firebase Auth authorized domains updated
- [x] DNS cutover complete

**Remaining hosting tasks:**
- [ ] Confirm Netlify billing status. If bill is resolved, can remove Netlify site (wait 2+ weeks post-cutover per migration plan)
- [ ] Add Firestore indexes to CI deploy (`--only hosting,firestore:indexes`)
- [ ] Merge migration branch changes to main after Phase 1+2 fixes are applied there

---

## Phase 5: District Readiness
*Goal: App is ready for deployment to a school district. Meets basic IT, privacy, and reliability requirements.*  
*Estimated effort: 1–2 weeks*

---

### 5.1 Privacy and Data Compliance

- [ ] Create a Privacy Policy page accessible from the login screen
- [ ] Ensure FERPA compliance — student data (names, annotations) must not be accessible to unauthorized parties. Current Firestore rules provide the technical enforcement; legal/policy documentation must also exist.
- [ ] Review Firebase project settings for data residency requirements (some districts require US-only data storage)

---

### 5.2 Account Management

- [ ] Teacher admin can reset student passwords (currently no mechanism)
- [ ] Teacher can remove a student from a classroom
- [ ] Password reset flow (Phase 2, 2.1) is essential before district use

---

### 5.3 Reliability Monitoring

- [ ] Set up Firebase Crashlytics or similar error tracking (currently no observability)
- [ ] Set up Firebase Performance Monitoring for PDF load times
- [ ] Set up Firestore usage alerts (budget alerts in Firebase Console) to avoid unexpected billing

---

### 5.4 Accessibility

- [ ] Screen reader audit (annotations use emoji heavily — need `aria-label` on all emoji elements)
- [ ] Keyboard navigation for annotation panel and PDF reader
- [ ] Focus management when modal opens/closes
- [ ] Color contrast audit (current palette appears adequate but unverified)

---

### 5.5 Load Testing

- [ ] Test behavior with 30 concurrent students in a classroom
- [ ] Test Firestore read limits (free tier: 50K reads/day; 30 students × 20 pages × 1 annotation query = 600 reads per class session)
- [ ] Test Firebase Storage bandwidth for large PDFs under concurrent load

---

### 5.6 Multi-Classroom Architecture

- [ ] Teacher manages multiple classrooms (Phase 2, 2.7) is required for district use
- [ ] Consider a "school" entity above classrooms (multiple teachers, admin access)

---

### 5.7 Export and Reporting

- [ ] The existing annotation PDF export (jsPDF) is functional but basic
- [ ] District may need CSV export for gradebook integration
- [ ] Reading progress reports across all students in a classroom

---

## Estimated Timeline

| Phase | Work | Calendar estimate |
|---|---|---|
| Phase 1 | Critical fixes | 1–2 days |
| Phase 2 | Major functionality | 3–5 days |
| Phase 3 | UX improvements | 3–4 days |
| Phase 4 | Hosting (done) | Complete |
| Phase 5 | District readiness | 2–3 weeks |
| **Total to stable beta** | Phases 1–3 | **~2 weeks** |
| **Total to district ready** | Phases 1–5 | **~5 weeks** |

---

## Fastest Wins (Can be done today)

In order of impact vs. effort:

1. **Fix LoginPage navigate() in render** — 3 lines changed, no risk
2. **Add `.catch()` to all data-loading effects** — ~20 lines total, prevents infinite spinners
3. **Add file size check in upload** — 5 lines, prevents confusing errors
4. **Deploy Firestore indexes** — CLI command, not a code change
5. **Add `classroomId` to `saveAnnotation()`** — fixes the teacher viewer completely
