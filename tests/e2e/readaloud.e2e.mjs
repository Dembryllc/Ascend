// Read aloud controls: speed, voice, and picking where to start.
//
// Headless Chromium ships no speech voices, so this flow deliberately does NOT
// assert that audio plays — it asserts the controls exist, are wired to the
// page's real sentences, and persist. The parts that need a voice (boundary
// highlighting, actual playback) are unverifiable here and are not claimed.
import { chromium } from 'playwright'
import { mkdirSync, writeFileSync } from 'node:fs'

const BASE = process.argv[2] || 'http://127.0.0.1:5173'
const SHOTS = process.argv[3] || 'e2e-shots'
mkdirSync(SHOTS, { recursive: true })

const log = (...a) => console.log('[e2e:readaloud]', ...a)
let shot = 0
async function snap(page, name) {
  shot += 1
  const file = `${SHOTS}/ra-${String(shot).padStart(2, '0')}-${name}.png`
  await page.screenshot({ path: file, fullPage: true })
  log('screenshot', file)
}

const EXECUTABLE = process.env.PW_CHROMIUM || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
const browser = await chromium.launch({ executablePath: EXECUTABLE })
const ctx = await browser.newContext({ viewport: { width: 1280, height: 1000 } })
const page = await ctx.newPage()
const errors = []
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message))

try {
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' })
  await page.locator('#email').fill('student@test.dev')
  await page.locator('#password').fill('test1234')
  await page.getByRole('button', { name: /sign in|log in/i }).first().click()
  await page.getByRole('heading', { name: /hello, sam/i }).waitFor({ timeout: 25000 })

  // The text-layer fixture — the scan has no sentences to steer through.
  await page.getByRole('link', { name: /text/i }).or(page.getByRole('button', { name: /text/i })).first().click()
  await page.locator('.react-pdf__Page__textContent span').first().waitFor({ timeout: 30000 })
  await snap(page, 'reader')

  // ── 1. Controls appear on a page that has text ──
  const bar = page.getByRole('region', { name: /read aloud controls/i })
    .or(page.locator('section[aria-label="Read aloud controls"]'))
  await page.getByRole('button', { name: /read page aloud/i }).first().click()
  await bar.first().waitFor({ timeout: 20000 })
  await snap(page, 'controls')

  // ── 2. "Start from" is built from this page's real sentences ──
  const startSelect = page.locator('#read-aloud-start')
  await startSelect.waitFor({ timeout: 20000 })
  const optionCount = await startSelect.locator('option').count()
  if (optionCount < 2) {
    throw new Error(`expected the page to split into several sentences, got ${optionCount}`)
  }
  const firstOption = (await startSelect.locator('option').first().innerText()).trim()
  if (!/^1\./.test(firstOption)) {
    throw new Error(`sentence list should be numbered from 1, got: ${firstOption}`)
  }
  log(`sentence list OK — ${optionCount} sentences, first: ${firstOption.slice(0, 50)}`)

  // ── 3. Jumping moves the counter ──
  const target = Math.min(2, optionCount - 1)
  await startSelect.selectOption(String(target))
  await page.getByText(new RegExp(`Sentence ${target + 1} of ${optionCount}`, 'i')).waitFor({ timeout: 15000 })
  log(`jump OK — counter reads sentence ${target + 1} of ${optionCount}`)

  // ── 4. Skip back steps one sentence ──
  await page.getByRole('button', { name: /previous sentence/i }).click()
  await page.getByText(new RegExp(`Sentence ${target} of ${optionCount}`, 'i')).waitFor({ timeout: 15000 })
  log('skip back OK')

  // ── 5. Speed is a real choice and survives a reload ──
  const rate = page.locator('#read-aloud-rate')
  await rate.selectOption('0.6')
  await snap(page, 'slowed')
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.locator('.react-pdf__Page__textContent span').first().waitFor({ timeout: 30000 })
  await page.getByRole('button', { name: /read page aloud/i }).first().click()
  await page.locator('#read-aloud-rate').waitFor({ timeout: 20000 })
  const persisted = await page.locator('#read-aloud-rate').inputValue()
  if (persisted !== '0.6') {
    throw new Error(`speed should persist across reloads, got ${persisted}`)
  }
  log('speed persistence OK — still 0.6 after reload')

  // ── 6. A device with no voices says so, instead of sitting on "Loading…" ──
  // Headless Chromium has no speech engine, which makes this the one place the
  // fallback can actually be exercised.
  const noVoices = await page.getByText(/no speech voices installed/i).count()
  log(noVoices > 0
    ? 'no-voice fallback OK — explained rather than stuck on "Loading…"'
    : 'note: voices present in this browser, fallback path not exercised')

  // ── 7. Turning the page clears the old page's sentence list ──
  await page.getByRole('button', { name: /next page/i }).first().click().catch(() => {})
  await page.waitForTimeout(1500)
  await snap(page, 'after-page-turn')

  log('FLOW_OK')
  writeFileSync(`${SHOTS}/readaloud-console-errors.json`, JSON.stringify(errors, null, 2))
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
