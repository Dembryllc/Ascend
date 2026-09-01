import { Link } from 'react-router-dom'
import { BookOpen } from 'lucide-react'
import { useAuth } from '@/context/auth-context'
import { homeForRole } from '@/types'

export default function AccessibilityPage() {
  const { profile } = useAuth()
  const homeLink = profile ? homeForRole(profile.role) : '/'

  return (
    <div className="min-h-screen bg-[#F8F9FC]">
      <header className="bg-white border-b border-[#E5E7EB] sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to={homeLink} className="flex items-center gap-2">
            <div className="bg-[#4A90D9] text-white p-1.5 rounded-lg">
              <BookOpen size={20} aria-hidden="true" />
            </div>
            <span className="text-lg font-bold text-[#1A1D23]">Easy Annotate</span>
          </Link>
          <Link to={homeLink} className="text-sm text-[#4A90D9] font-semibold hover:underline">
            {profile ? 'Back to dashboard' : 'Back to home'}
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-[#1A1D23] mb-2">Accessibility</h1>
        <p className="text-sm text-[#9CA3AF] mb-8">Last updated: September 1, 2026</p>

        <div className="prose prose-sm max-w-none space-y-8 text-[#1A1D23]">

          <section>
            <h2 className="text-xl font-bold mb-3">Our commitment</h2>
            <p className="text-[#4B5563] leading-relaxed mb-3">
              Easy Annotate was built by a classroom teacher for readers with a wide range of needs. Reading tools that only work for some students are not finished tools, so accessibility is part of how the product is built rather than something added at the end.
            </p>
            <p className="text-[#4B5563] leading-relaxed">
              This page describes what is working today, what is not, and how to reach us when something gets in your way. We would rather tell you about a real gap than let you discover it mid-lesson.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">What is built in today</h2>

            <h3 className="text-base font-bold mb-2 mt-4">Read aloud</h3>
            <p className="text-[#4B5563] leading-relaxed">
              Any page carrying real text can be read aloud. Easy Annotate picks the highest-quality English voice your device offers, reads at a slightly slowed pace, and highlights each word as it is spoken so readers can follow along. Reading stops when you turn the page, and there is a Stop button available at all times. On a page that is a scanned image, the button is turned off and the page explains why.
            </p>

            <h3 className="text-base font-bold mb-2 mt-4">Keyboard access</h3>
            <ul className="list-disc pl-5 space-y-2 text-[#4B5563]">
              <li>Left and right arrow keys turn pages in the reader.</li>
              <li>Escape closes the annotation panel and every writing dialog.</li>
              <li>Every focused control shows a high-contrast focus ring, so you can always see where you are.</li>
            </ul>

            <h3 className="text-base font-bold mb-2 mt-4">Reading and writing on any device</h3>
            <ul className="list-disc pl-5 space-y-2 text-[#4B5563]">
              <li>Text selection works with touch, not just a mouse — selecting text on a phone or tablet brings up a floating reaction bar.</li>
              <li>Buttons in the reader meet the 44&times;44 pixel touch-target size, so they can be hit reliably without fine motor control.</li>
              <li>Reactions carry an emoji and a written label, never color alone, so meaning does not depend on distinguishing colors.</li>
            </ul>

            <h3 className="text-base font-bold mb-2 mt-4">Motion and visual comfort</h3>
            <p className="text-[#4B5563] leading-relaxed">
              If your device is set to reduce motion, entrance animations turn off automatically. Body text starts at a 16-pixel base size and reflows when you zoom your browser.
            </p>

            <h3 className="text-base font-bold mb-2 mt-4">Screen readers</h3>
            <p className="text-[#4B5563] leading-relaxed">
              Icon-only buttons carry text labels for screen readers, decorative icons are hidden from them, and pages use real headings and landmarks rather than styled text. Screen reader support is genuinely usable but has not been through a formal audit — see the conformance section below.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">Where read aloud works best</h2>
            <p className="text-[#4B5563] leading-relaxed mb-3">
              Read aloud uses the speech voices built into your browser and device, so the experience is not identical everywhere. Word-by-word highlighting depends on a browser feature that not every browser reports.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b-2 border-[#E5E7EB] text-left">
                    <th className="py-2 pr-4 font-bold text-[#1A1D23]">Browser</th>
                    <th className="py-2 pr-4 font-bold text-[#1A1D23]">Reads aloud</th>
                    <th className="py-2 font-bold text-[#1A1D23]">Highlights each word</th>
                  </tr>
                </thead>
                <tbody className="text-[#4B5563]">
                  <tr className="border-b border-[#E5E7EB]">
                    <td className="py-2 pr-4">Chrome</td>
                    <td className="py-2 pr-4">Yes</td>
                    <td className="py-2">Yes</td>
                  </tr>
                  <tr className="border-b border-[#E5E7EB]">
                    <td className="py-2 pr-4">Edge</td>
                    <td className="py-2 pr-4">Yes</td>
                    <td className="py-2">Yes</td>
                  </tr>
                  <tr className="border-b border-[#E5E7EB]">
                    <td className="py-2 pr-4">Firefox</td>
                    <td className="py-2 pr-4">Yes</td>
                    <td className="py-2">No</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4">Safari (Mac and iPad)</td>
                    <td className="py-2 pr-4">Yes</td>
                    <td className="py-2">No</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-[#4B5563] leading-relaxed mt-3">
              Where highlighting is unavailable the page still reads aloud normally — you lose the visual tracking, not the audio. For the fullest experience on a school device, Chrome or Edge is the better choice.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">Known limitations</h2>
            <p className="text-[#4B5563] leading-relaxed mb-3">
              These are real gaps as of the date above. We list them so you can plan around them.
            </p>
            <ul className="list-disc pl-5 space-y-2 text-[#4B5563]">
              <li><strong>Read aloud and highlighting need a text layer.</strong> A PDF made by scanning or photographing pages is a picture of text, not text, so there is nothing underneath to speak or select. Easy Annotate detects these pages and says so, and turns the Read aloud button off rather than offering something that cannot work — emoji reactions and written notes still work normally on them. There is no OCR, so the fix is a PDF saved straight from a document rather than a scan.</li>
              <li><strong>PDF is the only supported format.</strong> Easy Annotate does not support DAISY, EPUB, or audiobook formats.</li>
              <li><strong>Voice quality depends on your device.</strong> We select the best available voice, but we cannot install voices. Older Chromebooks and some school-managed devices ship with noticeably more robotic voices than a current Mac or Windows machine.</li>
              <li><strong>There is no in-app text size control.</strong> Browser zoom works and text reflows correctly, but the app does not yet offer its own font-size setting.</li>
              <li><strong>There is no skip-to-content link yet.</strong> Keyboard and screen reader users currently tab through the header on each page.</li>
              <li><strong>Read aloud reads one page at a time.</strong> It does not continue automatically to the next page.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">Conformance status</h2>
            <p className="text-[#4B5563] leading-relaxed mb-3">
              We build toward <strong>WCAG 2.1 Level AA</strong> as our standard. We want to be precise about what that means right now:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-[#4B5563]">
              <li>Easy Annotate has <strong>not</strong> completed a formal third-party accessibility audit.</li>
              <li>We do <strong>not</strong> currently publish a VPAT or an Accessibility Conformance Report.</li>
              <li>We therefore describe WCAG 2.1 AA as a target we design against, not a conformance level we claim to have certified.</li>
            </ul>
            <p className="text-[#4B5563] leading-relaxed mt-3">
              If your school or district needs formal accessibility documentation as part of a purchasing review, contact us and we will tell you honestly where we stand rather than send a document we have not earned.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">Assistive technology you already use</h2>
            <p className="text-[#4B5563] leading-relaxed">
              Easy Annotate runs in a standard browser and does not override your device settings. Screen readers, operating-system magnification, high-contrast and dark modes, browser zoom, and switch or keyboard navigation all continue to work as they normally do. If a device-level tool you rely on stops behaving correctly inside Easy Annotate, that is a bug on our side — please report it.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">Tell us what is not working</h2>
            <p className="text-[#4B5563] leading-relaxed mb-3">
              Accessibility problems are treated as bugs, not feature requests. Email{' '}
              <a href="mailto:dembryllc@gmail.com?subject=Accessibility%20issue" className="text-[#4A90D9] hover:underline">dembryllc@gmail.com</a>{' '}
              and include whatever you can:
            </p>
            <ol className="list-decimal pl-5 space-y-2 text-[#4B5563]">
              <li>What you were trying to do, and what happened instead.</li>
              <li>The page or screen you were on.</li>
              <li>Your device, browser, and any assistive technology you were using.</li>
            </ol>
            <p className="text-[#4B5563] leading-relaxed mt-3">
              We aim to respond within five business days. Please do not include student names or other identifying details in your message — a description of the problem is enough.
            </p>
          </section>

        </div>
      </main>

      <footer className="border-t border-[#E5E7EB] bg-white mt-16">
        <div className="max-w-4xl mx-auto px-4 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-[#9CA3AF]">
          <span>&copy; 2026 Easy Annotate. All rights reserved.</span>
          <div className="flex gap-4">
            <Link to="/accessibility" className="hover:text-[#4A90D9]">Accessibility</Link>
            <Link to="/privacy" className="hover:text-[#4A90D9]">Privacy Policy</Link>
            <Link to="/terms" className="hover:text-[#4A90D9]">Terms of Service</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
