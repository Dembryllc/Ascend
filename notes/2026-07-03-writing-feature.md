---
date: 2026-07-03
project: Easy Annotate
tags: [easy-annotate, writing, firestore, feature, shipped]
status: shipped
---

# Standalone Writing Tasks — shipped to production

Book-free writing for Easy Annotate. Writing is no longer tied to a book:
students and individuals write from their home, teachers assign tasks to a
class and author sample answers, and there's a full teacher review +
feedback loop back to the learner.

## What shipped
- **Learner home (`StudentHome.tsx`):** a reworked **Writing** section for both
  `student` and `individual` roles. "New writing" starter → pick an organizer →
  standalone `WritingTaskModal` (autosave, guided/independent scaffold, sentence
  starters, PDF + Google-Doc export, Pro-gate for individuals). Cards show status
  (Not started / In progress / Complete), Assigned / Sample / Feedback chips.
- **Teacher authoring (`/teacher/writing`, `WritingTasksPage`):** create a task,
  assign to the whole class, author a sample/exemplar and show/hide it to students.
- **Teacher review (`/teacher/writing/:taskId`, `WritingResponsesPage`):** per-student
  roster, completion roll-up (started / completed / reviewed), read each response,
  leave a comment + "mark reviewed". Feedback surfaces back on the learner's card
  and inside the writing modal.

## Data model
- New collections: `writingTasks` (prompt/assignment + teacher sample),
  `writingResponses` (learner answer, doc id `${studentId}_${taskId}`),
  `writingFeedback` (teacher comment + reviewed flag, doc id `${studentId}_${taskId}`).
- Kept feedback separate from the student-owned response so each side writes only
  its own doc.
- **No new composite indexes** — everything is single-field equality or fetched by
  deterministic doc id.

## Security (FERPA)
- Rules mirror `organizers`: a response is readable by its owner and, only when
  `classroomId` is a string, by that classroom's teacher; feedback is written only by
  the class teacher and read by that teacher + the student. Personal (null-classroom)
  writing stays private.
- Hardening: `writingResponses` create pins `classroomId` to the task's own scope, so
  a student can't hide assigned work (null) or misattribute it.
- Resilience: writing queries on the student home degrade to empty on failure so they
  never take down the core reading dashboard.

## Verification
- `tsc -b && vite build` ✅, `eslint` ✅
- **Rules tests:** `npm run test:rules` — 18/18 against the Firestore emulator.
- **Browser E2E:** `npm run test:e2e` — Chromium drives write → review → feedback
  against Auth+Firestore emulators (rules enforced). Zero uncaught JS errors.

## Deploy
- Shipped to `main` (`1308dd0`). "Deploy to Firebase" run #65 green in ~1 min.
- `firebase-deploy.yml` deploys `hosting,firestore:rules,firestore:indexes` on push to
  `main`, so the writing rules published automatically:
  `✔ firestore: released rules firestore.rules to cloud.firestore`.
- Live at easy-annotate.com (Firebase project `ascend-annotate`).

## Follow-ups (not started)
- More organizer templates (OREO/persuasive, cause & effect, sequence, 5-paragraph).
- Due dates on tasks.
- Optional: wire `test:rules` / `test:e2e` into CI as a merge gate.

## Vault sync (run locally on the Mac)
Cloud sessions can't reach the iCloud Obsidian vault. To sync:
`git pull origin main` → copy this note into the vault, or run `/record-to-vault`.
