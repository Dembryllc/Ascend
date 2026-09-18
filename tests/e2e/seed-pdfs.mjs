// Seeds the seeded student two books that LOOK identical (same colourful page)
// but differ in one way: one carries a PDF text layer, the other is the same
// page rasterised — what a scan, a phone photo, or a design-tool export gives.
//
// The fixtures are uploaded to the Storage emulator under the student's own
// student-books/{uid}/ folder, the same path uploadStudentBook writes to, and
// the book documents carry the resulting download URL. They used to carry a
// relative Vite path instead, which meant the reader fetched them same-origin
// and no E2E flow ever touched Firebase Storage or storage.rules at all.
import { readFileSync } from 'node:fs'
import { initializeApp } from 'firebase/app'
import { getAuth, connectAuthEmulator, signInWithEmailAndPassword } from 'firebase/auth'
import { getFirestore, connectFirestoreEmulator, doc, setDoc, serverTimestamp } from 'firebase/firestore'
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

const s = await signInWithEmailAndPassword(auth, 'student@test.dev', 'test1234')
const uid = s.user.uid

for (const [id, title, file] of [
  ['bookText', 'Text-layer colour PDF', 'tests/e2e/fixtures/text-color.pdf'],
  ['bookScan', 'Scanned colour PDF', 'tests/e2e/fixtures/scan-color.pdf'],
]) {
  const objectRef = ref(storage, `student-books/${uid}/${id}.pdf`)
  await uploadBytes(objectRef, readFileSync(file), { contentType: 'application/pdf' })
  const storageUrl = await getDownloadURL(objectRef)
  await setDoc(doc(db, 'books', id), {
    title, author: 'Test', storageUrl, uploadedBy: uid,
    uploadedByStudent: true, assignedStudentIds: [uid], createdAt: serverTimestamp(),
  })
}
console.log('PDF_SEED_OK uid=' + uid)
process.exit(0)
