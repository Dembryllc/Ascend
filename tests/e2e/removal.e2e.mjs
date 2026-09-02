// Teacher removal flows: taking a book out of the library, and a student off the
// roster. Neither had any UI at all — a teacher could add both and undo neither.
//
// Runs LAST in the suite: it deletes seeded data the earlier flows read.
import { chromium } from 'playwright'
import { mkdirSync, writeFileSync } from 'node:fs'

const BASE = process.argv[2] || 'http://127.0.0.1:5173'
const SHOTS = process.argv[3] || 'e2e-shots'
mkdirSync(SHOTS, { recursive: true })

const log = (...a) => console.log('[e2e:removal]', ...a)
let shot = 0
async function snap(page, name) {
  shot += 1
  const file = `${SHOTS}/rm-${String(shot).padStart(2, '0')}-${name}.png`
  await page.screenshot({ path: file, fullPage: true })
  log('screenshot', file)
}

const EXECUTABLE = process.env.PW_CHROMIUM || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
const browser = await chromium.launch({ executablePath: EXECUTABLE })
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } })
const page = await ctx.newPage()
const errors = []
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message))

// The seeded book that carries student annotations, so the confirmation has a
// real number to report rather than the empty-state wording.
const BOOK = 'Night on Fire'

try {
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' })
  await page.locator('#email').fill('teacher@test.dev')
  await page.locator('#password').fill('test1234')
  await page.getByRole('button', { name: /sign in|log in/i }).first().click()
  await page.getByRole('heading', { name: /hello, ms\. ada/i }).waitFor({ timeout: 25000 })

  await page.goto(`${BASE}/teacher/classroom`, { waitUntil: 'domcontentloaded' })
  await page.getByRole('heading', { name: /your books/i }).waitFor({ timeout: 25000 })
  await snap(page, 'classroom')

  // ── 1. Deleting a book names what it will take with it ──
  await page.getByRole('button', { name: `Delete ${BOOK}` }).click()
  const dialog = page.getByRole('heading', { name: /delete this book\?/i })
  await dialog.waitFor({ timeout: 10000 })

  // The confirm button stays disabled until the impact count has actually been
  // read — a teacher must never be able to confirm against "Checking…".
  const confirmBtn = page.getByRole('button', { name: /^delete$/i })
  const body = page.locator('.fixed.inset-0 p').nth(1)
  await body.filter({ hasText: /student notes? on this book/i }).waitFor({ timeout: 15000 })
  const impact = (await body.innerText()).replace(/\s+/g, ' ')
  const matched = impact.match(/deletes (\d+) student note/)
  if (!matched || Number(matched[1]) < 1) {
    throw new Error(`confirm should report the student notes it will delete, said: ${impact}`)
  }
  await snap(page, 'confirm-book')
  log('impact OK:', impact)

  await confirmBtn.click()
  await page.getByText(BOOK, { exact: false }).first().waitFor({ state: 'detached', timeout: 20000 })
  log('book deleted and gone from the library')

  // It stays gone after a reload — the delete reached Firestore, not just state.
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.getByRole('heading', { name: /students/i }).first().waitFor({ timeout: 25000 })
  if (await page.getByRole('button', { name: `Delete ${BOOK}` }).count() > 0) {
    throw new Error('book reappeared after reload — it was only removed from local state')
  }
  await snap(page, 'after-book-delete')

  // ── 2. Removing a student from the roster ──
  const removeBtn = page.getByRole('button', { name: /Remove Sam from classroom/i })
  await removeBtn.waitFor({ timeout: 20000 })
  await removeBtn.click()
  await page.getByRole('heading', { name: /remove from this classroom\?/i }).waitFor({ timeout: 10000 })

  // The wording has to promise what the code does: un-enrolment, not deletion.
  const removeBody = await page.locator('.fixed.inset-0').last().innerText()
  if (!/keep their account/i.test(removeBody)) {
    throw new Error(`remove dialog should say the student keeps their work, said: ${removeBody}`)
  }
  await snap(page, 'confirm-student')

  await page.getByRole('button', { name: /^remove$/i }).click()
  await removeBtn.waitFor({ state: 'detached', timeout: 20000 })
  log('student removed from the roster')

  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.getByRole('heading', { name: /students/i }).first().waitFor({ timeout: 25000 })
  if (await page.getByRole('button', { name: /Remove Sam from classroom/i }).count() > 0) {
    throw new Error('student reappeared after reload — the roster write did not stick')
  }
  await snap(page, 'after-student-remove')

  // ── 3. The cascade really ran — the student has no ghost notes ──
  // MyAnnotationsPage falls back to "Unknown Book" for an annotation whose book
  // is gone, so a failed cascade shows up here as five orphans rather than as
  // silence. Sam was un-enrolled above and still owns their own account.
  await page.getByRole('button', { name: /sign out/i }).first().click()
  await page.waitForURL(/\/login/, { timeout: 20000 })
  await page.locator('#email').fill('student@test.dev')
  await page.locator('#password').fill('test1234')
  await page.getByRole('button', { name: /sign in|log in/i }).first().click()
  await page.getByRole('heading', { name: /hello, sam/i }).waitFor({ timeout: 25000 })

  await page.goto(`${BASE}/student/annotations`, { waitUntil: 'domcontentloaded' })
  await page.getByRole('combobox', { name: /filter by book/i })
    .or(page.getByText(/no annotations|nothing here yet/i))
    .first().waitFor({ timeout: 25000 })
  await snap(page, 'student-notes')
  const ghosts = await page.getByText(/unknown book/i).count()
  if (ghosts > 0) {
    throw new Error(`${ghosts} student note(s) survived the book delete as "Unknown Book" — the cascade did not run`)
  }
  if (await page.getByText(BOOK, { exact: false }).count() > 0) {
    throw new Error(`the deleted book is still listed on the student's notes page`)
  }
  log('cascade OK — no orphaned notes on the student side')

  log('FLOW_OK')
  writeFileSync(`${SHOTS}/removal-console-errors.json`, JSON.stringify(errors, null, 2))
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
