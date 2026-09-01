// Seeds the seeded student two books that LOOK identical (same colourful page)
// but differ in one way: one carries a PDF text layer, the other is the same
// page rasterised — what a scan, a phone photo, or a design-tool export gives.
import { initializeApp } from 'firebase/app'
import { getAuth, connectAuthEmulator, signInWithEmailAndPassword } from 'firebase/auth'
import { getFirestore, connectFirestoreEmulator, doc, setDoc, serverTimestamp } from 'firebase/firestore'

const app = initializeApp({ apiKey: 'demo', projectId: 'demo-ascend', authDomain: 'demo-ascend.firebaseapp.com', appId: 'demo' })
const auth = getAuth(app)
connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true })
const db = getFirestore(app)
connectFirestoreEmulator(db, '127.0.0.1', 8080)

const s = await signInWithEmailAndPassword(auth, 'student@test.dev', 'test1234')
const uid = s.user.uid
for (const [id, title, url] of [
  ['bookText', 'Text-layer colour PDF', '/tests/e2e/fixtures/text-color.pdf'],
  ['bookScan', 'Scanned colour PDF', '/tests/e2e/fixtures/scan-color.pdf'],
]) {
  await setDoc(doc(db, 'books', id), {
    title, author: 'Test', storageUrl: url, uploadedBy: uid,
    assignedStudentIds: [uid], createdAt: serverTimestamp(),
  })
}
console.log('PDF_SEED_OK uid=' + uid)
process.exit(0)
