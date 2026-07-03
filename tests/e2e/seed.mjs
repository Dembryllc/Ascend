// Seeds the Auth + Firestore emulators with a teacher, a classroom, an
// assigned writing task, and a student. Writes go through the real
// firestore.rules (the emulator enforces them), so this also proves the
// registration/scoping paths work. Prints TASK_ID=<id> for the E2E script.
import { initializeApp } from 'firebase/app'
import { getAuth, connectAuthEmulator, createUserWithEmailAndPassword, signOut } from 'firebase/auth'
import {
  getFirestore, connectFirestoreEmulator,
  doc, setDoc, updateDoc, addDoc, collection, arrayUnion, serverTimestamp,
} from 'firebase/firestore'

const app = initializeApp({ apiKey: 'demo', projectId: 'demo-ascend', authDomain: 'demo-ascend.firebaseapp.com', appId: 'demo' })
const auth = getAuth(app)
connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true })
const db = getFirestore(app)
connectFirestoreEmulator(db, '127.0.0.1', 8080)

const TEACHER = { email: 'teacher@test.dev', pw: 'test1234', name: 'Ms. Ada' }
const STUDENT = { email: 'student@test.dev', pw: 'test1234', name: 'Sam' }
const CLASS_ID = 'roomA'
const JOIN = 'ROOM01'

// ── Teacher: profile, classroom, and an assigned writing task ──
const t = await createUserWithEmailAndPassword(auth, TEACHER.email, TEACHER.pw)
const tuid = t.user.uid
await setDoc(doc(db, 'users', tuid), {
  uid: tuid, email: TEACHER.email, displayName: TEACHER.name, role: 'teacher',
  classroomId: null, subscriptionStatus: 'free',
  trialEndsAt: new Date(Date.now() + 14 * 864e5), createdAt: serverTimestamp(),
})
await setDoc(doc(db, 'classrooms', CLASS_ID), {
  name: 'Room A', teacherId: tuid, joinCode: JOIN, studentIds: [], createdAt: serverTimestamp(),
})
const taskRef = await addDoc(collection(db, 'writingTasks'), {
  title: 'Persuasive paragraph: school lunches',
  prompt: 'Should schools serve free lunch to every student? Use the paragraph builder to make your case.',
  templateId: 'paragraph-builder', scaffoldDefault: 'guided', studentCanSwitch: true,
  createdBy: tuid, creatorRole: 'teacher', classroomId: CLASS_ID,
  sampleFields: null, sampleVisible: false, createdAt: serverTimestamp(),
})
console.log('TASK_ID=' + taskRef.id)
await signOut(auth)

// ── Student: profile + join the classroom ──
const s = await createUserWithEmailAndPassword(auth, STUDENT.email, STUDENT.pw)
const suid = s.user.uid
await setDoc(doc(db, 'users', suid), {
  uid: suid, displayName: STUDENT.name, role: 'student',
  classroomId: CLASS_ID, subscriptionStatus: 'free', createdAt: serverTimestamp(),
})
await updateDoc(doc(db, 'classrooms', CLASS_ID), { studentIds: arrayUnion(suid) })
await signOut(auth)

console.log('SEED_OK')
process.exit(0)
