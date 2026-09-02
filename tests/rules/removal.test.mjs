// Firestore security-rules tests for removing students and books.
//
// Both removals needed new rule surface, and both are FERPA-relevant, so the
// question these tests answer is not "does it work" but "does it only work for
// the right person, on the right document, in the right direction":
//   - a teacher may clear a student's classroomId, that key alone, only to null,
//     and only for a class they own;
//   - a teacher may delete the annotation / organizer / progress records that
//     hang off a book they uploaded, and nobody else's.
import { before, after, beforeEach, describe, it } from 'node:test'
import { readFileSync } from 'node:fs'
import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
} from '@firebase/rules-unit-testing'
import { doc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore'

const T = 'teacher1'    // owns classA and bookT
const T2 = 'teacher2'   // owns classB — no claim on classA or bookT
const S1 = 'stud1'      // in classA, assigned bookT
const S2 = 'stud2'      // in classA, NOT assigned bookT
const O = 'outsider'

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
      teacherId: T, studentIds: [S1, S2], joinCode: 'ABCDEF', name: 'Room A', createdAt: new Date(),
    })
    await setDoc(doc(admin, 'classrooms', OTHER_CLASS), {
      teacherId: T2, studentIds: [], joinCode: 'GHIJKL', name: 'Room B', createdAt: new Date(),
    })
    await setDoc(doc(admin, 'users', S1), { uid: S1, displayName: 'Sam', role: 'student', classroomId: CLASS })
    await setDoc(doc(admin, 'users', S2), { uid: S2, displayName: 'Sky', role: 'student', classroomId: CLASS })
    await setDoc(doc(admin, 'books', BOOK), {
      title: 'A Book', author: '', storageUrl: 'books/teacher1/a.pdf',
      uploadedBy: T, assignedStudentIds: [S1], createdAt: new Date(),
    })
    await setDoc(doc(admin, 'annotations', 'ann1'), {
      studentId: S1, bookId: BOOK, classroomId: CLASS, pageNumber: 1, reactionType: 'love',
      noteText: 'hi', selectedText: '', annotationKind: 'annotation', timestamp: new Date(),
    })
    // Same book, but a student the book is NOT assigned to.
    await setDoc(doc(admin, 'annotations', 'ann2'), {
      studentId: S2, bookId: BOOK, classroomId: CLASS, pageNumber: 1, reactionType: 'love',
      noteText: 'hi', selectedText: '', annotationKind: 'annotation', timestamp: new Date(),
    })
    await setDoc(doc(admin, 'organizers', `${S1}_${BOOK}`), {
      studentId: S1, bookId: BOOK, classroomId: CLASS, templateId: 'main-idea', fields: {},
    })
    await setDoc(doc(admin, 'readingProgress', `${S1}_${BOOK}`), {
      studentId: S1, bookId: BOOK, classroomId: CLASS, lastReadPage: 1, highestPageRead: 1,
      totalPages: 3, completionPercent: 33, totalSecondsRead: 10, completed: false,
      lastReadAt: new Date(), createdAt: new Date(),
    })
  })
})

describe('removing a student from a classroom', () => {
  it('the class teacher can drop the student from studentIds', async () => {
    await assertSucceeds(updateDoc(doc(db(T), 'classrooms', CLASS), { studentIds: [S2] }))
  })

  it('another teacher cannot', async () => {
    await assertFails(updateDoc(doc(db(T2), 'classrooms', CLASS), { studentIds: [S2] }))
  })

  it('a student cannot drop a classmate', async () => {
    await assertFails(updateDoc(doc(db(S1), 'classrooms', CLASS), { studentIds: [S1] }))
  })

  it('the class teacher can clear that student\'s classroomId', async () => {
    await assertSucceeds(updateDoc(doc(db(T), 'users', S1), { classroomId: null }))
  })

  it('a teacher of a different class cannot', async () => {
    await assertFails(updateDoc(doc(db(T2), 'users', S1), { classroomId: null }))
  })

  it('a teacher cannot set classroomId to another class — only clear it', async () => {
    await assertFails(updateDoc(doc(db(T), 'users', S1), { classroomId: OTHER_CLASS }))
  })

  it('a teacher cannot use the un-enrol branch to edit anything else', async () => {
    await assertFails(updateDoc(doc(db(T), 'users', S1), { classroomId: null, displayName: 'Renamed' }))
    await assertFails(updateDoc(doc(db(T), 'users', S1), { role: 'teacher' }))
  })

  it('a student cannot clear a classmate\'s classroomId', async () => {
    await assertFails(updateDoc(doc(db(S2), 'users', S1), { classroomId: null }))
    await assertFails(updateDoc(doc(db(O), 'users', S1), { classroomId: null }))
  })

  it('removal does not give the teacher a way to delete the student\'s account doc', async () => {
    await assertFails(deleteDoc(doc(db(T), 'users', S1)))
  })
})

describe('deleting a book cascades only through its own teacher', () => {
  it('the uploading teacher can delete the book', async () => {
    await assertSucceeds(deleteDoc(doc(db(T), 'books', BOOK)))
  })

  it('another teacher cannot delete the book', async () => {
    await assertFails(deleteDoc(doc(db(T2), 'books', BOOK)))
    await assertFails(deleteDoc(doc(db(S1), 'books', BOOK)))
  })

  it('the uploading teacher can delete annotations, organizers and progress on it', async () => {
    await assertSucceeds(deleteDoc(doc(db(T), 'annotations', 'ann1')))
    await assertSucceeds(deleteDoc(doc(db(T), 'organizers', `${S1}_${BOOK}`)))
    await assertSucceeds(deleteDoc(doc(db(T), 'readingProgress', `${S1}_${BOOK}`)))
  })

  it('the student still owns their own records', async () => {
    await assertSucceeds(deleteDoc(doc(db(S1), 'annotations', 'ann1')))
    await assertSucceeds(deleteDoc(doc(db(S1), 'organizers', `${S1}_${BOOK}`)))
    await assertSucceeds(deleteDoc(doc(db(S1), 'readingProgress', `${S1}_${BOOK}`)))
  })

  it('a teacher who does not own the book cannot delete its records', async () => {
    await assertFails(deleteDoc(doc(db(T2), 'annotations', 'ann1')))
    await assertFails(deleteDoc(doc(db(T2), 'organizers', `${S1}_${BOOK}`)))
    await assertFails(deleteDoc(doc(db(T2), 'readingProgress', `${S1}_${BOOK}`)))
  })

  it('a classmate cannot delete another student\'s records', async () => {
    await assertFails(deleteDoc(doc(db(S2), 'annotations', 'ann1')))
    await assertFails(deleteDoc(doc(db(O), 'annotations', 'ann1')))
  })

  it('the teacher cannot reach a record for a student the book is not assigned to', async () => {
    // ann2 belongs to S2, who is not in assignedStudentIds. This is why the
    // cascade walks assignedStudentIds instead of querying by bookId alone.
    await assertFails(deleteDoc(doc(db(T), 'annotations', 'ann2')))
  })

  it('the delete grant does not become a write grant', async () => {
    await assertFails(updateDoc(doc(db(T), 'annotations', 'ann1'), { noteText: 'teacher edit' }))
  })
})
