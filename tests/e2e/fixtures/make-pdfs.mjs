// Regenerates the two E2E fixture PDFs. Run from the repo root:
//   node tests/e2e/fixtures/make-pdfs.mjs tests/e2e/fixtures
// Builds two COLOUR pdfs of the identical page:
//   text-color.pdf  — real text layer (Chromium print-to-PDF)
//   scan-color.pdf  — the same page rasterised to a JPEG and wrapped in a PDF
//                     (what a scanner, a phone photo, or a Canva/design export gives you)
import { chromium } from 'playwright'
import { writeFileSync } from 'node:fs'
import { jsPDF } from 'jspdf'

const HTML = `<html><body style="margin:0;width:816px;height:1056px;
  background:linear-gradient(160deg,#fde68a,#fca5a5 45%,#a5b4fc);font-family:Georgia,serif;padding:64px;box-sizing:border-box">
  <h1 style="color:#7c2d12;font-size:40px">The Reef at Night</h1>
  <p style="font-size:22px;line-height:1.6;color:#1f2937">
    When the sun slipped under the water, the reef began to glow. Tiny lanternfish
    drifted between the corals like sparks from a campfire. Nila held her breath and
    counted them, one by one, until she lost track somewhere past thirty.</p>
  <p style="font-size:22px;line-height:1.6;color:#1f2937">
    Her father said the reef was oldest thing either of them would ever touch. Nila
    believed him. It felt patient, the way mountains feel patient.</p>
</body></html>`

const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' })
const page = await browser.newPage({ viewport: { width: 816, height: 1056 } })
await page.setContent(HTML)

// 1. real text layer
const pdfBytes = await page.pdf({ width: '816px', height: '1056px', printBackground: true })
writeFileSync(process.argv[2] + '/text-color.pdf', pdfBytes)

// 2. image-only: same page, rasterised
const png = await page.screenshot({ type: 'jpeg', quality: 85 })
await browser.close()

const doc = new jsPDF({ unit: 'px', format: [816, 1056] })
doc.addImage('data:image/jpeg;base64,' + png.toString('base64'), 'JPEG', 0, 0, 816, 1056)
writeFileSync(process.argv[2] + '/scan-color.pdf', Buffer.from(doc.output('arraybuffer')))
console.log('built both')
