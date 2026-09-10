---
date: 2026-09-10
project: Easy Annotate
tags: [easy-annotate, reader, fullscreen, teacher, annotations, ferpa, e2e, rules]
---

# Full-screen reading, and a reader for teachers

## The ask

Two things, one request: "I want the reading material viewable in full screen. I want
the teacher to be able to annotate books too."

Both land in `ReadingPage`, which until now was a student-only screen reached only from
`/student/read/:bookId`.

## Full screen

`ReadingPage` gained an immersive mode: a **Full screen** button in the reader header
(next to Read aloud), plus zoom steps and a Fit page / Fit width toggle that only exist
inside it.

Two mechanisms, deliberately both:

1. The **Fullscreen API**, so the browser's own chrome gets out of the way.
2. A **CSS `fixed inset-0` fallback**, applied *first*, for browsers that refuse the
   request. iPhone Safari has no element fullscreen at all, and a rejected request must
   never leave the reader half-switched. Everything asserted in the tests is asserted
   against the CSS state for the same reason.

The request goes to the reader's **root element**, not the PDF. A fullscreened element
is promoted to the browser's top layer and everything outside it stops painting — so
fullscreening just the PDF would leave the floating emoji bar, the annotation panel and
the writing-task modal in the DOM, correctly laid out, and completely invisible. That
is the one failure mode `tests/e2e/reader.e2e.mjs` exists to catch: it selects a passage
while full screen and asserts the emoji bar is *visible*, not merely present.

Immersive mode hides the assignment card, the writing-task card, the progress card and
the annotation sidebar; the page nav and the emoji toolbar shrink into thin bars under a
dark ground. Nothing is removed from the tree — every hidden block is a `{!immersive &&
…}` in its existing slot, so toggling never remounts `<Document>` and never re-downloads
the PDF. Escape leaves (the browser handles it under the real API; the page handles it
under the fallback), and `fullscreenchange` resyncs the layout when the user exits by
any route the app did not drive.

### The sizing bug this uncovered

Fit-to-page needs the height of the box the page sits in, so the stage is now measured
with a `ResizeObserver`. The first attempt wired it in a `useEffect` with `[]` deps and
measured nothing: **the reader's first render is the "Opening book…" screen**, so the
effect runs before the stage exists. The observer is now a callback ref, which runs when
the node actually attaches.

The old width measure had exactly the same shape (`document.getElementById(
'pdf-main-column')` in a `[]` effect) and exactly the same bug — it found nothing, and
`containerWidth` stayed pinned to its 700px default for every reader on every screen
unless the window happened to be resized. Both are gone; one measured box drives both
fit modes now, with the comfortable-measure cap (column width − 32, max 900) preserved
outside full screen.

## The teacher reader

New route `/teacher/read/:bookId` renders the **same** `ReadingPage`, reached from a
**Read & annotate** button on each book card on the dashboard, and a **Read** link on
each row of the Your Books card in Classroom.

What differs for a teacher, all driven from `isTeacher`:

- **No reading progress.** `persistProgress` returns early and the progress card, the
  minutes counter and Mark Complete are not rendered. Reading progress measures a
  learner; writing the record anyway would put the teacher into the progress data they
  are meant to be reading.
- **`classroomId` is always null** on their annotations, and the sidebar says plainly
  that the notes are theirs alone.
- Back goes to `/teacher`, and the writing-task card is reworded as a preview of what
  students see.

### No new rules — which is exactly why there is a rules test

Teacher annotation works under `firestore.rules` as it already stood:
`canReadBook` accepts the book's `uploadedBy`, and `isOwner(resource.data.studentId)`
grants an author their own annotation. Nothing in the rules file names teacher
annotations, so nothing would look wrong in a diff that took the capability away — or
handed it to the wrong person. `tests/rules/teacherAnnotations.test.mjs` pins both
directions: the teacher can create, read, edit and delete notes on a book they uploaded;
students and other teachers cannot read or touch them; and a teacher cannot forge a note
attributed to a student or pinned to a classroom (`validAnnotationClassroomLink` only
accepts a classroom whose `studentIds` contain the author, and a teacher never is one).

### One cascade fix that came with it

`deleteTeacherBook` walked `assignedStudentIds` only. A teacher who annotated their own
book and then deleted it would have stranded their own notes **permanently**: once the
book document is gone, `isAssignedBookTeacher` can no longer authorise the delete, and no
screen lists them. The cascade now walks the uploader alongside the assigned students
(`isOwner` covers those deletes), and the confirmation dialog says their own notes go
too. `countBookStudentRecords` is unchanged — the number quoted to the teacher is still
"student notes", which is what it says.

## Tests

- `tests/rules/teacherAnnotations.test.mjs` — 10 assertions, two suites. `npm run
  test:rules` now runs 44 checks across 7 suites, all green.
- `tests/e2e/reader.e2e.mjs` — added to `run.sh` between the annotations and navigation
  flows. Teacher opens a book from their library → no Mark Complete → saves a note →
  **reloads** (the assertion that matters: a rules rejection would have left the note in
  React state and nowhere else) → full screen → fit-page is asserted against the actual
  canvas box → selects text and asserts the floating bar is painted → Escape → the same
  full-screen check as a student → the teacher's note is absent from the student's own
  notes page.

## Noticed, not changed

`CLAUDE.md` said the PDF.js worker "must not use `?url` imports" and is "hardcoded as
`'/pdf.worker.mjs'` in ReadingPage.tsx". It is not: `ReadingPage` has imported
`pdfjs-dist/build/pdf.worker.mjs?url` since `ab496e5`, while `pdfWorkerPlugin` in
`vite.config.ts` still copies the unhashed file to `dist/`. The plugin's own comment
says the `?url` form is what broke iOS Safari with a MIME-type error. Left alone — it is
not this change's to make — but the CLAUDE.md line has been corrected to describe what
the code actually does, and this is worth a deliberate look.
