// Navigation-reachability regression flow.
//
// The bug this guards shipped to production and was reported from an iPad: "the
// teacher profile is now bare and nothing is tappable or assignable." AppShell
// rendered navigation in exactly one place — a bottom bar marked `sm:hidden` —
// so at >=640px the app had no navigation at all. It went unnoticed because the
// only check ever run counted `nav a, header a` links in the DOM and found
// seven: header links plus the mobile bar, which is still in the DOM at desktop
// widths, just display:none.
//
// So this flow asserts VISIBILITY at three real widths, never DOM presence, and
// finishes by actually clicking through to prove the links route.
import { chromium } from 'playwright'
import { mkdirSync, writeFileSync } from 'node:fs'

const BASE = process.argv[2] || 'http://127.0.0.1:5173'
const SHOTS = process.argv[3] || 'e2e-shots'
mkdirSync(SHOTS, { recursive: true })

const log = (...a) => console.log('[e2e:navigation]', ...a)
let shot = 0
async function snap(page, name) {
  shot += 1
  const file = `${SHOTS}/nav-${String(shot).padStart(2, '0')}-${name}.png`
  await page.screenshot({ path: file, fullPage: true })
  log('screenshot', file)
}

// Every destination AppShell promises each role. A width that cannot see all of
// these is a width where part of the app is unreachable.
const TEACHER_DESTS = ['Home', 'Classroom', 'Upload', 'Writing', 'Annotations', 'Progress']
const STUDENT_DESTS = ['Books', 'My Notes', 'Progress']

// Widths that matter: a phone, iPad portrait (the reported device), and a laptop.
const WIDTHS = [
  { name: 'phone', width: 390, height: 844 },
  { name: 'ipad-portrait', width: 768, height: 1024 },
  { name: 'laptop', width: 1280, height: 900 },
]

const EXECUTABLE = process.env.PW_CHROMIUM || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
const browser = await chromium.launch({ executablePath: EXECUTABLE })
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } })
const page = await ctx.newPage()
const errors = []
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message))

async function signIn(email, homeHeading) {
  // There is no /logout route — signing out is the header button, which keeps its
  // aria-label at every width even when the text label is hidden.
  const signOut = page.getByRole('button', { name: /sign out/i }).first()
  if (await signOut.isVisible().catch(() => false)) {
    await signOut.click()
    await page.waitForURL(/\/login/, { timeout: 20000 })
  }
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' })
  await page.locator('#email').fill(email)
  await page.locator('#password').fill('test1234')
  await page.getByRole('button', { name: /sign in|log in/i }).first().click()
  await page.getByRole('heading', { name: homeHeading }).waitFor({ timeout: 25000 })
}

// A destination counts as reachable only if a link carrying its name is actually
// on screen — visible, non-zero box, inside the viewport.
async function reachable(label) {
  const link = page.getByRole('link', { name: label, exact: true })
  const count = await link.count()
  for (let i = 0; i < count; i += 1) {
    const one = link.nth(i)
    if (!(await one.isVisible().catch(() => false))) continue
    const box = await one.boundingBox()
    if (!box || box.width === 0 || box.height === 0) continue
    const vp = page.viewportSize()
    if (box.y > vp.height || box.y + box.height < 0) continue
    return true
  }
  return false
}

async function assertNavigable(role, dests) {
  for (const { name, width, height } of WIDTHS) {
    await page.setViewportSize({ width, height })
    // The header nav scrolls horizontally in the 640-767 band; scroll it home so
    // a pass never depends on leftover scroll position from a previous width.
    await page.evaluate(() => {
      document.querySelectorAll('nav div').forEach((el) => { el.scrollLeft = 0 })
    })

    const missing = []
    for (const dest of dests) {
      if (!(await reachable(dest))) missing.push(dest)
    }
    await snap(page, `${role}-${name}`)
    if (missing.length) {
      throw new Error(
        `${role} at ${width}px (${name}) has no visible route to: ${missing.join(', ')} — ` +
        `this width has no navigation`
      )
    }
    log(`${role} @ ${width}px OK — all ${dests.length} destinations visible`)
  }
}

try {
  // ── Teacher ──
  await signIn('teacher@test.dev', /hello, ms\. ada/i)
  await assertNavigable('teacher', TEACHER_DESTS)

  // ── The links route, they are not just decoration ──
  await page.setViewportSize({ width: 768, height: 1024 })
  await page.getByRole('link', { name: 'Classroom', exact: true }).first().click()
  await page.waitForURL(/\/teacher\/classroom/, { timeout: 20000 })
  await page.getByRole('link', { name: 'Writing', exact: true }).first().click()
  await page.waitForURL(/\/teacher\/writing/, { timeout: 20000 })
  await snap(page, 'teacher-routed')
  log('teacher nav routes OK — Classroom then Writing on an iPad-width viewport')

  // The current destination must say so, or the nav is a row of identical links.
  // Waited for rather than sampled: aria-current still names the previous route for
  // the moment between the URL changing and React committing the new render.
  const current = page.locator('nav [aria-current="page"]:visible')
  try {
    await current.filter({ hasText: /writing/i }).first().waitFor({ timeout: 10000 })
  } catch {
    const marked = await current.allInnerTexts()
    throw new Error(`nav should mark Writing as the current page, marked: ${marked.join(', ') || 'nothing'}`)
  }
  log('active state OK — Writing marked aria-current')

  // ── Student ──
  await signIn('student@test.dev', /hello, sam/i)
  await assertNavigable('student', STUDENT_DESTS)

  log('FLOW_OK')
  writeFileSync(`${SHOTS}/navigation-console-errors.json`, JSON.stringify(errors, null, 2))
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
