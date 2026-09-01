---
date: 2026-09-01
project: Easy Annotate
tags: [bug, auth, registration, firebase, e2e]
---

# Registration with a class code falsely reported "profile could not be saved"

## Symptom
Creating a student account **with a class join code** landed on the
"Account setup incomplete — your account was created but the profile could not be
saved" screen. The profile *was* saved: the Firestore `users/{uid}` doc existed and the
classroom join had gone through. Signing in again worked fine.

## Root cause — a read/write race, not a write failure
`createUserWithEmailAndPassword()` signs the new user in immediately, which fires
`onAuthStateChanged` in `AuthContext`. That listener reads `users/{uid}` **before**
`registerUser()` has written it, gets `null`, and caches `profile: null` with
`loading: false`. `RegisterPage` then navigates to `/student`, and `ProtectedRoute`
saw `user && !profile` and declared registration failed.

A join code widens the window a lot: `resolveJoinCode()` runs before the `setDoc`, and
`joinClassroomByCode()` (batch write + books query) runs after it — several extra
round-trips during which the context still holds its stale `null`. Nothing ever
re-read the profile, so the false error stuck.

## Fix (three layers, all needed)
1. `src/context/AuthContext.tsx` — the auth listener re-reads the profile with backoff
   (`PROFILE_RETRY_DELAYS_MS = [400, 800, 1600]`) before settling on `null`. A generation
   counter stops a slow retry from overwriting a fresher result with a stale `null`.
   `refreshProfile()` now returns the profile and falls back to `auth.currentUser` when
   the listener hasn't set `userRef` yet.
2. `src/pages/auth/RegisterPage.tsx` — `await refreshProfile()` before `navigate()` on both
   the email/password and Google sign-up paths. This makes the happy path deterministic
   rather than relying on the backoff.
3. `src/components/shared/ProtectedRoute.tsx` — one more `refreshProfile()` ("Finishing
   account setup…") before showing the recovery screen. Copy softened and a "Try again"
   button added; the old advice ("sign out and register again") would have hit
   `auth/email-already-in-use`.

## Verification
New `tests/e2e/register.e2e.mjs` registers a student with the seeded join code `ROOM01`
and one without, asserting the student home renders (`Hello, <name>!`) and that the
"Account setup incomplete" heading never appears; the class-code case also asserts the
classroom join landed (the class's assigned writing task shows on the home).

- Pre-fix (changes stashed): **fails**, screenshotting the exact reported error screen.
- Post-fix: **passes**, and the classroom onboarding step shows as complete.
- `npm run test:e2e` runs the writing flow then the register flow — both green.
- `npm run lint`, `tsc -b`, `npm run build` clean.

## Notes
No Firestore rules, indexes, or data-model changes — this was purely a client-side
read-timing bug.
