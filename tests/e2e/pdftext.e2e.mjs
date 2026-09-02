// Image-only (scanned/photographed) PDF regression flow.
//
// Highlighting and Read aloud both need the PDF's text layer. A scan, a phone
// photo, or a design-tool export is a picture with no text underneath, so both
// silently did nothing and the book looked broken. The reader now detects that
// and says so. This drives the same colourful page twice — once with a real
// text layer, once rasterised — and asserts each behaves as intended.
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const BASE = process.argv[2] || 'http://127.0.0.1:5173'
const SHOTS = process.argv[3] || 'e2e-shots'
mkdirSync(SHOTS, { recursive: true })
const log = (...a) => console.log('[e2e:pdftext]', ...a)

const EXECUTABLE = process.env.PW_CHROMIUM || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
const browser = await chromium.launch({ executablePath: EXECUTABLE })
const ctx = await browser.newContext({ viewport: { width: 1280, height: 1000 } })
const page = await ctx.newPage()
page.on('console', (m) => { if (m.type() === 'error') log('console-error:', m.text()) })

async function probe(bookId, label) {
  await page.goto(`${BASE}/student/read/${bookId}`, { waitUntil: 'domcontentloaded' })
  await page.locator('.react-pdf__Page__canvas').waitFor({ timeout: 30000 })
  await page.waitForTimeout(2500)

  const spans = await page.locator('.react-pdf__Page__textContent span').count()
  const banner = await page.getByText(/this page has no text layer yet/i).count()
  const readAloudDisabled = await page.getByRole('button', { name: /read page aloud/i }).first().isDisabled()

  // Select the way a student does: drag across the rendered text spans.
  const spanEls = page.locator('.react-pdf__Page__textContent span')
  let selected = ''
  if (spans > 1) {
    const a = await spanEls.nth(0).boundingBox()
    const b = await spanEls.nth(Math.min(2, spans - 1)).boundingBox()
    if (a && b) {
      await page.mouse.move(a.x + 2, a.y + a.height / 2)
      await page.mouse.down()
      await page.mouse.move(b.x + b.width - 2, b.y + b.height / 2, { steps: 25 })
      await page.mouse.up()
      await page.waitForTimeout(500)
      selected = await page.evaluate(() => (window.getSelection()?.toString() ?? '').trim())
    }
  } else {
    // Nothing to select — drag across the page image the way a student would try.
    const box = await page.locator('.react-pdf__Page__canvas').boundingBox()
    await page.mouse.move(box.x + 60, box.y + 180)
    await page.mouse.down()
    await page.mouse.move(box.x + box.width - 60, box.y + 300, { steps: 25 })
    await page.mouse.up()
    await page.waitForTimeout(500)
    selected = await page.evaluate(() => (window.getSelection()?.toString() ?? '').trim())
  }
  const floatingBar = await page.getByRole('button', { name: /add a note/i }).count()

  // Read aloud
  let status = 'button disabled'
  if (!readAloudDisabled) {
    await page.getByRole('button', { name: /read page aloud/i }).first().click()
    await page.waitForTimeout(2500)
    status = (await page.locator('p.text-center.text-xs').allTextContents()).join(' | ')
  }

  // Page-level emoji reaction — does it still save with no text layer?
  await page.getByRole('button', { name: /^stop reading$/i }).count().then(async (n) => { if (n) await page.getByRole('button', { name: /^stop reading$/i }).click() })
  let emoji = 'not-tried'
  try {
    await page.getByRole('button', { name: 'Makes Me Think', exact: true }).first().click({ timeout: 8000 })
    const modal = page.locator('div').filter({ hasText: /^Add Annotation — Page/ }).last()
    await modal.locator('textarea').first().fill('A note typed by hand, no text selected.')
    await page.getByRole('button', { name: /^save$/i }).first().click({ timeout: 8000 })
    await page.getByText(/you annotated this page/i).first().waitFor({ timeout: 12000 })
    emoji = 'SAVED'
  } catch (e) { emoji = 'FAILED: ' + e.message.split('\n')[0] }

  await page.screenshot({ path: `${SHOTS}/pdf-${label}.png`, fullPage: true })
  log(`${label.padEnd(5)} textLayerSpans=${String(spans).padEnd(4)} selectedChars=${String(selected.length).padEnd(4)} banner=${banner} readAloudDisabled=${readAloudDisabled} readAloud=${JSON.stringify(status)} emojiAnnotation=${emoji}`)
  return { spans, selected: selected.length, banner, readAloudDisabled, emoji }
}

try {
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' })
  await page.locator('input[type=email]').fill('student@test.dev')
  await page.locator('input[type=password]').fill('test1234')
  await page.getByRole('button', { name: /sign in/i }).click()
  await page.waitForURL(/\/student/, { timeout: 20000 })

  const text = await probe('bookText', 'text')
  const scan = await probe('bookScan', 'scan')

  const fail = []
  // A normal text PDF must keep working exactly as before.
  if (text.spans === 0) fail.push('text PDF rendered no text layer')
  if (text.selected < 20) fail.push(`text PDF selection too short (${text.selected} chars)`)
  if (text.banner !== 0) fail.push('text PDF wrongly flagged as a picture')
  if (text.readAloudDisabled) fail.push('read aloud disabled on a text PDF')
  if (text.emoji !== 'SAVED') fail.push(`emoji annotation failed on text PDF: ${text.emoji}`)
  // An image-only PDF must explain itself rather than fail silently.
  if (scan.spans !== 0) fail.push('scan fixture unexpectedly has a text layer')
  if (scan.banner === 0) fail.push('no "no text layer" notice on an image-only page')
  if (!scan.readAloudDisabled) fail.push('read aloud still offered on an image-only page')
  if (scan.emoji !== 'SAVED') fail.push(`emoji + note must still work on an image-only page: ${scan.emoji}`)
  if (fail.length) throw new Error(fail.join('; '))

  log('FLOW_OK')
  await browser.close()
  process.exit(0)
} catch (err) {
  log('PROBE_FAILED:', err.message)
  await page.screenshot({ path: `${SHOTS}/pdf-FAILURE.png`, fullPage: true })
  await browser.close()
  process.exit(1)
}
