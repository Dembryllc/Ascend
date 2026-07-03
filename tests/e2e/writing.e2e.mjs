// Drives the writing feature end-to-end in Chromium against the emulator.
// Flow: student writes → teacher reviews + leaves feedback → student sees it.
// Screenshots are written to the directory given as argv[3] (default ./e2e-shots).
import { chromium } from 'playwright'
import { mkdirSync, writeFileSync } from 'node:fs'

const BASE = process.argv[2] || 'http://127.0.0.1:5173'
const SHOTS = process.argv[3] || 'e2e-shots'
mkdirSync(SHOTS, { recursive: true })

const TEACHER = { email: 'teacher@test.dev', pw: 'test1234' }
const STUDENT = { email: 'student@test.dev', pw: 'test1234' }

const log = (...a) => console.log('[e2e]', ...a)
let shot = 0
async function snap(page, name) {
  shot += 1
  const file = `${SHOTS}/${String(shot).padStart(2, '0')}-${name}.png`
  await page.screenshot({ path: file, fullPage: true })
  log('screenshot', file)
}

async function login(page, who) {
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' })
  await page.locator('input[type=email]').fill(who.email)
  await page.locator('input[type=password]').fill(who.pw)
  await page.getByRole('button', { name: /sign in/i }).click()
  await page.waitForURL(/\/(teacher|student)(\/|$|\?)/, { timeout: 15000 })
}

async function logout(page) {
  await page.getByRole('button', { name: /sign out/i }).first().click()
  await page.waitForURL(/\/login/, { timeout: 15000 })
}

// The installed Playwright may not match the pre-baked browser build, so
// launch the Chromium that ships with the image directly.
const EXECUTABLE = process.env.PW_CHROMIUM || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
const browser = await chromium.launch({ executablePath: EXECUTABLE })
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } })
const page = await ctx.newPage()
const errors = []
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message))

try {
  // ── 1. Student completes the assigned writing task ──
  await login(page, STUDENT)
  await page.getByRole('heading', { name: /writing/i }).first().waitFor({ timeout: 15000 })
  await snap(page, 'student-home')

  await page.getByText('Persuasive paragraph: school lunches').first().click()
  await page.getByRole('dialog').waitFor({ timeout: 15000 })
  const boxes = page.getByRole('dialog').locator('textarea')
  await boxes.nth(0).fill('I believe schools should serve free lunch to every student.')
  await boxes.nth(1).fill('First, hungry students cannot focus in class.')
  await boxes.nth(2).fill('Second, free lunch removes the stigma of who can pay.')
  // wait for autosave
  await page.getByText(/saved/i).first().waitFor({ timeout: 15000 })
  await snap(page, 'student-writing-filled')
  await page.getByRole('button', { name: /mark complete/i }).click()
  await page.waitForTimeout(1200)
  await page.getByRole('button', { name: /^close$/i }).click()
  await logout(page)

  // ── 2. Teacher reviews the response and leaves feedback ──
  await login(page, TEACHER)
  await page.goto(`${BASE}/teacher/writing`, { waitUntil: 'domcontentloaded' })
  await page.getByText('Persuasive paragraph: school lunches').first().waitFor({ timeout: 15000 })
  await snap(page, 'teacher-writing-list')
  await page.getByRole('link', { name: /view responses/i }).first().click()
  await page.waitForURL(/\/teacher\/writing\/.+/, { timeout: 15000 })
  await page.getByText('Sam').first().click() // expand the student row
  await page.getByText(/I believe schools should serve free lunch/i).waitFor({ timeout: 15000 })
  await snap(page, 'teacher-review-expanded')
  await page.locator('textarea').first().fill('Strong topic sentence! Add one more detail and a closing sentence.')
  await page.getByLabel(/mark as reviewed/i).check()
  await page.getByRole('button', { name: /save feedback/i }).click()
  await page.getByText(/saved/i).first().waitFor({ timeout: 15000 })
  await snap(page, 'teacher-feedback-saved')
  await logout(page)

  // ── 3. Student sees the feedback ──
  await login(page, STUDENT)
  await page.getByText(/feedback/i).first().waitFor({ timeout: 15000 })
  await snap(page, 'student-feedback-chip')
  await page.getByText('Persuasive paragraph: school lunches').first().click()
  await page.getByText(/teacher feedback/i).waitFor({ timeout: 15000 })
  await page.getByText(/Strong topic sentence/i).waitFor({ timeout: 15000 })
  await snap(page, 'student-sees-feedback')

  log('FLOW_OK')
  writeFileSync(`${SHOTS}/console-errors.json`, JSON.stringify(errors, null, 2))
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
