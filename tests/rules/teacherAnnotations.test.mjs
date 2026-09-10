// Firestore security-rules tests for a teacher annotating their own book.
//
// The teacher reader (/teacher/read/:bookId) adds no rule surface at all — it
// works because `canReadBook` already accepts the uploader and `isOwner` already
// grants an author their own annotation. That is exactly why it needs a test:
// nothing in firestore.rules names teacher annotations, so a later edit could
// take the capability away, or hand it to the wrong person, without anything
// looking obviously wrong in the diff.
//
// The FERPA-relevant half is the second describe block. A teacher's notes are
// lesson prep, not a classroom record: they carry classroomId null, no student
// can read them, and a teacher cannot forge one that is attributed to a student
// or pinned to a classroom they only teach.
import { before, after, beforeEach, describe, it } from 'node:test'
import { readFileSync } from 'node:fs'
import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
} from '@firebase/rules-unit-testing'
import { doc, getDoc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore'

const T = 'teacher1'    // owns classA and bookT
const T2 = 'teacher2'   // owns nothing here
const S1 = 'stud1'      // in classA, assigned bookT

const CLASS = 'classA'
const BOOK = 'bookT'

// The shape ReadingPage writes for a teacher: authored by them, no classroom.
const teacherNote = (over = {}) => ({
  studentId: T,
  bookId: BOOK,
  classroomId: null,
  pageNumber: 2,
  reactionType: 'important',
  noteText: 'Open the lesson here.',
  selectedText: 'the whale surfaced',
  annotationKind: 'annotation',
  timestamp: new Date(),
  ...over,
})

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
    await setDoc(doc(admin, 'users', S1), { uid: S1, displayName: 'Sam', role: 'student', classroomId: CLASS })
    await setDoc(doc(admin, 'books', BOOK), {
      title: 'A Book', author: '', storageUrl: 'books/teacher1/a.pdf',
      uploadedBy: T, assignedStudentIds: [S1], createdAt: new Date(),
    })
  })
})

describe('a teacher annotating a book they uploaded', () => {
  it('can create a note on their own book', async () => {
    await assertSucceeds(setDoc(doc(db(T), 'annotations', 'tnote1'), teacherNote()))
  })

  it('can create a reflection too', async () => {
    await assertSucceeds(setDoc(doc(db(T), 'annotations', 'tnote2'), teacherNote({
      annotationKind: 'reflection', selectedText: '', noteText: 'Worth a second read.',
    })))
  })

  it('can read, edit and delete their own note', async () => {
    await setDoc(doc(db(T), 'annotations', 'tnote1'), teacherNote())
    await assertSucceeds(getDoc(doc(db(T), 'annotations', 'tnote1')))
    await assertSucceeds(updateDoc(doc(db(T), 'annotations', 'tnote1'), teacherNote({ noteText: 'Reworded.' })))
    await assertSucceeds(deleteDoc(doc(db(T), 'annotations', 'tnote1')))
  })

  it('cannot annotate a book they did not upload', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'books', 'someoneElsesBook'), {
        title: 'Theirs', author: '', storageUrl: 'books/teacher2/b.pdf',
        uploadedBy: T2, assignedStudentIds: [], createdAt: new Date(),
      })
    })
    await assertFails(setDoc(doc(db(T), 'annotations', 'tnote3'), teacherNote({ bookId: 'someoneElsesBook' })))
  })
})

describe('a teacher\'s notes stay their own', () => {
  it('a student in the class cannot read them', async () => {
    await setDoc(doc(db(T), 'annotations', 'tnote1'), teacherNote())
    await assertFails(getDoc(doc(db(S1), 'annotations', 'tnote1')))
  })

  it('another teacher cannot read them', async () => {
    await setDoc(doc(db(T), 'annotations', 'tnote1'), teacherNote())
    await assertFails(getDoc(doc(db(T2), 'annotations', 'tnote1')))
  })

  it('a student cannot edit or delete them', async () => {
    await setDoc(doc(db(T), 'annotations', 'tnote1'), teacherNote())
    await assertFails(updateDoc(doc(db(S1), 'annotations', 'tnote1'), teacherNote({ noteText: 'mine now' })))
    await assertFails(deleteDoc(doc(db(S1), 'annotations', 'tnote1')))
  })

  // The reader forces classroomId null for teachers. These two assert the rule
  // would stop it anyway: validAnnotationClassroomLink only accepts a classroom
  // whose studentIds contain the author, and a teacher is never in that list.
  it('a teacher cannot pin a note to their own classroom', async () => {
    await assertFails(setDoc(doc(db(T), 'annotations', 'tnote4'), teacherNote({ classroomId: CLASS })))
  })

  it('a teacher cannot write a note attributed to a student', async () => {
    await assertFails(setDoc(doc(db(T), 'annotations', 'tnote5'), teacherNote({ studentId: S1 })))
  })
})
