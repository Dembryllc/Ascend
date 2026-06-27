import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '@/context/auth-context'
import { homeForRole } from '@/types'
import {
  BookOpen, CheckCircle2, Eye, MessageSquare, TrendingUp, Users,
  Volume2, PenLine, FileText, Smartphone, ShieldCheck, Sparkles,
  GraduationCap, Layers, ArrowRight,
} from 'lucide-react'

// ─── Persona tab data ─────────────────────────────────────────────────────────
const PERSONAS = [
  {
    id: 'teacher',
    label: '👩‍🏫 Teachers',
    headline: 'Know exactly where every student is — page by page.',
    sub: 'Upload any PDF, assign a writing task, and watch annotations roll in. No more "did you read it?" — you'll see who reacted, who was confused, and who stopped on page 3.',
    bullets: [
      'Upload any PDF and assign to your whole class in one click',
      'See every emoji reaction and written note per student, per page',
      'Assign scaffolded writing tasks with Guided or Independent support',
      'Add a custom writing prompt students see before they open the book',
      'View class-wide reading progress and completion rates',
      'Export student writing samples as PDF or Google Docs-compatible .docx',
    ],
    cta: 'Start free — no credit card',
    href: '/register',
    color: 'bg-blue-50 border-blue-200',
    accent: '#4A90D9',
  },
  {
    id: 'student',
    label: '🎒 Students',
    headline: 'Read smarter. Write better. Never lose your thoughts.',
    sub: 'React to what you're reading with a tap. Write your ideas right on the page. Your teacher sees your thinking — and your writing comes out polished.',
    bullets: [
      'Tap to react as you read — surprised, confused, love it, important',
      'Select any text and attach a written note without losing your place',
      'Hear the text read aloud in your ear while you follow along',
      'Writing tasks open right in the book — no switching apps',
      'Sentence starters and guided steps help you build stronger paragraphs',
      'Export your finished writing straight to PDF or Google Docs',
    ],
    cta: 'Join your classroom',
    href: '/register',
    color: 'bg-purple-50 border-purple-200',
    accent: '#9B7FD4',
  },
  {
    id: 'individual',
    label: '📚 Readers & Writers',
    headline: 'Annotate anything. Build your reading life.',
    sub: 'College student, self-learner, or lifelong reader — upload your own PDFs and build a personal annotated library. Your notes, your writing, your archive.',
    bullets: [
      'Upload any PDF to your personal bookshelf — no classroom needed',
      'React and annotate freely as you read and research',
      'Use the writing workspace to turn your notes into structured writing',
      'Read aloud feature lets you listen while you annotate',
      'Track your own reading progress and revisit past annotations',
      'Export polished writing drafts in seconds',
    ],
    cta: 'Create a free account',
    href: '/register',
    color: 'bg-green-50 border-green-200',
    accent: '#5BB974',
  },
]

// ─── Feature grid data ────────────────────────────────────────────────────────
const FEATURES = [
  {
    icon: <MessageSquare size={22} />,
    title: 'Emoji reactions + written notes',
    desc: '5 reaction types — surprise, think, love, important, question. Select any text, tap a reaction, add a note. Low friction, high signal.',
    color: 'bg-purple-50 text-[#9B7FD4]',
  },
  {
    icon: <PenLine size={22} />,
    title: 'Writing tasks & graphic organizers',
    desc: 'Teachers assign Paragraph Builder, Main Idea, Compare & Contrast, or Story Map. Students get guided steps, sentence starters, and scaffolded fields.',
    color: 'bg-blue-50 text-[#4A90D9]',
  },
  {
    icon: <Volume2 size={22} />,
    title: 'Text-to-speech read aloud',
    desc: 'Built-in read aloud plays the clearest available voice. Students can listen and follow along — great for struggling readers and accessibility.',
    color: 'bg-orange-50 text-[#F59E0B]',
  },
  {
    icon: <Eye size={22} />,
    title: 'Teacher annotation dashboard',
    desc: 'See every student's reactions and notes for any book. Filter by student, reaction type, or page. Deep-link straight to a student's work.',
    color: 'bg-teal-50 text-[#14B8A6]',
  },
  {
    icon: <TrendingUp size={22} />,
    title: 'Reading progress tracking',
    desc: 'Track time spent, pages reached, and completion % per student per book. No more guessing who finished — or who stopped on page 4.',
    color: 'bg-green-50 text-[#5BB974]',
  },
  {
    icon: <FileText size={22} />,
    title: 'Export to PDF & Google Docs',
    desc: 'Students export finished writing as PDF or .docx — opens directly in Google Docs. Teachers see writing samples in the annotation dashboard.',
    color: 'bg-pink-50 text-[#EC4899]',
  },
  {
    icon: <Users size={22} />,
    title: 'Classroom join codes',
    desc: 'Students join with a unique 6-letter code. Assign books to individual students or the whole class at once. Codes are guaranteed unique.',
    color: 'bg-yellow-50 text-[#E6A817]',
  },
  {
    icon: <Smartphone size={22} />,
    title: 'Mobile-first reading',
    desc: 'Full mobile experience with bottom navigation, touch-optimized text selection, and a floating emoji bar — works on any phone or tablet.',
    color: 'bg-indigo-50 text-[#6366F1]',
  },
  {
    icon: <ShieldCheck size={22} />,
    title: 'Built for student privacy',
    desc: 'FERPA-aware design. Student data is never sold or shared. Per-student Firestore rules ensure no student can see another's work.',
    color: 'bg-slate-50 text-[#64748B]',
  },
]

// ─── Animated annotation cards for hero ───────────────────────────────────────
const ANNOTATIONS = [
  { emoji: '😲', label: 'Surprise', note: '"I didn\'t expect Gatsby to have been watching Daisy\'s house the whole time."', page: 'p. 84' },
  { emoji: '🤔', label: 'Makes me think', note: '"What does the green light really represent? Is it hope or something darker?"', page: 'p. 89' },
  { emoji: '❤️', label: 'I love it', note: '"The description of the party feels chaotic in a beautiful way."', page: 'p. 41' },
]

// ─── Writing task preview ─────────────────────────────────────────────────────
const WRITING_STEPS = [
  { label: 'Topic Sentence', value: 'Fitzgerald uses the green light as a symbol of Gatsby\'s longing for a life he can never reach.', starter: 'In the novel...' },
  { label: 'Evidence 1', value: 'Gatsby reaches toward the green light across the bay in Chapter 1, even before Daisy\'s return.', starter: 'For example...' },
  { label: 'Analysis', value: 'The color green suggests hope, but its distance from Gatsby suggests that hope will always stay out of reach.', starter: 'This shows that...' },
]

export default function LandingPage() {
  const { profile, loading } = useAuth()
  const [activePersona, setActivePersona] = useState(0)

  if (!loading && profile) {
    return <Navigate to={homeForRole(profile.role)} replace />
  }

  const persona = PERSONAS[activePersona]

  return (
    <div className="min-h-screen bg-white">

      {/* ── Nav ─────────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-[#E5E7EB]">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-[#4A90D9] text-white p-1.5 rounded-lg">
              <BookOpen size={20} />
            </div>
            <span className="text-lg font-bold text-[#1A1D23]">Easy Annotate</span>
          </div>
          <nav className="hidden sm:flex items-center gap-1 text-sm text-[#4B5563] font-medium">
            <a href="#features" className="px-3 py-2 rounded-lg hover:bg-[#F3F4F6] transition-colors">Features</a>
            <Link to="/pricing" className="px-3 py-2 rounded-lg hover:bg-[#F3F4F6] transition-colors">Pricing</Link>
          </nav>
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

      {/* ── Hero ────────────────────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-4 pt-16 pb-20 md:pt-24 md:pb-28">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <span className="inline-flex items-center gap-1.5 bg-blue-50 text-[#4A90D9] text-sm font-bold px-3 py-1 rounded-full mb-5">
              <Sparkles size={14} />
              Read. React. Write. All in one place.
            </span>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-[#1A1D23] leading-tight mb-6">
              The reading tool that makes{' '}
              <span className="text-[#4A90D9]">thinking visible.</span>
            </h1>
            <p className="text-lg sm:text-xl text-[#4B5563] mb-8 leading-relaxed">
              Students annotate PDFs with emoji reactions and written notes. Teachers assign scaffolded writing tasks. Everyone exports polished work — built for classrooms, designed for any reader.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                to="/register"
                className="inline-flex items-center justify-center gap-2 bg-[#4A90D9] text-white font-bold px-8 py-4 rounded-xl hover:bg-[#357ABD] transition-colors text-base"
              >
                Start for free
                <ArrowRight size={18} />
              </Link>
              <Link
                to="/pricing"
                className="inline-flex items-center justify-center gap-2 border border-[#D1D5DB] text-[#4B5563] font-semibold px-8 py-4 rounded-xl hover:bg-[#F3F4F6] transition-colors text-base"
              >
                See pricing
              </Link>
            </div>
            <p className="text-sm text-[#9CA3AF] mt-4">No credit card required · 14-day free trial for teachers</p>
          </div>

          {/* Live annotation feed mock */}
          <div className="bg-[#F8F9FC] rounded-2xl border border-[#E5E7EB] p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
              <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
              <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
              <span className="ml-2 text-xs text-[#9CA3AF] font-mono">Teacher view — live annotations</span>
            </div>
            <div className="space-y-3">
              {ANNOTATIONS.map((item, i) => (
                <div
                  key={i}
                  className="bg-white rounded-xl p-4 flex items-start gap-3 shadow-sm border border-[#F3F4F6] transition-transform hover:-translate-y-0.5 hover:shadow-md"
                  style={{ animationDelay: `${i * 150}ms` }}
                >
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
            <p className="text-xs text-[#9CA3AF] mt-3 text-center">Student annotations — teachers see all of this in real time</p>
          </div>
        </div>
      </section>

      {/* ── Persona tabs ────────────────────────────────────────────────────── */}
      <section className="bg-[#F8F9FC] py-20">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-[#1A1D23] mb-2 text-center">Who it's for</h2>
          <p className="text-[#4B5563] text-center mb-10">Built for every kind of reader and writer.</p>

          {/* Tabs */}
          <div className="flex justify-center gap-2 mb-10 flex-wrap">
            {PERSONAS.map((p, i) => (
              <button
                key={p.id}
                onClick={() => setActivePersona(i)}
                className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
                  activePersona === i
                    ? 'bg-[#1A1D23] text-white shadow-sm'
                    : 'bg-white border border-[#E5E7EB] text-[#4B5563] hover:bg-white hover:border-[#4A90D9] hover:text-[#4A90D9]'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Panel */}
          <div className={`bg-white rounded-2xl border p-8 md:p-10 ${persona.color} transition-all`}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
              <div>
                <h3 className="text-2xl font-bold text-[#1A1D23] mb-3">{persona.headline}</h3>
                <p className="text-[#4B5563] mb-6 leading-relaxed">{persona.sub}</p>
                <Link
                  to={persona.href}
                  className="inline-flex items-center gap-2 text-white font-bold px-6 py-3 rounded-xl transition-colors text-sm"
                  style={{ backgroundColor: persona.accent }}
                >
                  {persona.cta}
                  <ArrowRight size={16} />
                </Link>
              </div>
              <ul className="space-y-3">
                {persona.bullets.map((b) => (
                  <li key={b} className="flex items-start gap-2.5 text-sm text-[#374151]">
                    <CheckCircle2 size={16} className="shrink-0 mt-0.5" style={{ color: persona.accent }} />
                    {b}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── Writing tool spotlight ───────────────────────────────────────────── */}
      <section className="py-20 max-w-6xl mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <span className="inline-flex items-center gap-1.5 bg-purple-50 text-[#9B7FD4] text-sm font-bold px-3 py-1 rounded-full mb-4">
              <PenLine size={14} />
              Writing Tasks
            </span>
            <h2 className="text-3xl font-bold text-[#1A1D23] mb-4">From reading to writing — without leaving the book.</h2>
            <p className="text-[#4B5563] mb-6 leading-relaxed">
              Teachers assign a writing task when they upload a book. Students see the task before they start reading and open the writing workspace directly from the page they're on.
            </p>
            <ul className="space-y-3 mb-6">
              {[
                { icon: <Layers size={15} />, text: '4 organizer templates: Paragraph Builder, Main Idea, Compare & Contrast, Story Map' },
                { icon: <GraduationCap size={15} />, text: 'Guided mode shows sentence starters; Independent mode shows labels only' },
                { icon: <PenLine size={15} />, text: 'Teacher adds a custom writing prompt students see throughout the reading' },
                { icon: <FileText size={15} />, text: 'Export finished writing as PDF or open in Google Docs' },
              ].map(({ icon, text }) => (
                <li key={text} className="flex items-start gap-2.5 text-sm text-[#374151]">
                  <span className="text-[#9B7FD4] shrink-0 mt-0.5">{icon}</span>
                  {text}
                </li>
              ))}
            </ul>
          </div>

          {/* Writing workspace mock */}
          <div className="bg-[#F8F9FC] rounded-2xl border border-[#E5E7EB] p-5">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
              <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
              <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
              <span className="ml-2 text-xs text-[#9CA3AF] font-mono">Paragraph Builder — Guided</span>
            </div>
            <div className="bg-purple-50 rounded-lg px-3 py-2 mb-4 text-xs text-[#9B7FD4] font-medium">
              ✍️ Writing prompt: Analyze how Fitzgerald uses a symbol to develop a theme in the novel.
            </div>
            <div className="space-y-3">
              {WRITING_STEPS.map((step, i) => (
                <div key={i} className="bg-white rounded-xl p-3.5 border border-[#F3F4F6]">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-[#1A1D23]">{step.label}</span>
                    <span className="text-xs text-[#9CA3AF] italic">Starter: "{step.starter}"</span>
                  </div>
                  <p className="text-xs text-[#4B5563] leading-relaxed">{step.value}</p>
                </div>
              ))}
            </div>
            <div className="flex gap-2 mt-4">
              <button className="flex-1 bg-[#9B7FD4] text-white text-xs font-bold py-2 rounded-lg hover:bg-[#8A6FC3] transition-colors">
                Export PDF
              </button>
              <button className="flex-1 border border-[#D1D5DB] text-[#4B5563] text-xs font-semibold py-2 rounded-lg hover:bg-[#F3F4F6] transition-colors">
                Open in Google Docs
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── Feature grid ────────────────────────────────────────────────────── */}
      <section id="features" className="bg-[#F8F9FC] py-20">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-[#1A1D23] mb-2 text-center">Everything in one place</h2>
          <p className="text-[#4B5563] text-center mb-12">Built for real classrooms and independent learners alike.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map(({ icon, title, desc, color }) => (
              <div
                key={title}
                className="bg-white rounded-2xl p-6 border border-[#F3F4F6] shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all"
              >
                <div className={`inline-flex p-2 rounded-xl mb-3 ${color}`}>{icon}</div>
                <h3 className="font-bold text-[#1A1D23] mb-1">{title}</h3>
                <p className="text-sm text-[#4B5563] leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ────────────────────────────────────────────────────── */}
      <section className="py-20 max-w-6xl mx-auto px-4">
        <h2 className="text-3xl font-bold text-[#1A1D23] mb-2 text-center">How it works</h2>
        <p className="text-[#4B5563] text-center mb-12">Three steps from PDF to insight.</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              step: '1',
              title: 'Upload your PDF',
              desc: 'Add any PDF — a novel chapter, a news article, a primary source. Teachers assign to a class; individual readers go straight to their bookshelf.',
              color: 'bg-blue-50 text-[#4A90D9]',
            },
            {
              step: '2',
              title: 'Read, react, and write',
              desc: 'Select text, tap a reaction, add a note. Use read aloud while you follow along. Open the writing workspace without losing your place.',
              color: 'bg-purple-50 text-[#9B7FD4]',
            },
            {
              step: '3',
              title: 'See the thinking, export the work',
              desc: 'Teachers see every annotation per student, per page, in real time. Students export polished writing to PDF or Google Docs in one click.',
              color: 'bg-green-50 text-[#5BB974]',
            },
          ].map(({ step, title, desc, color }) => (
            <div key={step} className="bg-[#F8F9FC] rounded-2xl p-6 border border-[#F3F4F6]">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg mb-4 ${color}`}>
                {step}
              </div>
              <h3 className="font-bold text-[#1A1D23] mb-2">{title}</h3>
              <p className="text-sm text-[#4B5563] leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Pricing teaser ──────────────────────────────────────────────────── */}
      <section className="bg-[#1A1D23] py-20">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-white mb-3">Free to start. Upgrade when you're ready.</h2>
          <p className="text-white/60 mb-6 leading-relaxed">
            The free plan includes 1 classroom, up to 30 students, and 5 books. Pro unlocks unlimited everything — classrooms, students, books, and PDF annotation export.
          </p>
          <p className="text-white/40 text-sm mb-8">All new teacher accounts include a 14-day free trial of Pro.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/register"
              className="inline-flex items-center justify-center gap-2 bg-[#F5C842] text-[#1A1D23] font-bold px-8 py-4 rounded-xl hover:bg-[#E6B93A] transition-colors"
            >
              Create a free account
              <ArrowRight size={18} />
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

      {/* ── Footer ──────────────────────────────────────────────────────────── */}
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
