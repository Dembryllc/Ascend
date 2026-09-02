---
date: 2026-09-02
project: Easy Annotate
tags: [easy-annotate, firestore-rules, storage-rules, ferpa, classroom, books, e2e]
---

# Removing students and books

## The gap

Reported plainly: "There's no way to remove students and books." Both were true.

`classrooms.ts` had create / get / join and no removal at all. `books.ts` had
`deleteStudentBook` — but that is the student deleting their *own* upload, wired
to the trash icon on StudentHome. Nothing anywhere let a teacher take a book out
of their library or a student off their roster. A teacher could only ever add.

## Two different verbs

These read like one feature and are not:

- **Removing a student is un-enrolment.** Their account, annotations, organizers
  and writing are theirs and stay. The teacher just stops being able to read them,
  which every teacher-side rule already scopes by classroom membership or book
  assignment. Deleting a child's work off a roster action would be wrong.
- **Deleting a book is destructive.** Annotations, organizers and reading progress
  on that book have no meaning without it, and leaving them behind is both a
  data-retention problem and a visible bug — MyAnnotationsPage renders an
  orphaned annotation as "Unknown Book". So it cascades, and the confirmation
  reads the count first and names it: "This also deletes 5 student notes on this
  book." The confirm button stays disabled until that count is known, so nobody
  can confirm against "Checking…".

## Three things that had to be got right

**Un-enrolment is three writes, not one.** Dropping the student from
`classrooms.studentIds` is the obvious one. The other two are not, and skipping
either leaves a mess:
- Their own `users/{uid}.classroomId` still names the class. `validAnnotationClassroomLink`
  requires the writer to be a member of the classroom an annotation is pinned to,
  so a stale classroomId means every annotation they write from then on is
  rejected. They would silently lose the ability to annotate anything, with no
  error that points at the cause.
- `joinClassroomByCode` assigns the teacher's entire library on join. Without the
  matching removal, a removed student keeps read access to that teacher's PDFs.

**Cascade order is load-bearing.** The rules that let a teacher delete an
annotation / organizer / progress record authorise by reading the *book*
document. Delete the book first and every child record is stranded permanently.
Book doc goes last.

**The cascade cannot query by bookId alone.** A `where bookId == X` query returns
documents belonging to students no longer in `assignedStudentIds`; the read rule
rejects those, and one rejected document fails the entire query — the same shape
as the bug in `43fd743`. So it walks `assignedStudentIds` and issues one
`bookId + studentId` query per student. A since-removed student's notes are left
alone, which is also the behaviour we want.

## Rules

- `users`: a new update branch letting a class teacher clear `classroomId` — that
  key only, only to null, only for a class they own.
- `isBookTeacherForAnnotation` → `isAssignedBookTeacher`, and it now also
  authorises **delete** on `annotations`, `organizers` and `readingProgress`.
  This is the same predicate that already granted the teacher READ on those
  documents, so it adds no visibility — only the ability to clear up after a
  book they deleted. FERPA scoping is unchanged in both directions.

## Two bugs found on the way

**Storage rules denied every delete.** `request.resource` is null on a delete, so
`allow write: if ... request.resource.contentType == 'application/pdf'` can never
pass one. Student book deletions have therefore been leaving their PDFs in the
bucket the whole time, hidden behind a `catch` commented "may already be gone".
`storage.rules` now splits `create, update` from `delete`. Teacher uploads also
moved to `books/{teacherId}/...` so deletion can be scoped by owner — a flat path
gives a Storage rule nothing to check. Files uploaded before this stay
undeletable; their Firestore doc still goes.

**CI never deployed storage.rules.** The workflow shipped
`hosting,firestore:rules,firestore:indexes`. Storage rules were only ever
deployed by hand, so the fix above would not have reached production. Now
`...,storage`.

And one that only showed up under test: `deleteObject` has no deadline of its
own, so with an unreachable bucket the teacher's dialog sat on "Deleting…"
forever. The E2E run caught it because there is no Storage emulator. It is
time-boxed now — the Firestore deletes are the source of truth and are already
done by that point.

## Tests

- `tests/rules/removal.test.mjs` — 17 cases. The un-enrol branch cannot be used
  to rename a student, change their role, point them at another class, or delete
  their account; a teacher who does not own the book cannot touch its records;
  the delete grant does not become a write grant.
- `tests/e2e/removal.e2e.mjs` — runs LAST, since it deletes seeded data earlier
  flows read. Asserts the impact count, that both removals survive a reload
  (state, not just optimistic UI), and that the student side has no "Unknown Book"
  ghosts afterwards.
- `npm run test:rules` now runs with `--test-concurrency=1`. Adding a second
  rules file made the existing writing tests fail: `node --test` runs files in
  parallel, they share one emulator, and each `clearFirestore()` in `beforeEach`
  was wiping the other's seed data. Looked exactly like broken rules; was not.

## Verification

`npm run build`, `npm run lint` clean. Rules: 35/35. E2E: all six flows green.

## Next

- The "Your Books" card replaced "Assign to Whole Class" and now renders whenever
  the teacher has books, so a teacher with no students can still manage a library.
- Legacy flat-path book PDFs are unreachable by any Storage rule. A one-off
  cleanup would need the Admin SDK; nothing in the app can do it.
