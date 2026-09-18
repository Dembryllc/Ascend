// Storage-rules scoping, against the Storage emulator with the real
// storage.rules loaded. Not a browser flow — it drives the Firebase SDK
// directly, because what is under test is who the bucket answers to.
//
// This exists because the reader used to hand pdf.js a getDownloadURL() link
// and let it fetch that URL directly. Such a link carries its own token and
// authenticates as nobody, so storage.rules was never consulted on the one path
// that opens a book. ReadingPage now downloads the bytes as the signed-in user,
// which only means something if the bucket actually refuses everyone else —
// that is what the assertFails cases below pin down.
//
// Uses getBytes rather than getBlob: getBlob is browser-only, and both take the
// identical authenticated path through the rules.
import { initializeApp } from 'firebase/app'
import {
  getAuth, connectAuthEmulator, signInWithEmailAndPassword,
  createUserWithEmailAndPassword, signOut,
} from 'firebase/auth'
import { getFirestore, connectFirestoreEmulator, doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { getStorage, connectStorageEmulator, ref, getBytes } from 'firebase/storage'

const log = (...a) => console.log('[e2e:storage]', ...a)

const app = initializeApp({
  apiKey: 'demo',
  projectId: 'demo-ascend',
  authDomain: 'demo-ascend.firebaseapp.com',
  storageBucket: 'demo-ascend.appspot.com',
  appId: 'demo',
})
const auth = getAuth(app)
connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true })
const db = getFirestore(app)
connectFirestoreEmulator(db, '127.0.0.1', 8080)
const storage = getStorage(app)
connectStorageEmulator(storage, '127.0.0.1', 9199)

const failures = []

async function canRead(path) {
  try {
    await getBytes(ref(storage, path))
    return true
  } catch {
    return false
  }
}

async function expectRead(who, path, allowed) {
  const got = await canRead(path)
  const ok = got === allowed
  if (!ok) {
    failures.push(`${who} ${allowed ? 'should' : 'should NOT'} be able to read ${path} (got ${got})`)
  }
  log(`${ok ? 'ok  ' : 'FAIL'} ${who} ${allowed ? 'reads' : 'is denied'} ${path}`)
}

async function as(email, pw = 'test1234') {
  await signOut(auth).catch(() => {})
  const c = await signInWithEmailAndPassword(auth, email, pw)
  return c.user.uid
}

// Whoever is signed in is irrelevant for these two; we only need the uids.
const tuid = await as('teacher@test.dev')
const suid = await as('student@test.dev')

const TEACHER_BOOK = `books/${tuid}/annbook.pdf`
const STUDENT_BOOK = `student-books/${suid}/bookText.pdf`

// ── the student: their own upload, and their teacher's assigned book ──
await expectRead('enrolled student', STUDENT_BOOK, true)
await expectRead('enrolled student', TEACHER_BOOK, true)

// ── the teacher: their own book, but NOT the student's own upload ──
// Firestore never grants a teacher a student-uploaded book document
// (canReadBook is uploader + assignedStudentIds, and a student upload is both),
// so the bucket must not grant the file either.
await as('teacher@test.dev')
await expectRead('owning teacher', TEACHER_BOOK, true)
await expectRead('owning teacher', STUDENT_BOOK, false)

// ── a signed-in account enrolled nowhere: neither ──
const outsiderEmail = `storage-outsider-${Date.now()}@test.dev`
await signOut(auth).catch(() => {})
const o = await createUserWithEmailAndPassword(auth, outsiderEmail, 'test1234')
await setDoc(doc(db, 'users', o.user.uid), {
  uid: o.user.uid, displayName: 'Nobody', role: 'student',
  classroomId: null, subscriptionStatus: 'free', createdAt: serverTimestamp(),
})
await expectRead('unenrolled account', TEACHER_BOOK, false)
await expectRead('unenrolled account', STUDENT_BOOK, false)

if (failures.length) {
  log('FLOW_FAILED:')
  failures.forEach((f) => log('  -', f))
  process.exit(1)
}
log('FLOW_OK')
process.exit(0)
