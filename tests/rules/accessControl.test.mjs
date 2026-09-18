// Firestore security-rules tests for the three access-control holes found in
// the 2026-09-18 FERPA audit. Every `assertFails` here is a request that
// SUCCEEDED against the rules as shipped.
//
// Worth saying plainly, because it is the lesson of the audit: the other six
// rules suites passed unchanged against both the broken rules and the fixed
// ones. They seed through withSecurityRulesDisabled and then test the paths the
// app actually walks, so a rule that let in everybody looked exactly like a rule
// that let in the right person. Nothing here asks whether a feature works. Every
// case asks who else could have done it.
//
//   1. users       — `allow read: if isSignedIn()` published every student's
//                    name, role and classroom, and every teacher's email and
//                    stripeCustomerId, to any account that could sign up.
//   2. classrooms  — `allow read: if isSignedIn()` published every roster and
//                    join code; the update rule let any account add itself to
//                    any roster, and the books rule to any book, with no code.
//   3. books       — the same self-add, reached through assignedStudentIds.
import { before, after, beforeEach, describe, it } from 'node:test'
import { readFileSync } from 'node:fs'
import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
} from '@firebase/rules-unit-testing'
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore'

const T = 'teacher1'    // owns classA and bookT
const T2 = 'teacher2'   // owns classB — no claim on anything of teacher1's
const S1 = 'stud1'      // in classA, assigned bookT
const S2 = 'stud2'      // in classB — a real user, but a stranger to classA
const O = 'outsider'    // signed in, enrolled nowhere

const CLASS = 'classA'
const OTHER_CLASS = 'classB'
const BOOK = 'bookT'

let testEnv
const db = (uid) => testEnv.authenticatedContext(uid).firestore()

before(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'demo-ascend',
    firestore: { rules: readFileSync('firestore.rules', 'utf8'), host: '127.0.0.1', port: 8080 },
  })
})

after(async () => { await testEnv.cleanup() })

beforeEach(async () => {
  await testEnv.clearFirestore()
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const admin = ctx.firestore()
    await setDoc(doc(admin, 'classrooms', CLASS), {
      teacherId: T, studentIds: [S1], joinCode: 'ABCDEF', name: 'Room A', createdAt: new Date(),
    })
    await setDoc(doc(admin, 'classrooms', OTHER_CLASS), {
      teacherId: T2, studentIds: [S2], joinCode: 'GHIJKL', name: 'Room B', createdAt: new Date(),
    })
    // Teacher profiles carry the billing identifiers and the only emails in
    // Firestore. classroomId is null on them, which is what keeps them private.
    await setDoc(doc(admin, 'users', T), {
      uid: T, email: 'ada@school.org', displayName: 'Ms. Ada', role: 'teacher',
      classroomId: null, subscriptionStatus: 'pro', stripeCustomerId: 'cus_123',
    })
    await setDoc(doc(admin, 'users', T2), {
      uid: T2, email: 'bo@school.org', displayName: 'Mr. Bo', role: 'teacher',
      classroomId: null, subscriptionStatus: 'free',
    })
    await setDoc(doc(admin, 'users', S1), { uid: S1, displayName: 'Sam', role: 'student', classroomId: CLASS })
    await setDoc(doc(admin, 'users', S2), { uid: S2, displayName: 'Sky', role: 'student', classroomId: OTHER_CLASS })
    await setDoc(doc(admin, 'users', O), { uid: O, displayName: 'Nobody', role: 'student', classroomId: null })
    await setDoc(doc(admin, 'books', BOOK), {
      title: 'A Book', author: '', storageUrl: 'books/teacher1/a.pdf',
      uploadedBy: T, assignedStudentIds: [S1], createdAt: new Date(),
    })
  })
})

describe('users — profile reads are scoped to self and to one\'s own roster', () => {
  it('a user reads their own profile', async () => {
    await assertSucceeds(getDoc(doc(db(S1), 'users', S1)))
    await assertSucceeds(getDoc(doc(db(T), 'users', T)))
  })

  it('a teacher reads a student enrolled in the classroom they own', async () => {
    await assertSucceeds(getDoc(doc(db(T), 'users', S1)))
  })

  it('a teacher cannot read a student in someone else\'s classroom', async () => {
    await assertFails(getDoc(doc(db(T), 'users', S2)))
    await assertFails(getDoc(doc(db(T2), 'users', S1)))
  })

  it('a student cannot read a classmate, or any other student', async () => {
    await assertFails(getDoc(doc(db(S1), 'users', S2)))
    await assertFails(getDoc(doc(db(S2), 'users', S1)))
  })

  it('a student cannot read their own teacher — email and stripeCustomerId', async () => {
    await assertFails(getDoc(doc(db(S1), 'users', T)))
  })

  it('a teacher cannot read another teacher — email and stripeCustomerId', async () => {
    await assertFails(getDoc(doc(db(T2), 'users', T)))
  })

  it('a signed-in account enrolled nowhere can read nobody', async () => {
    await assertFails(getDoc(doc(db(O), 'users', S1)))
    await assertFails(getDoc(doc(db(O), 'users', T)))
  })

  it('un-enrolment revokes the teacher\'s read of that student', async () => {
    await assertSucceeds(getDoc(doc(db(T), 'users', S1)))
    // Exactly what removeStudentFromClassroom does.
    await assertSucceeds(updateDoc(doc(db(T), 'users', S1), { classroomId: null }))
    await assertFails(getDoc(doc(db(T), 'users', S1)))
  })
})

describe('classrooms — rosters and join codes are not public', () => {
  it('the owning teacher and an enrolled student can read the classroom', async () => {
    await assertSucceeds(getDoc(doc(db(T), 'classrooms', CLASS)))
    await assertSucceeds(getDoc(doc(db(S1), 'classrooms', CLASS)))
  })

  it('a signed-in stranger cannot read a classroom — roster or join code', async () => {
    await assertFails(getDoc(doc(db(O), 'classrooms', CLASS)))
    await assertFails(getDoc(doc(db(S2), 'classrooms', CLASS)))
    await assertFails(getDoc(doc(db(T2), 'classrooms', CLASS)))
  })

  it('no client may create a classroom, not even a teacher for themselves', async () => {
    // Creation is the createClassroom callable's job: the join code has to be
    // unique across a collection no client can read, and a client-chosen code
    // can be made to collide with a real teacher's.
    await assertFails(setDoc(doc(db(T), 'classrooms', 'newRoom'), {
      teacherId: T, studentIds: [], joinCode: 'MNOPQR', name: 'Room C', createdAt: new Date(),
    }))
    await assertFails(setDoc(doc(db(O), 'classrooms', 'forged'), {
      teacherId: O, studentIds: [], joinCode: 'ABCDEF', name: 'Not A Room', createdAt: new Date(),
    }))
  })

  it('an account cannot enrol itself in a classroom', async () => {
    // The hole: the old rule proved only that the caller was adding themselves
    // and adding exactly one id. It never saw a join code, because the code is
    // not part of the document being written.
    await assertFails(updateDoc(doc(db(O), 'classrooms', CLASS), { studentIds: [S1, O] }))
    await assertFails(updateDoc(doc(db(S2), 'classrooms', CLASS), { studentIds: [S1, S2] }))
  })

  it('the owning teacher can still manage their own roster', async () => {
    await assertSucceeds(updateDoc(doc(db(T), 'classrooms', CLASS), { studentIds: [] }))
    await assertFails(updateDoc(doc(db(T2), 'classrooms', CLASS), { studentIds: [] }))
  })
})

describe('books — assignment is not self-service', () => {
  it('an assigned student and the uploading teacher can read the book', async () => {
    await assertSucceeds(getDoc(doc(db(S1), 'books', BOOK)))
    await assertSucceeds(getDoc(doc(db(T), 'books', BOOK)))
  })

  it('an unassigned account cannot read the book', async () => {
    await assertFails(getDoc(doc(db(O), 'books', BOOK)))
    await assertFails(getDoc(doc(db(S2), 'books', BOOK)))
  })

  it('an account cannot assign itself a book', async () => {
    // Same shape as the classroom hole, and the same consequence: this is the
    // key to the PDF. Reaching it no longer requires even being enrolled.
    await assertFails(updateDoc(doc(db(O), 'books', BOOK), { assignedStudentIds: [S1, O] }))
    await assertFails(updateDoc(doc(db(S2), 'books', BOOK), { assignedStudentIds: [S1, S2] }))
  })

  it('a book cannot be filed under someone else\'s name', async () => {
    await assertFails(setDoc(doc(db(S1), 'books', 'forged'), {
      title: 'Forged', author: '', storageUrl: 'books/teacher1/x.pdf',
      uploadedBy: T, assignedStudentIds: [], createdAt: new Date(),
    }))
  })

  it('both real upload paths still work', async () => {
    await assertSucceeds(setDoc(doc(db(T), 'books', 'teacherBook'), {
      title: 'Mine', author: '', storageUrl: 'books/teacher1/b.pdf',
      uploadedBy: T, assignedStudentIds: [], createdAt: new Date(),
    }))
    await assertSucceeds(setDoc(doc(db(S1), 'books', 'studentBook'), {
      title: 'Mine too', author: '', storageUrl: 'student-books/stud1/c.pdf',
      uploadedBy: S1, uploadedByStudent: true, assignedStudentIds: [S1], createdAt: new Date(),
    }))
  })

  it('the teacher can still assign their own book to a student', async () => {
    await assertSucceeds(updateDoc(doc(db(T), 'books', BOOK), { assignedStudentIds: [S1, S2] }))
  })
})
