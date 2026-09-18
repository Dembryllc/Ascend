---
date: 2026-09-18
project: Easy Annotate
tags: [easy-annotate, ferpa, security, firestore-rules, storage-rules, cloud-functions, privacy-policy, ed-law-2d]
---

# Easy Annotate — FERPA / access-control audit

**Branch:** `claude/ferpa-access-control-audit-d79y95`
**Context:** audit against FERPA and the Oceanside Ed Law 2-d forms (Parents' Bill of Rights
agreement + third-party contractor supplement).

> **Not deployed.** Everything below is on the branch. The holes were live in production
> when this was written and stay live until this merges. Deploy order matters — see below.

## What was wrong

Three collections and the Storage bucket were readable by any account that could sign up.
Signing up takes an email address.

1. **`/users` — `allow read: if isSignedIn()`.** Every student's display name, role and
   classroom, and every teacher's email address and `stripeCustomerId`, readable by anyone
   with an account. Unauthorized disclosure of education records, and flatly contrary to
   what the published privacy policy said.
2. **`/classrooms` — `allow read: if isSignedIn()`.** Every roster and every join code.
   The update rule then let any signed-in account add *itself* to any roster, and the
   `books` rule let it assign itself any book. Both rules checked that the caller was
   adding themselves and nothing more — which every attacker also is.
3. **Storage — `books/{allPaths=**}` and `student-books/` readable by any authenticated
   user.** Including a student's own uploaded documents.
4. **The privacy policy said** "We do not use any other third-party services that process
   personal data." Stripe, ActiveCampaign and Mailgun were all in use.

## Why the rules could not just be tightened

Enrolment cannot be authorised by a Firestore rule at all. The join code is never written
into the document being changed, and a rule cannot see the values a client filtered its
query by — so the only thing a rule can check is that the caller is adding themselves.
Creating a classroom is the same problem from the other end: a unique join code has to be
checked against a collection no client should be able to read, and a client that picks its
own code can mint one that collides with a real teacher's, sending their students onto an
attacker's roster.

So enrolment moved server-side: `createClassroom` and `joinClassroom` callables in
`functions/src/classroom.ts`. `firestore.rules` now says `allow create: if false` on
classrooms and carries no self-add branch anywhere.

## What changed

- **`firestore.rules`** — `/users` reads are the owner plus the teacher of the classroom
  that user is enrolled in (which is exactly what the four teacher dashboards need, and
  revokes itself when a student is un-enrolled). `/classrooms` reads are the owning teacher
  and enrolled students. Both self-add branches gone. Book creation must file under the
  caller's own uid.
- **`storage.rules`** — a teacher's folder is readable by them and by students enrolled in
  their classroom, resolved with `firestore.get()` since nothing in an object path names a
  book. `student-books/` is owner-only, matching what Firestore already says.
- **`functions/src/classroom.ts`** (new) — the two callables. `joinClassroom` checks the
  code before it writes, throttles wrong guesses on the caller's own user document, and
  does the same three writes the client used to.
- **`ReadingPage`** — downloads the PDF as the signed-in user instead of handing pdf.js
  the stored URL. See below.
- **Privacy policy** — names Stripe, ActiveCampaign and Mailgun, says what each receives,
  and states plainly that no student record reaches any of them.

## Two things the handoff had slightly wrong

- **`getBookPdfBlob` was dead code** — no callers anywhere in the repo. Its `fetch()` bug
  was real but fixing it alone would have changed nothing at runtime. The actual bypass was
  `<Document file={book.storageUrl}>` in `ReadingPage`: a `getDownloadURL()` link carries
  its own token, authenticates as nobody, and pdf.js fetched it directly — so
  `storage.rules` was never consulted on the one path that opens a book. The page now
  downloads the bytes through `getBlob()` and hands `<Document>` a Blob.
- **The existing rules tests did not fail.** The handoff expected them to. All 44 checks
  across the six pre-existing suites passed unchanged against both the broken rules and the
  fixed ones — they seed through `withSecurityRulesDisabled` and then test what the app
  does, so a rule that let in everybody looked identical to one that let in the right
  person. That is the real lesson of this audit, and it is now written into `CLAUDE.md`.

## Verification

- `tests/rules/accessControl.test.mjs` (new) — 19 checks that ask *who else* could have
  done it. **11 of them fail against the old rules and pass against the new ones**; the
  other 8 are the positive controls. Whole suite now **63 checks across 10 suites, green**.
- `tests/e2e/storage-scope.e2e.mjs` (new) — drives the Storage emulator with the real
  `storage.rules`: an enrolled student reads their teacher's book, the teacher is denied
  the student's own upload, an unenrolled account is denied both.
- E2E now boots the **Functions and Storage** emulators too (it booted neither before, so
  no flow had ever touched `storage.rules`). Fixture PDFs are uploaded to Storage rather
  than served from a relative Vite path. **All 9 flows green.**
- `tsc -b`, `eslint .`, and `functions/` typecheck all clean.

## Ed Law 2-d position

ActiveCampaign, Mailgun and Stripe are **not** 2-d subcontractors: they receive teacher and
individual marketing/billing data only — no student data, no APPR data. Supplement Q2 = No.

## Still open

1. **Nothing is deployed.** Deploy order is load-bearing: **functions first, then rules.**
   Merging to `main` ships the rules automatically via CI, but functions only deploy from
   the manual **Actions → Deploy Cloud Functions** workflow. Run that against the branch
   (it takes a `ref`) with `createClassroom,joinClassroom` *before* merging, or enrolment
   breaks for everyone between the two.
2. **CORS.** `getBlob()` is an XHR with an `Authorization` header; a plain GET of a
   tokenized URL was not. If books stop opening in production, check the bucket's CORS
   config first — the emulator does not exercise it.
3. **Existing download-URL tokens stay valid** for anyone holding one. Revoking is
   per-object in the Firebase console (Storage → file → Create new access token).
4. **Legacy flat `books/<file>` objects** are still readable by any signed-in account — a
   commented migration shim, because nothing in their path names an owner. They are
   teacher-uploaded texts, never student work. Re-upload them and delete the match block.
5. **Whether to delete the ActiveCampaign / Mailgun functions** from `ascend-annotate` —
   not decided, deliberately left alone.
