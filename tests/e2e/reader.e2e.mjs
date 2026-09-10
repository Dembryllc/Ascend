// Full-screen reading, and the teacher's own reader.
//
// Two features, one flow, because they meet in the same place: the reader.
//
// 1. FULL SCREEN. The Fullscreen API promotes the fullscreened element to the
//    browser's top layer and stops painting everything outside it. That is why
//    ReadingPage fullscreens its ROOT element rather than the PDF — put the
//    request on the PDF and the floating emoji bar, the annotation panel and the
//    writing-task modal all vanish while looking perfectly fine in the DOM. This
//    flow selects text while full screen and asserts the emoji bar is genuinely
//    visible, which is the only assertion that catches that mistake. It asserts
//    the CSS state rather than document.fullscreenElement on purpose: headless
//    Chromium may refuse the request, and the CSS fallback must carry the same
//    layout when it does — the same fallback iPhone Safari always gets.
//
// 2. THE TEACHER READER. /teacher/read/:bookId is the same component, so the
//    risk is rules-shaped rather than visual: a teacher's annotation is written
//    with their own uid as studentId and classroomId null, and it only works
//    because canReadBook already accepts the book's uploader. The flow saves one,
//    reloads to prove it reached Firestore rather than local state, and checks
//    the student's own notes page never shows it.
import { chromium } from 'playwright'
import { mkdirSync, writeFileSync } from 'node:fs'

const BASE = process.argv[2] || 'http://127.0.0.1:5173'
const SHOTS = process.argv[3] || 'e2e-shots'
mkdirSync(SHOTS, { recursive: true })

const log = (...a) => console.log('[e2e:reader]', ...a)
let shot = 0
async function snap(page, name) {
  shot += 1
  const file = `${SHOTS}/reader-${String(shot).padStart(2, '0')}-${name}.png`
  await page.screenshot({ path: file })
  log('screenshot', file)
}

const TEACHER_NOTE = 'Stop here and ask what changed for her.'

const EXECUTABLE = process.env.PW_CHROMIUM || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
const browser = await chromium.launch({ executablePath: EXECUTABLE })
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } })
const page = await ctx.newPage()
const errors = []
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message))

// Every route in this app is a React.lazy() chunk, and lazy() never retries. One
// reset connection to the dev server therefore parks the Suspense boundary on
// "Loading…" forever — an infrastructure hiccup that looks exactly like a broken
// page. Reload and try again rather than failing the flow over it.
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

// There is no /logout route — signing out is the header button on any AppShell
// page. Without it /login just redirects back to the signed-in user's home.
async function signOut() {
  const button = page.getByRole('button', { name: /sign out/i }).first()
  await gotoStable('/teacher', () => button, 20000)
  await button.click()
  await page.waitForURL(/\/login$/, { timeout: 20000 })
}

async function signIn(email) {
  await gotoStable('/login', () => page.locator('#email'))
  await page.locator('#email').fill(email)
  await page.locator('#password').fill('test1234')
  await page.getByRole('button', { name: /sign in|log in/i }).first().click()
  await page.waitForURL(/\/(teacher|student)$/, { timeout: 20000 })
}

// Drag across the rendered text spans, the way a reader selects a passage.
async function selectSomeText() {
  const spans = page.locator('.react-pdf__Page__textContent span')
  const count = await spans.count()
  if (count < 2) return ''
  const a = await spans.nth(0).boundingBox()
  const b = await spans.nth(Math.min(2, count - 1)).boundingBox()
  if (!a || !b) return ''
  await page.mouse.move(a.x + 2, a.y + a.height / 2)
  await page.mouse.down()
  await page.mouse.move(b.x + b.width - 2, b.y + b.height / 2, { steps: 25 })
  await page.mouse.up()
  await page.waitForTimeout(500)
  return await page.evaluate(() => (window.getSelection()?.toString() ?? '').trim())
}

try {
  // ══ 1. The teacher reaches the reader from their own library ══════════════
  await signIn('teacher@test.dev')
  const openBook = page.getByRole('link', { name: /read & annotate/i }).first()
  await openBook.waitFor({ timeout: 20000 })
  await openBook.click()
  await page.waitForURL(/\/teacher\/read\//, { timeout: 20000 })
  await page.locator('.react-pdf__Page__canvas').waitFor({ timeout: 30000 })
  await page.waitForTimeout(1500)
  await snap(page, 'teacher-reader')
  log('teacher reader opened at', page.url())

  // Reading progress measures a learner, so the teacher must not be offered it —
  // and must not be quietly written into their own class's progress data.
  if (await page.getByRole('button', { name: /mark complete/i }).count() > 0) {
    throw new Error('the teacher reader offers Mark Complete — teachers are not tracked readers')
  }
  await page.getByText(/these notes are yours alone/i).waitFor({ timeout: 10000 })
  log('teacher reader OK — no progress tracking, privacy of the notes stated')

  // ══ 2. The teacher saves a note, and it reaches Firestore ═════════════════
  await page.getByRole('button', { name: 'Important', exact: true }).first().click()
  const panel = page.locator('div').filter({ hasText: /^Add Annotation — Page/ }).last()
  await panel.locator('textarea').first().fill(TEACHER_NOTE)
  await page.getByRole('button', { name: /^save$/i }).first().click()
  await page.getByText(TEACHER_NOTE).first().waitFor({ timeout: 15000 })
  await snap(page, 'teacher-note-saved')

  // A reload is the assertion that matters: a rules rejection would have left
  // the note in React state and nowhere else.
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.locator('.react-pdf__Page__canvas').waitFor({ timeout: 30000 })
  await page.getByText(TEACHER_NOTE).first().waitFor({ timeout: 20000 })
  log('teacher note OK — survived a reload, so the write reached Firestore')

  // ══ 3. Full screen, as the teacher ════════════════════════════════════════
  await page.getByRole('button', { name: /read in full screen/i }).click()
  await page.getByRole('button', { name: /exit full screen/i }).waitFor({ timeout: 10000 })
  await page.waitForTimeout(1200)

  // The sidebar is gone; the page and the emoji bar are not.
  if (await page.getByRole('heading', { name: /your notes on this book/i }).isVisible().catch(() => false)) {
    throw new Error('the annotation sidebar is still visible in full screen')
  }
  const canvas = await page.locator('.react-pdf__Page__canvas').boundingBox()
  const viewport = page.viewportSize()
  if (!canvas) throw new Error('no page rendered in full screen')
  if (canvas.height > viewport.height) {
    throw new Error(`full screen defaults to fit-page, but the page is ${Math.round(canvas.height)}px tall in a ${viewport.height}px viewport`)
  }
  if (!(await page.getByRole('button', { name: 'Important', exact: true }).first().isVisible())) {
    throw new Error('the emoji toolbar is not visible in full screen')
  }
  await snap(page, 'fullscreen')
  log(`full screen OK — page ${Math.round(canvas.width)}x${Math.round(canvas.height)} inside ${viewport.width}x${viewport.height}`)

  // ══ 4. Selecting text in full screen still raises the emoji bar ═══════════
  // The top-layer assertion: an element outside the fullscreened root would be
  // in the DOM, laid out, and completely unpainted.
  const selected = await selectSomeText()
  if (selected.length < 5) throw new Error(`could not select text in full screen (got ${selected.length} chars)`)
  const floatingBar = page.getByRole('button', { name: /^dismiss$/i })
  await floatingBar.waitFor({ state: 'visible', timeout: 8000 })
  await snap(page, 'fullscreen-selection')
  log('selection OK in full screen — the floating emoji bar is painted, not just present')

  // Escape leaves full screen — the browser handles it in real fullscreen, the
  // page handles it under the CSS fallback. Either way the sidebar comes back.
  await floatingBar.click()
  await page.keyboard.press('Escape')
  await page.getByRole('button', { name: /read in full screen/i }).waitFor({ timeout: 10000 })
  await page.getByRole('heading', { name: /your notes on this book/i }).waitFor({ state: 'visible', timeout: 10000 })
  log('Escape OK — back to the normal reader')

  // ══ 5. Full screen for a student, on their own book ═══════════════════════
  await signOut()
  await signIn('student@test.dev')
  await gotoStable('/student/read/bookText', () => page.locator('.react-pdf__Page__canvas'), 30000)
  await page.getByRole('button', { name: /read in full screen/i }).click()
  await page.getByRole('button', { name: /exit full screen/i }).waitFor({ timeout: 10000 })
  await page.waitForTimeout(1200)
  if (await page.getByRole('heading', { name: /annotation sidebar/i }).isVisible().catch(() => false)) {
    throw new Error('the student sidebar is still visible in full screen')
  }
  await snap(page, 'student-fullscreen')
  await page.keyboard.press('Escape')
  await page.getByRole('button', { name: /read in full screen/i }).waitFor({ timeout: 10000 })
  log('student full screen OK')

  // ══ 6. The teacher's note is not the student's note ═══════════════════════
  await gotoStable('/student/annotations', () => page.getByRole('heading', { name: /my notes|annotations/i }).first())
  await page.waitForTimeout(2500)
  if (await page.getByText(TEACHER_NOTE).count() > 0) {
    throw new Error("the teacher's private note is showing on the student's notes page")
  }
  await snap(page, 'student-notes')
  log("scoping OK — the teacher's note does not appear in the student's notes")

  log('FLOW_OK')
  writeFileSync(`${SHOTS}/reader-console-errors.json`, JSON.stringify(errors, null, 2))
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
