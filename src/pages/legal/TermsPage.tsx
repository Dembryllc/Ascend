import { Link } from 'react-router-dom'
import { BookOpen } from 'lucide-react'

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#F8F9FC]">
      <header className="bg-white border-b border-[#E5E7EB] sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/login" className="flex items-center gap-2">
            <div className="bg-[#4A90D9] text-white p-1.5 rounded-lg">
              <BookOpen size={20} />
            </div>
            <span className="text-lg font-bold text-[#1A1D23]">Easy Annotate</span>
          </Link>
          <Link to="/login" className="text-sm text-[#4A90D9] font-semibold hover:underline">
            Back to sign in
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-[#1A1D23] mb-2">Terms of Service</h1>
        <p className="text-sm text-[#9CA3AF] mb-8">Last updated: May 29, 2026</p>

        <div className="space-y-8 text-[#1A1D23]">

          <section>
            <h2 className="text-xl font-bold mb-3">1. Acceptance of terms</h2>
            <p className="text-[#4B5563] leading-relaxed">
              By creating an account or using Easy Annotate ("the service"), you agree to these Terms of Service. If you are under 18, your parent, guardian, or school administrator must agree on your behalf. If you are a teacher using Easy Annotate for a classroom, you agree to these terms on behalf of your students.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">2. Educational use</h2>
            <p className="text-[#4B5563] leading-relaxed">
              Easy Annotate is designed for educational use. You may use the service to read assigned books, leave reading annotations, and review student engagement in a classroom setting. You may not use the service for any purpose that is unlawful, harmful, or outside the educational context it is intended for.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">3. Uploaded content</h2>
            <p className="text-[#4B5563] leading-relaxed">
              You are responsible for ensuring that any PDFs you upload comply with copyright law. Easy Annotate does not grant any rights to upload or distribute copyrighted material without authorization. Teachers and students may only upload content they own the rights to or have a valid license to use in an educational setting (such as under fair use or a purchased license).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">4. Account security</h2>
            <p className="text-[#4B5563] leading-relaxed">
              You are responsible for maintaining the confidentiality of your password. Do not share your account credentials with others. If you believe your account has been compromised, reset your password immediately using the "Forgot password?" link on the sign-in page.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">5. Service availability</h2>
            <p className="text-[#4B5563] leading-relaxed">
              We aim to keep Easy Annotate available at all times, but we do not guarantee uninterrupted access. The service may be unavailable during maintenance, updates, or due to factors outside our control (such as Firebase infrastructure issues). We are not liable for any loss resulting from service unavailability.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">6. Limitation of liability</h2>
            <p className="text-[#4B5563] leading-relaxed">
              Easy Annotate is provided "as is" without warranties of any kind. To the maximum extent permitted by law, Dembryllc is not liable for any indirect, incidental, or consequential damages arising from use of the service, including loss of data.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">7. Termination</h2>
            <p className="text-[#4B5563] leading-relaxed">
              We reserve the right to suspend or terminate accounts that violate these terms. You may delete your account at any time by contacting us. Upon termination, your data will be deleted within 30 days.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">8. Changes to terms</h2>
            <p className="text-[#4B5563] leading-relaxed">
              We may update these terms as the service evolves. Material changes will be communicated by updating the "Last updated" date above. Continued use of the service after changes constitutes acceptance of the updated terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">9. Contact</h2>
            <p className="text-[#4B5563] leading-relaxed">
              For questions about these terms, contact us at{' '}
              <a href="mailto:dembryllc@gmail.com" className="text-[#4A90D9] hover:underline">dembryllc@gmail.com</a>.
            </p>
          </section>

        </div>
      </main>

      <footer className="border-t border-[#E5E7EB] bg-white mt-16">
        <div className="max-w-4xl mx-auto px-4 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-[#9CA3AF]">
          <span>© 2026 Easy Annotate. All rights reserved.</span>
          <div className="flex gap-4">
            <Link to="/privacy" className="hover:text-[#4A90D9]">Privacy Policy</Link>
            <Link to="/terms" className="hover:text-[#4A90D9]">Terms of Service</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
