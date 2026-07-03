// Firestore security-rules tests for the book-free writing feature.
// Run via `npm run test:rules` (boots the Firestore emulator, then this).
import { before, after, beforeEach, describe, it } from 'node:test'
import { readFileSync } from 'node:fs'
import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
} from '@firebase/rules-unit-testing'
import { doc, setDoc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore'

const T = 'teacher1'      // owns classA
const T2 = 'teacher2'     // owns nothing here
const S1 = 'stud1'        // in classA
const S2 = 'stud2'        // in classA
const O = 'outsider'      // signed in, not in classA

const CLASS = 'classA'
const TASK = 'taskAssigned'   // assigned to classA by T
const PERSONAL = 'taskPersonal' // personal task created by S1 (classroomId null)

let testEnv

function db(uid) {
  return testEnv.authenticatedContext(uid).firestore()
}

function baseResponse(overrides = {}) {
  return {
    studentId: S1,
    taskId: TASK,
    classroomId: CLASS,
    templateId: 'paragraph-builder',
    scaffoldLevel: 'guided',
    fields: { 'topic-sentence': 'Hi' },
    completed: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

function baseFeedback(overrides = {}) {
  return {
    studentId: S1,
    taskId: TASK,
    classroomId: CLASS,
    teacherId: T,
    comment: 'Nice work',
    reviewed: true,
    updatedAt: new Date(),
    ...overrides,
  }
}

before(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'demo-ascend',
    firestore: {
      rules: readFileSync('firestore.rules', 'utf8'),
      host: '127.0.0.1',
      port: 8080,
    },
  })
})

after(async () => {
  await testEnv.cleanup()
})

beforeEach(async () => {
  await testEnv.clearFirestore()
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const admin = ctx.firestore()
    await setDoc(doc(admin, 'classrooms', CLASS), {
      teacherId: T, studentIds: [S1, S2], joinCode: 'ABCDEF', name: 'Room A', createdAt: new Date(),
    })
    await setDoc(doc(admin, 'writingTasks', TASK), {
      title: 'Paragraph', prompt: 'Write one', templateId: 'paragraph-builder',
      scaffoldDefault: 'guided', studentCanSwitch: true, createdBy: T, creatorRole: 'teacher',
      classroomId: CLASS, sampleFields: null, sampleVisible: false, createdAt: new Date(),
    })
    await setDoc(doc(admin, 'writingTasks', PERSONAL), {
      title: 'My story', prompt: '', templateId: 'story-map',
      scaffoldDefault: 'guided', studentCanSwitch: true, createdBy: S1, creatorRole: 'student',
      classroomId: null, sampleFields: null, sampleVisible: false, createdAt: new Date(),
    })
  })
})

describe('writingTasks', () => {
  it('assigned task: class students and the teacher can read it', async () => {
    await assertSucceeds(getDoc(doc(db(S1), 'writingTasks', TASK)))
    await assertSucceeds(getDoc(doc(db(S2), 'writingTasks', TASK)))
    await assertSucceeds(getDoc(doc(db(T), 'writingTasks', TASK)))
  })

  it('assigned task: an outsider cannot read it', async () => {
    await assertFails(getDoc(doc(db(O), 'writingTasks', TASK)))
  })

  it('personal task: only its owner can read it', async () => {
    await assertSucceeds(getDoc(doc(db(S1), 'writingTasks', PERSONAL)))
    await assertFails(getDoc(doc(db(S2), 'writingTasks', PERSONAL)))
    await assertFails(getDoc(doc(db(T), 'writingTasks', PERSONAL)))
  })

  it('create: a learner can create a personal task owned by themselves', async () => {
    await assertSucceeds(setDoc(doc(db(S2), 'writingTasks', 'p2'), {
      title: 'x', prompt: '', templateId: 'main-idea', scaffoldDefault: 'guided',
      studentCanSwitch: true, createdBy: S2, creatorRole: 'student', classroomId: null,
      sampleFields: null, sampleVisible: false, createdAt: new Date(),
    }))
  })

  it('create: cannot forge createdBy to another user', async () => {
    await assertFails(setDoc(doc(db(S2), 'writingTasks', 'p3'), {
      title: 'x', prompt: '', templateId: 'main-idea', scaffoldDefault: 'guided',
      studentCanSwitch: true, createdBy: S1, creatorRole: 'student', classroomId: null,
      sampleFields: null, sampleVisible: false, createdAt: new Date(),
    }))
  })

  it('update: only the creator can edit (teacher saves a sample)', async () => {
    await assertSucceeds(updateDoc(doc(db(T), 'writingTasks', TASK), {
      sampleFields: { 'topic-sentence': 'Sample' }, sampleVisible: true,
    }))
    await assertFails(updateDoc(doc(db(S2), 'writingTasks', TASK), { sampleVisible: true }))
  })

  it('delete: only the creator can delete', async () => {
    await assertFails(deleteDoc(doc(db(S2), 'writingTasks', TASK)))
    await assertSucceeds(deleteDoc(doc(db(T), 'writingTasks', TASK)))
  })
})

describe('writingResponses', () => {
  it('a student can create their own response scoped to the task classroom', async () => {
    await assertSucceeds(setDoc(doc(db(S1), 'writingResponses', `${S1}_${TASK}`), baseResponse()))
  })

  it('EDGE: student cannot null out classroomId to hide assigned work', async () => {
    await assertFails(setDoc(doc(db(S1), 'writingResponses', `${S1}_${TASK}`), baseResponse({ classroomId: null })))
  })

  it('EDGE: student cannot misattribute the response to another classroom', async () => {
    await assertFails(setDoc(doc(db(S1), 'writingResponses', `${S1}_${TASK}`), baseResponse({ classroomId: 'someOtherClass' })))
  })

  it('cannot spoof studentId to another user', async () => {
    await assertFails(setDoc(doc(db(S1), 'writingResponses', `${S2}_${TASK}`), baseResponse({ studentId: S2 })))
  })

  it('cannot respond to a task the learner cannot access', async () => {
    // S2 responding to S1's personal task
    await assertFails(setDoc(doc(db(S2), 'writingResponses', `${S2}_${PERSONAL}`), baseResponse({
      studentId: S2, taskId: PERSONAL, classroomId: null, templateId: 'story-map',
    })))
  })

  it('owner and class teacher can read a response; peers cannot', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'writingResponses', `${S1}_${TASK}`), baseResponse())
    })
    await assertSucceeds(getDoc(doc(db(S1), 'writingResponses', `${S1}_${TASK}`)))
    await assertSucceeds(getDoc(doc(db(T), 'writingResponses', `${S1}_${TASK}`)))
    await assertFails(getDoc(doc(db(S2), 'writingResponses', `${S1}_${TASK}`)))
    await assertFails(getDoc(doc(db(O), 'writingResponses', `${S1}_${TASK}`)))
  })

  it('personal-task response stays private: teacher cannot read it', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'writingResponses', `${S1}_${PERSONAL}`), baseResponse({
        taskId: PERSONAL, classroomId: null, templateId: 'story-map',
      }))
    })
    await assertSucceeds(getDoc(doc(db(S1), 'writingResponses', `${S1}_${PERSONAL}`)))
    await assertFails(getDoc(doc(db(T), 'writingResponses', `${S1}_${PERSONAL}`)))
  })
})

describe('writingFeedback', () => {
  it('the class teacher can create feedback for a student', async () => {
    await assertSucceeds(setDoc(doc(db(T), 'writingFeedback', `${S1}_${TASK}`), baseFeedback()))
  })

  it('a student cannot write feedback', async () => {
    await assertFails(setDoc(doc(db(S1), 'writingFeedback', `${S1}_${TASK}`), baseFeedback({ teacherId: S1 })))
  })

  it('a teacher of another classroom cannot write feedback here', async () => {
    await assertFails(setDoc(doc(db(T2), 'writingFeedback', `${S1}_${TASK}`), baseFeedback({ teacherId: T2 })))
  })

  it('the student and teacher can read feedback; peers cannot', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'writingFeedback', `${S1}_${TASK}`), baseFeedback())
    })
    await assertSucceeds(getDoc(doc(db(S1), 'writingFeedback', `${S1}_${TASK}`)))
    await assertSucceeds(getDoc(doc(db(T), 'writingFeedback', `${S1}_${TASK}`)))
    await assertFails(getDoc(doc(db(S2), 'writingFeedback', `${S1}_${TASK}`)))
  })
})
