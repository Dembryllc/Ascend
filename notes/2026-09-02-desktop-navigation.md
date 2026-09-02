---
date: 2026-09-02
project: Easy Annotate
tags: [easy-annotate, navigation, appshell, accessibility, e2e, regression]
---

# Real navigation for tablet and desktop

## The gap

`AppShell` rendered navigation in exactly one place: a bottom bar marked `sm:hidden`.
At >=640px there was no navigation anywhere in the app. Teachers on an iPad reached
Classroom, Upload, Writing, Annotations and Progress only through the Quick Actions
cards on their dashboard — and those stop rendering once onboarding completes, so the
dashboard became a dead end.

Commit `33089fe` removed those cards as "duplicates of the nav" and was reverted in
`c90f94a` after a production report: "the teacher profile is now bare and nothing is
tappable or assignable." The revert closed with the condition for trying again — build
real navigation for >=640px first. That is what landed here.

## What changed

- **`src/components/layout/AppShell.tsx`** — a second header row, `hidden sm:block`,
  renders the same `TEACHER_NAV` / `STUDENT_NAV` items as horizontal tabs with an
  active underline and `aria-current="page"`. It is inside the sticky header, so it
  follows the page. The row is `overflow-x-auto` for the 640–767px band, where six
  teacher items are wider than the viewport; at md+ (iPad portrait and up) they all
  fit. The mobile bottom bar is untouched.
- **`tests/e2e/navigation.e2e.mjs`** — new flow, added to `run.sh`.

## Why the regression was invisible

The check that supposedly confirmed the removal was safe counted `nav a, header a`
links and found 7 — header links plus the mobile bar, which is still in the DOM at
1280px, just `display: none`. Every existing e2e flow already ran at 1280 and none of
them noticed the app had no nav.

So the new flow asserts **visibility**, never DOM presence: for each role it walks
390 / 768 / 1280px and requires every destination to be an on-screen link with a
non-zero box inside the viewport. It then clicks Classroom → Writing at iPad width to
prove the links route, and waits for `aria-current` to move.

## Verification

- `npm run build`, `npm run lint` — clean.
- `npm run test:e2e` — all five flows green (writing, register, pdftext, annotations,
  navigation).
- Negative check: with the header nav deleted, the flow fails on the exact user-visible
  symptom — `teacher at 768px (ipad-portrait) has no visible route to: Home, Classroom,
  Upload, Writing, Annotations, Progress` — while still passing at 390px. Restored and
  re-run green.

## Next

Removing the five Quick Actions cards from `TeacherDashboard` is now unblocked — real
navigation exists at every width, which was the condition the revert set. The original
critique (five equal-weight saturated cards give the screen no primary action) still
stands, but that is a deliberate design call and was not made here.
