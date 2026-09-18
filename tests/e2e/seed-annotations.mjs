// Seeds the teacher's book plus real student annotations and reading progress on it,
// so the teacher-side annotation flow has something to read. Writes go through the
// real firestore.rules, so this also proves the student-side write paths.
import { readFileSync } from 'node:fs'
import { initializeApp } from 'firebase/app'
import { getAuth, connectAuthEmulator, signInWithEmailAndPassword, signOut } from 'firebase/auth'
import {
  getFirestore, connectFirestoreEmulator,
  doc, setDoc, addDoc, collection, serverTimestamp,
} from 'firebase/firestore'
import { getStorage, connectStorageEmulator, ref, uploadBytes, getDownloadURL } from 'firebase/storage'

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

const CLASS_ID = 'roomA'
const BOOK_ID = 'annbook'

async function uidOf(email) {
  const c = await signInWithEmailAndPassword(auth, email, 'test1234')
  const uid = c.user.uid
  await signOut(auth)
  return uid
}

const tuid = await uidOf('teacher@test.dev')
const suid = await uidOf('student@test.dev')

// Teacher owns the book and assigns it to the student. The file goes to
// books/{teacherId}/, which is what lets storage.rules scope it: readable by
// the teacher who owns the folder and by students enrolled in their classroom.
// Both branches get exercised — the teacher reads it at /teacher/read/:bookId
// and the student at /student/read/:bookId.
await signInWithEmailAndPassword(auth, 'teacher@test.dev', 'test1234')
const bookRef = ref(storage, `books/${tuid}/${BOOK_ID}.pdf`)
await uploadBytes(bookRef, readFileSync('tests/e2e/fixtures/text-color.pdf'), { contentType: 'application/pdf' })
await setDoc(doc(db, 'books', BOOK_ID), {
  title: 'Night on Fire', author: 'Ronald Kidd',
  storageUrl: await getDownloadURL(bookRef),
  uploadedBy: tuid, assignedStudentIds: [suid], createdAt: serverTimestamp(),
})
await signOut(auth)

// Student annotates it and records progress.
await signInWithEmailAndPassword(auth, 'student@test.dev', 'test1234')
const ROWS = [
  [3,  'question',  'Why did she stay quiet here?',      'She said nothing at all.'],
  [3,  'important', 'This is the turning point.',        'Everything changed that morning.'],
  [7,  'surprise',  'I did not expect that.',            ''],
  [7,  'love',      '',                                  'the reef began to glow'],
  [11, 'think',     'Reminds me of the first chapter.',  ''],
]
for (const [pageNumber, reactionType, noteText, selectedText] of ROWS) {
  await addDoc(collection(db, 'annotations'), {
    studentId: suid, bookId: BOOK_ID, classroomId: CLASS_ID,
    pageNumber, reactionType, noteText, selectedText,
    annotationKind: 'annotation', timestamp: serverTimestamp(),
  })
}
await setDoc(doc(db, 'readingProgress', `${suid}_${BOOK_ID}`), {
  studentId: suid, bookId: BOOK_ID, classroomId: CLASS_ID,
  lastReadPage: 11, highestPageRead: 11, totalPages: 20,
  completionPercent: 55, totalSecondsRead: 1380, completed: false,
  lastReadAt: serverTimestamp(), createdAt: serverTimestamp(),
})
await signOut(auth)

console.log(`ANNOTATION_SEED_OK annotations=${ROWS.length}`)
process.exit(0)
