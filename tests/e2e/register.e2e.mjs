// Registration regression flow: a new student signing up WITH a class join code
// must land on their home, not on the "Account setup incomplete" recovery screen.
//
// The bug this guards: createUserWithEmailAndPassword signs the user in before
// registerUser writes the Firestore profile, and a join code adds two more
// round-trips (code lookup + classroom join) before that write lands — so the
// auth listener's first profile read comes back empty and ProtectedRoute wrongly
// reported that the profile could not be saved, for a profile that saved fine.
import { chromium } from 'playwright'
import { mkdirSync, writeFileSync } from 'node:fs'

const BASE = process.argv[2] || 'http://127.0.0.1:5173'
const SHOTS = process.argv[3] || 'e2e-shots'
mkdirSync(SHOTS, { recursive: true })

const JOIN_CODE = 'ROOM01' // seeded classroom (tests/e2e/seed.mjs)
const stamp = Date.now()

const log = (...a) => console.log('[e2e:register]', ...a)
let shot = 0
async function snap(page, name) {
  shot += 1
  const file = `${SHOTS}/reg-${String(shot).padStart(2, '0')}-${name}.png`
  await page.screenshot({ path: file, fullPage: true })
  log('screenshot', file)
}

async function register(page, { name, email, joinCode }) {
  await page.goto(`${BASE}/register`, { waitUntil: 'domcontentloaded' })
  await page.locator('#displayName').fill(name)
  await page.locator('#email').fill(email)
  await page.locator('#password').fill('test1234')
  if (joinCode) await page.locator('#joinCode').fill(joinCode)
  await snap(page, joinCode ? 'form-with-code' : 'form-no-code')
  await page.getByRole('button', { name: /create account/i }).click()
}

// Fails loudly if the false "profile could not be saved" screen shows up.
async function expectHome(page, name) {
  const home = page.getByRole('heading', { name: new RegExp(`hello, ${name}`, 'i') })
  const broken = page.getByRole('heading', { name: /account setup incomplete/i })
  const outcome = await Promise.race([
    home.waitFor({ state: 'visible', timeout: 25000 }).then(() => 'home'),
    broken.waitFor({ state: 'visible', timeout: 25000 }).then(() => 'incomplete'),
  ])
  if (outcome !== 'home') {
    await snap(page, 'FALSE-SETUP-INCOMPLETE')
    throw new Error('Registration showed "Account setup incomplete" even though the profile was written')
  }
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
  // ── 1. Student WITH a class join code (the reported bug) ──
  await register(page, { name: 'Codey', email: `reg-code-${stamp}@test.dev`, joinCode: JOIN_CODE })
  await expectHome(page, 'Codey')
  await snap(page, 'joined-student-home')
  // The classroom join also landed: the class's assigned writing task is visible.
  await page.getByText('Persuasive paragraph: school lunches').first().waitFor({ timeout: 15000 })
  log('class join OK')
  await logout(page)

  // ── 2. Student WITHOUT a join code (same race, narrower window) ──
  await register(page, { name: 'Solo', email: `reg-nocode-${stamp}@test.dev` })
  await expectHome(page, 'Solo')
  await snap(page, 'nocode-student-home')

  log('FLOW_OK')
  writeFileSync(`${SHOTS}/register-console-errors.json`, JSON.stringify(errors, null, 2))
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
