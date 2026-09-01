// Teacher annotation-viewing regression flow.
//
// The bug this guards is a rules-shaped one, invisible until a real teacher hits it:
// getOrganizerResponse queried organizers by studentId+bookId, but the organizers read
// rule grants teachers access only through its classroomId branch. Firestore rejects
// that query on its shape, so it failed for every teacher on every book — even with
// zero organizer documents. It shared a Promise.all with the annotation and progress
// reads, so the rejection blanked the whole screen: the teacher saw "Could not load
// annotations" while the annotations query had actually succeeded.
//
// Also guards the entry point: the screen used to open on two empty dropdowns, showing
// nothing until the teacher guessed a student/book pair that had data.
import { chromium } from 'playwright'
import { mkdirSync, writeFileSync } from 'node:fs'

const BASE = process.argv[2] || 'http://127.0.0.1:5173'
const SHOTS = process.argv[3] || 'e2e-shots'
mkdirSync(SHOTS, { recursive: true })

const log = (...a) => console.log('[e2e:annotations]', ...a)
let shot = 0
async function snap(page, name) {
  shot += 1
  const file = `${SHOTS}/ann-${String(shot).padStart(2, '0')}-${name}.png`
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

try {
  // ── Sign in as the seeded teacher ──
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' })
  await page.locator('#email').fill('teacher@test.dev')
  await page.locator('#password').fill('test1234')
  await page.getByRole('button', { name: /sign in|log in/i }).first().click()
  await page.getByRole('heading', { name: /hello, ms\. ada/i }).waitFor({ timeout: 20000 })

  // ── 1. Arriving cold shows where the activity is, with nothing to configure ──
  await page.goto(`${BASE}/teacher/annotations`, { waitUntil: 'domcontentloaded' })
  const rosterRow = page.getByRole('button', { name: /Sam.*annotation/is })
  await rosterRow.waitFor({ timeout: 20000 })
  // Counts must render, but not an exact number: earlier flows in the suite add
  // annotations of their own, so this asserts the shape rather than a fixed total.
  const rosterText = (await rosterRow.innerText()).replace(/\s+/g, ' ')
  if (!/\d+ annotations? across \d+ books?/.test(rosterText)) {
    throw new Error(`roster should show annotation counts, got: ${rosterText}`)
  }
  await snap(page, 'roster')
  log('roster OK:', rosterText)

  // ── 2. One click reaches real content — not the false "could not load" error ──
  await rosterRow.click()

  const failed = page.getByText(/could not load annotations/i).first()
  const summary = page.getByRole('heading', { name: /pattern summary/i })
  await Promise.race([
    summary.waitFor({ timeout: 25000 }),
    failed.waitFor({ timeout: 25000 }),
  ])
  if (await failed.isVisible().catch(() => false)) {
    throw new Error('teacher saw "Could not load annotations" — a sibling read rejected and blanked the view')
  }
  await summary.waitFor({ timeout: 25000 })
  log('detail OK — one click reached content, no false load error')

  // Annotation cards actually rendered — not just the summary shell. Asserted by shape
  // ("Page N — Reaction") rather than by a specific book or quote: other flows in the
  // suite add their own annotations, and which book auto-select opens depends on them.
  const firstCard = page.getByText(/^Page \d+ — /).first()
  await firstCard.waitFor({ timeout: 20000 })
  await snap(page, 'detail')
  log('annotation cards OK:', (await firstCard.innerText()).trim())

  // ── 3. The organizer tab is reachable and does not error ──
  await page.getByRole('button', { name: /organizer/i }).first().click()
  await page.getByText(/no graphic organizer submitted/i).waitFor({ timeout: 15000 })
  log('organizer tab OK — reports "none submitted" rather than failing')

  // ── 4. FERPA notice stays on the page ──
  await page.getByText(/protected under FERPA/i).waitFor({ timeout: 10000 })

  log('FLOW_OK')
  writeFileSync(`${SHOTS}/annotations-console-errors.json`, JSON.stringify(errors, null, 2))
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
