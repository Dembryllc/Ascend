---
date: 2026-09-15
project: Easy Annotate
tags: [easy-annotate, teacher, students, deletion, ferpa, cloud-functions, e2e, rules]
---

# Deleting a student, not just un-enrolling them

## The report

> "I removed a student from my roster but wasn't able to delete them from the
> program without going in to firebase and manually removing them."

Both halves of that are real, and they have different causes.

## Why there was no delete button

`removeStudentFromClassroom` is **un-enrolment by design** (2026-09-02): drop them
from `classrooms.studentIds`, clear their own `classroomId`, drop them from the
teacher's books. The account and everything they wrote survive. That is still the
right default — a student who leaves a class has not asked to be erased — but it
was the *only* thing on offer.

The reason nobody had simply added a delete button is that **it cannot be done
from the browser**. The Firebase client SDK can only delete *the currently
signed-in user*; there is no client API by which a teacher deletes a student's
login. The Firebase Console really was the only route. Deleting an Auth user
needs the Admin SDK, which means a Cloud Function.

## Why removing first made it worse

Removal severs *every* link between teacher and student — roster, `classroomId`,
book assignments. Afterwards there is nothing left to authorise a delete against,
and nothing to list the student by. A teacher who did the natural thing (remove,
then try to delete) ended up with an account no screen could see.

So removal now records **who removed them**: `removedByTeacherId`,
`removedFromClassroomId`, `removedAt` on the student's own user doc.
`joinClassroomByCode` clears all three, so a learner who joins any class drops off
the previous teacher's list and stops being deletable by them.

## What shipped

- **`functions/src/deleteStudent.ts`** — `deleteStudentAccount`, an `onCall`
  function. Cascades `annotations`, `organizers`, `readingProgress`,
  `writingResponses`, `writingFeedback`, personal `writingTasks`, self-uploaded
  `books` (+ their `student-books/{uid}/` blobs), then strips the uid out of every
  `classrooms.studentIds` and `books.assignedStudentIds` it appears in, then
  deletes the Auth user, then the profile document.
  - `dryRun: true` returns the same counts without deleting. The confirmation
    dialog calls it first so it can name the damage, and the confirm button stays
    disabled until it comes back — the same contract `countBookStudentRecords`
    already set for book deletion.
  - **Order is deliberate.** While `users/{studentId}` exists the call can be
    retried and still authorises, so a failure anywhere earlier is recoverable.
    The profile goes last. Storage goes last of all, time-boxed against
    `STORAGE_CLEANUP_TIMEOUT_MS` — a slow bucket must not be able to fail, or
    stall, a deletion that has already happened.
  - **Authorisation is in one place** (`canDelete`): either the student is on the
    roster of a classroom this teacher owns, or this teacher is the one who
    removed them. Role is checked too — `teacher` and `individual` accounts are
    never somebody else's to delete.
  - Because the Admin SDK bypasses rules, **no client-side Firestore rule was
    widened** to let a teacher delete another user's documents.
- **`firestore.rules`** — the existing teacher-clears-`classroomId` branch now also
  accepts the three provenance keys, and pins them: a teacher can only ever name
  *themselves* as the remover and the class the student is *actually* leaving.
  The provenance is optional so a browser tab still running the old bundle keeps
  working.
- **`ClassroomPage`** — a Delete button on each roster row, and a new **"Removed
  from this class"** section listing un-enrolled students so an already-orphaned
  account is still reachable. Confirmation requires typing the student's name.

## Tests

- `tests/rules/removal.test.mjs` — six new checks on the provenance write
  (forging another teacher as remover, claiming the wrong classroom, smuggling a
  second field in, a non-owning teacher, the student clearing it on rejoin).
  `npm run test:rules` is now **50 checks across 7 suites**.
- `tests/e2e/deletestudent.e2e.mjs` — new, runs **last**; it destroys the seeded
  student account every other flow signs in as. It deliberately deletes a student
  who was **already un-enrolled** by `removal.e2e.mjs`, because deleting straight
  from the roster would not exercise the case the teacher actually hit. The final
  assertion is the one the whole feature exists for: after the delete, the
  student's own credentials **no longer sign in**.
- `firebase.emulator.json` now boots **functions** as well, and `config.ts` calls
  `connectFunctionsEmulator` under `VITE_USE_EMULATORS` — without it the e2e
  suite would have called production and the delete path could never be tested.
  `run.sh` builds `functions/` before starting the emulators, because the
  functions emulator loads `functions/lib` at startup.

## Deploying this — NOT automatic

**CI does not deploy Cloud Functions.** `firebase-deploy.yml` covers hosting,
Firestore rules, indexes and Storage rules only. Merging this to `main` ships the
UI and the rules but **not** the function, and the Delete button will fail with
`functions/not-found` until someone runs:

```
cd functions && npm install && npm run build
firebase deploy --only functions:deleteStudentAccount --project ascend-annotate
```

Deploy the function first, then merge — in that order, or there is a window where
the button is live and broken.
