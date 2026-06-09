import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '@/context/auth-context'
import { BookOpen, CheckCircle2, Eye, MessageSquare, TrendingUp, Users } from 'lucide-react'

export default function LandingPage() {
  const { profile, loading } = useAuth()

  if (!loading && profile) {
    return <Navigate to={profile.role === 'teacher' ? '/teacher' : '/student'} replace />
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-[#E5E7EB]">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-[#4A90D9] text-white p-1.5 rounded-lg">
              <BookOpen size={20} />
            </div>
            <span className="text-lg font-bold text-[#1A1D23]">Easy Annotate</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login" className="text-sm font-semibold text-[#4B5563] hover:text-[#1A1D23] px-3 py-2 rounded-lg hover:bg-[#F3F4F6] transition-colors">
              Sign in
            </Link>
            <Link to="/register" className="text-sm font-bold bg-[#4A90D9] text-white px-4 py-2 rounded-xl hover:bg-[#357ABD] transition-colors">
              Sign up free
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-4 pt-16 pb-20 md:pt-24 md:pb-28">
        <div className="max-w-3xl">
          <span className="inline-block bg-blue-50 text-[#4A90D9] text-sm font-bold px-3 py-1 rounded-full mb-5">
            Free for teachers to start
          </span>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-[#1A1D23] leading-tight mb-6">
            Know what your students are thinking — <span className="text-[#4A90D9]">page by page.</span>
          </h1>
          <p className="text-lg sm:text-xl text-[#4B5563] mb-8 max-w-2xl leading-relaxed">
            Easy Annotate lets students react to assigned PDFs with emoji and written notes. Teachers see every reaction in real time — no more guessing who's confused, who's engaged, or who stopped reading on page 4.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              to="/register"
              className="inline-flex items-center justify-center gap-2 bg-[#4A90D9] text-white font-bold px-8 py-4 rounded-xl hover:bg-[#357ABD] transition-colors text-base"
            >
              Start for free
              <span aria-hidden>→</span>
            </Link>
            <Link
              to="/pricing"
              className="inline-flex items-center justify-center gap-2 border border-[#D1D5DB] text-[#4B5563] font-semibold px-8 py-4 rounded-xl hover:bg-[#F3F4F6] transition-colors text-base"
            >
              See pricing
            </Link>
          </div>
          <p className="text-sm text-[#9CA3AF] mt-4">No credit card required · Free up to 5 books</p>
        </div>

        {/* Mock product card */}
        <div className="mt-14 bg-[#F8F9FC] rounded-2xl border border-[#E5E7EB] p-6 max-w-2xl">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-3 h-3 rounded-full bg-red-400" />
            <div className="w-3 h-3 rounded-full bg-yellow-400" />
            <div className="w-3 h-3 rounded-full bg-green-400" />
            <span className="ml-2 text-xs text-[#9CA3AF] font-mono">easy-annotate.com/student/read/…</span>
          </div>
          <div className="space-y-3">
            {[
              { emoji: '😲', label: 'Surprise', note: '"I didn\'t expect Gatsby to have been watching Daisy\'s house the whole time."', page: 'p. 84' },
              { emoji: '🤔', label: 'Makes me think', note: '"What does the green light really represent? Is it hope or something darker?"', page: 'p. 89' },
              { emoji: '❤️', label: 'I love it', note: '"The description of the party feels chaotic in a beautiful way."', page: 'p. 41' },
            ].map((item, i) => (
              <div key={i} className="bg-white rounded-xl p-4 flex items-start gap-3 shadow-sm border border-[#F3F4F6]">
                <span className="text-2xl leading-none" aria-hidden>{item.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-sm font-bold text-[#1A1D23]">{item.label}</span>
                    <span className="text-xs text-[#9CA3AF] shrink-0">{item.page}</span>
                  </div>
                  <p className="text-sm text-[#4B5563] italic">{item.note}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-[#9CA3AF] mt-3 text-center">← actual student annotations, rendered live for the teacher</p>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-[#F8F9FC] py-20">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-[#1A1D23] mb-2 text-center">How it works</h2>
          <p className="text-[#4B5563] text-center mb-12">Three steps from PDF to insight.</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                step: '1',
                title: 'Teacher uploads a PDF',
                desc: 'Add any PDF — a novel chapter, a news article, a primary source. Set an optional reading prompt and success criteria.',
                color: 'bg-blue-50 text-[#4A90D9]',
              },
              {
                step: '2',
                title: 'Students annotate as they read',
                desc: 'Students select text and tap an emoji reaction — surprise, confusion, love, questions. Optional written note attached.',
                color: 'bg-purple-50 text-[#9B7FD4]',
              },
              {
                step: '3',
                title: 'Teacher sees everything',
                desc: 'View every annotation per student per page. See reading time, completion %, and which passages sparked the most reactions.',
                color: 'bg-green-50 text-[#5BB974]',
              },
            ].map(({ step, title, desc, color }) => (
              <div key={step} className="bg-white rounded-2xl p-6 shadow-sm border border-[#F3F4F6]">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg mb-4 ${color}`}>
                  {step}
                </div>
                <h3 className="font-bold text-[#1A1D23] mb-2">{title}</h3>
                <p className="text-sm text-[#4B5563] leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 max-w-6xl mx-auto px-4">
        <h2 className="text-3xl font-bold text-[#1A1D23] mb-2 text-center">Built for real classrooms</h2>
        <p className="text-[#4B5563] text-center mb-12">Everything you need, nothing you don't.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            { icon: <MessageSquare size={22} />, title: 'Emoji reactions + notes', desc: '5 reaction types — surprise, think, love, important, question. Students write 1–3 sentences max. Low friction, high signal.', color: 'bg-purple-50 text-[#9B7FD4]' },
            { icon: <Eye size={22} />, title: 'Teacher annotation view', desc: 'See every student\'s annotations for any book. Filter by student, reaction type, or page number.', color: 'bg-blue-50 text-[#4A90D9]' },
            { icon: <TrendingUp size={22} />, title: 'Reading progress', desc: 'Track time spent, pages reached, and completion % per student per book. No guessing who finished.', color: 'bg-green-50 text-[#5BB974]' },
            { icon: <Users size={22} />, title: 'Classroom join codes', desc: 'Students join with a 6-letter code. Assign books to individual students or the whole class at once.', color: 'bg-yellow-50 text-[#E6A817]' },
            { icon: <BookOpen size={22} />, title: 'Any PDF, any reading', desc: 'Upload novels, articles, textbook chapters — anything in PDF format up to 50 MB.', color: 'bg-pink-50 text-[#EC4899]' },
            { icon: <CheckCircle2 size={22} />, title: 'FERPA compliant', desc: 'Student data is never sold or used for advertising. Firestore security rules enforce per-student data isolation.', color: 'bg-teal-50 text-[#14B8A6]' },
          ].map(({ icon, title, desc, color }) => (
            <div key={title} className="bg-white rounded-2xl p-6 border border-[#F3F4F6] shadow-sm">
              <div className={`inline-flex p-2 rounded-xl mb-3 ${color}`}>{icon}</div>
              <h3 className="font-bold text-[#1A1D23] mb-1">{title}</h3>
              <p className="text-sm text-[#4B5563] leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing teaser */}
      <section className="bg-[#1A1D23] py-20">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-white mb-3">Free to start. Upgrade when you're ready.</h2>
          <p className="text-white/60 mb-8">The free plan includes 1 classroom, up to 30 students, and 5 books. Pro unlocks unlimited everything for $8/month.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/register"
              className="inline-flex items-center justify-center gap-2 bg-[#F5C842] text-[#1A1D23] font-bold px-8 py-4 rounded-xl hover:bg-[#E6B93A] transition-colors"
            >
              Create a free account
            </Link>
            <Link
              to="/pricing"
              className="inline-flex items-center justify-center gap-2 border border-white/20 text-white font-semibold px-8 py-4 rounded-xl hover:bg-white/10 transition-colors"
            >
              See all plans
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#E5E7EB] bg-white">
        <div className="max-w-6xl mx-auto px-4 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-[#9CA3AF]">
          <div className="flex items-center gap-2">
            <div className="bg-[#4A90D9] text-white p-1 rounded-md">
              <BookOpen size={14} />
            </div>
            <span className="font-semibold text-[#4B5563]">Easy Annotate</span>
            <span>· © 2026 Dembryllc</span>
          </div>
          <div className="flex gap-5">
            <Link to="/pricing" className="hover:text-[#4A90D9]">Pricing</Link>
            <Link to="/privacy" className="hover:text-[#4A90D9]">Privacy</Link>
            <Link to="/terms" className="hover:text-[#4A90D9]">Terms</Link>
            <a href="mailto:dembryllc@gmail.com" className="hover:text-[#4A90D9]">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
