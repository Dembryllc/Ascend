// Deleting a student account outright — the job "Remove" deliberately does not do.
//
// The bug this closes was reported from production: a teacher removed a student
// from their roster and then had no way to finish deleting them without opening
// the Firebase Console by hand. Two separate causes, and this flow covers both.
//
// 1. THE AUTH ACCOUNT. The Firebase client SDK can only delete the *currently
//    signed-in* user, so a teacher literally cannot delete a student's login
//    from the browser. It needs the Admin SDK, i.e. a Cloud Function. The last
//    step here is the one that proves it actually happened: after the delete,
//    the student's own credentials no longer sign in. Nothing short of the real
//    callable running against the Auth emulator can demonstrate that, which is
//    why firebase.emulator.json now boots functions too.
//
// 2. THE ORDER A TEACHER ACTUALLY WORKS IN. Removal clears classroomId, the
//    roster and every book assignment — after it there is no link left between
//    teacher and student at all. This flow deliberately deletes a student who
//    was ALREADY removed (removal.e2e.mjs un-enrols Sam and runs before this),
//    so it fails if the removal provenance or the "Removed from this class"
//    list regresses. Deleting straight from the roster would not test the case
//    the teacher actually hit.
//
// Runs LAST: it destroys the seeded student account every other flow signs in as.
import { chromium } from 'playwright'
import { mkdirSync, writeFileSync } from 'node:fs'

const BASE = process.argv[2] || 'http://127.0.0.1:5173'
const SHOTS = process.argv[3] || 'e2e-shots'
mkdirSync(SHOTS, { recursive: true })

const log = (...a) => console.log('[e2e:deletestudent]', ...a)
let shot = 0
async function snap(page, name) {
  shot += 1
  const file = `${SHOTS}/del-${String(shot).padStart(2, '0')}-${name}.png`
  await page.screenshot({ path: file, fullPage: true })
  log('screenshot', file)
}

const STUDENT_NAME = 'Sam'

const EXECUTABLE = process.env.PW_CHROMIUM || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
const browser = await chromium.launch({ executablePath: EXECUTABLE })
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } })
const page = await ctx.newPage()
const errors = []
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message))

// Every route is a React.lazy() chunk and lazy() never retries, so one reset
// connection to the dev server parks Suspense on "Loading…" forever. Reload
// rather than failing the flow on an infrastructure hiccup.
async function gotoStable(path, ready, timeout = 15000) {
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    await page.goto(`${BASE}${path}`, { waitUntil: 'domcontentloaded' })
    try {
      await ready().waitFor({ state: 'visible', timeout })
      return
    } catch (err) {
      if (attempt === 3) throw err
      log(`retrying ${path} — it never got past the loading screen`)
    }
  }
}

async function signIn(email) {
  await gotoStable('/login', () => page.locator('#email'))
  await page.locator('#email').fill(email)
  await page.locator('#password').fill('test1234')
  await page.getByRole('button', { name: /sign in|log in/i }).first().click()
}

try {
  // ══ 1. An already-removed student is still reachable ══════════════════════
  await signIn('teacher@test.dev')
  await page.waitForURL(/\/teacher$/, { timeout: 20000 })
  await gotoStable('/teacher/classroom', () => page.getByRole('heading', { name: /removed from this class/i }), 20000)
  const removedRow = page.getByRole('button', { name: new RegExp(`Delete ${STUDENT_NAME}'s account`, 'i') }).last()
  await removedRow.waitFor({ timeout: 15000 })
  await snap(page, 'removed-list')
  log('removed-students list OK — an un-enrolled account is still reachable')

  // ══ 2. The dialog names the damage before it is done ══════════════════════
  await removedRow.click()
  const dialog = page.getByRole('heading', { name: /delete this account\?/i })
  await dialog.waitFor({ timeout: 15000 })

  // The dry run is a real call into the Cloud Function. If functions are not
  // running, this never resolves and the confirm button stays disabled.
  const impact = page.getByText(/this erases \d+ thing|they have not written anything yet/i).first()
  await impact.waitFor({ timeout: 25000 })
  const impactText = (await impact.innerText()).replace(/\s+/g, ' ')
  log('impact OK:', impactText)

  const confirmButton = page.getByRole('button', { name: /^delete account$/i })
  if (!(await confirmButton.isDisabled())) {
    throw new Error('confirm should stay disabled until the teacher types the name')
  }
  await page.locator('#delete-student-confirm').fill('not the right name')
  if (!(await confirmButton.isDisabled())) {
    throw new Error('confirm accepted the wrong name')
  }
  await snap(page, 'confirm-dialog')

  // ══ 3. Delete, and make it stick ══════════════════════════════════════════
  await page.locator('#delete-student-confirm').fill(STUDENT_NAME)
  await confirmButton.click()
  await dialog.waitFor({ state: 'hidden', timeout: 30000 })
  await page.waitForTimeout(1500)

  if (await page.getByRole('heading', { name: /removed from this class/i }).count() > 0) {
    throw new Error('the removed-students list is still showing after deleting its only entry')
  }
  await snap(page, 'after-delete')

  // A reload is what separates a real delete from React state.
  await gotoStable('/teacher/classroom', () => page.getByRole('heading', { name: /students/i }).first(), 20000)
  await page.waitForTimeout(1500)
  if (await page.getByText(STUDENT_NAME, { exact: true }).count() > 0) {
    throw new Error(`${STUDENT_NAME} is back after a reload — the delete never reached Firestore`)
  }
  log('delete OK — survived a reload')

  // ══ 4. The sign-in is gone too ════════════════════════════════════════════
  // This is the assertion the whole feature exists for: deleting the Auth user
  // is the part a teacher could not do from the browser, and the only reason
  // they had to open the Firebase Console.
  await page.getByRole('button', { name: /sign out/i }).first().click()
  await page.waitForURL(/\/login$/, { timeout: 20000 })
  await signIn('student@test.dev')
  await page.waitForTimeout(4000)
  if (/\/student/.test(page.url())) {
    throw new Error('the deleted student still signed in — the Auth account was not deleted')
  }
  await snap(page, 'signin-refused')
  log('auth OK — the deleted student can no longer sign in, url is', page.url())

  log('FLOW_OK')
  writeFileSync(`${SHOTS}/deletestudent-console-errors.json`, JSON.stringify(errors, null, 2))
  log(errors.length ? `CONSOLE_ERRORS_COUNT=${errors.length}` : 'no console errors')
  await browser.close()
  process.exit(0)
} catch (err) {
  log('FLOW_FAILED:', err.message)
  await snap(page, 'FAILURE')
  if (errors.length) log('CONSOLE_ERRORS:', JSON.stringify(errors, null, 2))
  await browser.close()
  process.exit(1)
}
