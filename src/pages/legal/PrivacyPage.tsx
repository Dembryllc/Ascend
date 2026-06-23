import { Link } from 'react-router-dom'
import { BookOpen } from 'lucide-react'
import { useAuth } from '@/context/auth-context'
import { homeForRole } from '@/types'

export default function PrivacyPage() {
  const { profile } = useAuth()
  const homeLink = profile ? homeForRole(profile.role) : '/'

  return (
    <div className="min-h-screen bg-[#F8F9FC]">
      <header className="bg-white border-b border-[#E5E7EB] sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to={homeLink} className="flex items-center gap-2">
            <div className="bg-[#4A90D9] text-white p-1.5 rounded-lg">
              <BookOpen size={20} />
            </div>
            <span className="text-lg font-bold text-[#1A1D23]">Easy Annotate</span>
          </Link>
          <Link to={homeLink} className="text-sm text-[#4A90D9] font-semibold hover:underline">
            {profile ? 'Back to dashboard' : 'Back to home'}
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-[#1A1D23] mb-2">Privacy Policy</h1>
        <p className="text-sm text-[#9CA3AF] mb-8">Last updated: May 29, 2026</p>

        <div className="prose prose-sm max-w-none space-y-8 text-[#1A1D23]">

          <section>
            <h2 className="text-xl font-bold mb-3">Who we are</h2>
            <p className="text-[#4B5563] leading-relaxed">
              Easy Annotate ("we", "our", "the service") is an educational reading annotation tool operated by Dembryllc. We help students engage with assigned readings through emoji-based reactions and written notes, and help teachers review student engagement.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">What data we collect</h2>
            <p className="text-[#4B5563] leading-relaxed mb-3">We collect only the data necessary to provide the service:</p>
            <ul className="list-disc pl-5 space-y-2 text-[#4B5563]">
              <li><strong>Teacher accounts:</strong> full name, email address, and classroom data. Email is stored to enable account recovery and (when applicable) billing.</li>
              <li><strong>Student accounts:</strong> a chosen display name (first name or nickname — we encourage students not to use their full name) and role. Student email addresses are used only for login authentication and are <strong>not</strong> stored in our database.</li>
              <li><strong>Reading activity:</strong> which pages a student has visited, how many minutes they spent reading, and their completion percentage per book.</li>
              <li><strong>Annotations:</strong> emoji reactions and optional written notes students leave on specific pages of assigned books.</li>
              <li><strong>Uploaded content:</strong> PDF files uploaded by teachers or students. Files are stored in Google Firebase Storage.</li>
            </ul>
            <p className="text-[#4B5563] leading-relaxed mt-3">
              We do not collect payment information directly. We do not use advertising trackers. We do not sell student data to any third party.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">How we use data</h2>
            <ul className="list-disc pl-5 space-y-2 text-[#4B5563]">
              <li>To authenticate users and maintain accounts.</li>
              <li>To display a student's own annotations and reading progress to them.</li>
              <li>To display classroom students' annotations and progress to their assigned teacher.</li>
              <li>To generate PDF exports of annotations when requested by a teacher.</li>
              <li>To send password-reset emails when requested.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">Data storage and security</h2>
            <p className="text-[#4B5563] leading-relaxed">
              All data is stored in Google Firebase (project: <code className="bg-[#F3F4F6] px-1 rounded">ascend-annotate</code>), which is hosted in the United States. Firebase provides encryption at rest and in transit. Access to student annotation data is restricted by Firestore security rules so that only the student who created an annotation and their assigned teacher can read it.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">FERPA and student records</h2>
            <p className="text-[#4B5563] leading-relaxed mb-3">
              Easy Annotate is designed for use in K-12 and higher-education classrooms. We are committed to complying with the Family Educational Rights and Privacy Act (FERPA).
            </p>
            <ul className="list-disc pl-5 space-y-2 text-[#4B5563]">
              <li><strong>Purpose limitation:</strong> student data is used solely for educational purposes within the teacher-student relationship.</li>
              <li><strong>No third-party disclosure:</strong> we do not disclose student education records to any third party without consent from the school or parent.</li>
              <li><strong>PII minimization by design:</strong> student email addresses are not stored in our Firestore database — only in Firebase Authentication, which is isolated from the annotation and progress data. Students are encouraged to register with a first name or nickname rather than their full name.</li>
              <li><strong>Teacher access is scoped:</strong> teachers can only view annotations and progress for students in their own classroom. No cross-classroom access exists.</li>
              <li><strong>Deletion on request:</strong> schools or authorized administrators may request deletion of all student records associated with their institution by contacting us at the address below. We will process requests within 30 days.</li>
            </ul>
            <p className="text-[#4B5563] leading-relaxed mt-3">
              Schools and districts that use Easy Annotate act as the educational authority governing their students' data under FERPA.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">Children's privacy (COPPA)</h2>
            <p className="text-[#4B5563] leading-relaxed">
              Easy Annotate is intended for use in educational settings and may be used by students under 13 only when authorized and supervised by a school or teacher. We do not knowingly collect personal information from children under 13 without verifiable parental or school consent. If you believe a child under 13 has created an account without proper authorization, contact us at the email below and we will delete the account.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">Data retention and deletion</h2>
            <p className="text-[#4B5563] leading-relaxed mb-3">
              Account data is retained while the account is active. We will process deletion requests within 30 days of receipt:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-[#4B5563]">
              <li><strong>Student records:</strong> all Firestore documents (profile, annotations, reading progress) are permanently deleted within 30 days of a verified deletion request.</li>
              <li><strong>Uploaded PDFs:</strong> files in Firebase Storage are deleted along with their associated Firestore metadata.</li>
              <li><strong>Firebase Authentication:</strong> the Firebase Auth account is also deleted, removing the login credential and any email address held there.</li>
              <li><strong>Backups:</strong> Firebase automated backups are retained for up to 7 days. Deleted records may persist in those backups until the backup window expires.</li>
              <li><strong>Teachers</strong> may request deletion of all student records in their classroom by emailing us. Schools and districts may request deletion of all data associated with their institution.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">Data breach notification</h2>
            <p className="text-[#4B5563] leading-relaxed">
              In the event of a security incident affecting student education records, we will notify affected schools and districts within 30 days of discovering the breach. Schools are responsible for notifying students, parents, and applicable state or federal agencies as required by FERPA and applicable law. Notification will be sent to the primary contact email on the affected teacher account.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">Third-party services</h2>
            <ul className="list-disc pl-5 space-y-2 text-[#4B5563]">
              <li><strong>Google Firebase</strong> (Alphabet Inc.) — authentication, Firestore database, and file storage. Data is hosted in the United States. Firebase's privacy policy is available at firebase.google.com.</li>
              <li><strong>Stripe</strong> — payment processing for Pro subscriptions. Stripe stores billing information directly; Easy Annotate does not store payment card data. Stripe's privacy policy is available at stripe.com/privacy. Student data is never shared with Stripe.</li>
            </ul>
            <p className="text-[#4B5563] leading-relaxed mt-3">
              We do not use advertising networks, social media trackers, analytics SDKs, or any other third-party services that process user data beyond those listed above.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">Contact and data processing agreements</h2>
            <p className="text-[#4B5563] leading-relaxed mb-3">
              For privacy questions, data deletion requests, FERPA inquiries, or to request a Data Processing Addendum (DPA) for your school or district, contact us at{' '}
              <a href="mailto:dembryllc@gmail.com" className="text-[#4A90D9] hover:underline">dembryllc@gmail.com</a>.
            </p>
            <p className="text-[#4B5563] leading-relaxed">
              Districts and schools with specific compliance requirements may request a signed DPA or custom terms addendum via the same address.
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
