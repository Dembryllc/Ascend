/* Hallmark · macrostructure: Marquee Hero (show-the-product) · genre: playful
 * tone: warm-credible (K-12 + independent readers) · anchor hue: cool (brand blue)
 * theme: brand-on-warm-paper · display: Fraunces · body: Inter
 * enrichment: Tier-A CSS art (annotated book page) · no fake browser chrome
 * pre-emit critique: P5 H5 E4 S5 R4 V4
 */
import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '@/context/auth-context'
import { homeForRole } from '@/types'
import {
  BookOpen, CheckCircle2, Eye, MessageSquare, TrendingUp, Users,
  Volume2, PenLine, FileText, Smartphone, ShieldCheck,
  GraduationCap, Layers, ArrowRight, Highlighter,
} from 'lucide-react'

// ─── Persona tab data ─────────────────────────────────────────────────────────
const PERSONAS = [
  {
    id: 'teacher',
    label: '👩‍🏫 Teachers',
    headline: 'Know exactly where every student is — page by page.',
    sub: "Upload any PDF, assign a writing task, and watch annotations roll in. No more 'did you read it?' — you'll see who reacted, who was confused, and who stopped on page 3.",
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
    accent: 'var(--color-brand-blue)',
  },
  {
    id: 'student',
    label: '🎒 Students',
    headline: 'Read smarter. Write better. Never lose your thoughts.',
    sub: "React to what you're reading with a tap. Write your ideas right on the page. Your teacher sees your thinking — and your writing comes out polished.",
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
    accent: 'var(--color-brand-purple)',
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
    accent: 'var(--color-brand-green)',
  },
]

// ─── Feature grid data ────────────────────────────────────────────────────────
const FEATURES = [
  {
    icon: <MessageSquare size={20} />,
    title: 'Emoji reactions + written notes',
    desc: '5 reaction types — surprise, think, love, important, question. Select text, tap a reaction, add a note. Low friction, high signal.',
  },
  {
    icon: <PenLine size={20} />,
    title: 'Writing tasks & graphic organizers',
    desc: 'Assign Paragraph Builder, Main Idea, Compare & Contrast, or Story Map. Students get guided steps, sentence starters, and scaffolded fields.',
  },
  {
    icon: <Volume2 size={20} />,
    title: 'Text-to-speech read aloud',
    desc: 'Built-in read aloud plays the clearest available voice. Students listen and follow along — great for struggling readers and accessibility.',
  },
  {
    icon: <Eye size={20} />,
    title: 'Teacher annotation dashboard',
    desc: "See every student's reactions and notes for any book. Filter by student, reaction type, or page. Deep-link straight to a student's work.",
  },
  {
    icon: <TrendingUp size={20} />,
    title: 'Reading progress tracking',
    desc: 'Track time spent, pages reached, and completion per student per book. No more guessing who finished — or who stopped on page 4.',
  },
  {
    icon: <FileText size={20} />,
    title: 'Export to PDF & Google Docs',
    desc: 'Students export finished writing as PDF or .docx — opens directly in Google Docs. Teachers see writing samples in the dashboard.',
  },
  {
    icon: <Users size={20} />,
    title: 'Classroom join codes',
    desc: 'Students join with a unique 6-letter code. Assign books to individual students or the whole class at once. Codes are guaranteed unique.',
  },
  {
    icon: <Smartphone size={20} />,
    title: 'Mobile-first reading',
    desc: 'Full mobile experience with bottom navigation, touch-optimized text selection, and a floating emoji bar — works on any phone or tablet.',
  },
  {
    icon: <ShieldCheck size={20} />,
    title: 'Built for student privacy',
    desc: "FERPA-aware design. Student data is never sold or shared. Per-student rules ensure no student can see another's work.",
  },
]

const WRITING_STEPS = [
  { label: 'Topic Sentence', value: "Fitzgerald uses the green light as a symbol of Gatsby's longing for a life he can never reach.", starter: 'In the novel…' },
  { label: 'Evidence', value: "Gatsby reaches toward the green light across the bay in Chapter 1, even before Daisy's return.", starter: 'For example…' },
  { label: 'Analysis', value: 'The color green suggests hope, but its distance suggests that hope will always stay out of reach.', starter: 'This shows that…' },
]

export default function LandingPage() {
  const { profile, loading } = useAuth()
  const [activePersona, setActivePersona] = useState(0)

  if (!loading && profile) {
    return <Navigate to={homeForRole(profile.role)} replace />
  }

  const persona = PERSONAS[activePersona]

  return (
    <div className="min-h-screen bg-paper text-text-primary overflow-x-clip">

      {/* ── Nav ─────────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-paper/85 backdrop-blur-md border-b border-border-warm">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="bg-brand-blue text-white p-1.5 rounded-lg">
              <BookOpen size={20} />
            </div>
            <span className="hidden min-[360px]:inline text-base sm:text-lg font-bold tracking-tight whitespace-nowrap">Easy Annotate</span>
          </div>
          <nav className="hidden sm:flex items-center gap-1 text-sm text-text-secondary font-medium">
            <a href="#how" className="px-3 py-2 rounded-lg hover:bg-paper-2 transition-colors">How it works</a>
            <a href="#features" className="px-3 py-2 rounded-lg hover:bg-paper-2 transition-colors">Features</a>
            <Link to="/pricing" className="px-3 py-2 rounded-lg hover:bg-paper-2 transition-colors">Pricing</Link>
          </nav>
          <div className="flex items-center gap-1 sm:gap-3 shrink-0">
            <Link to="/login" className="text-sm font-semibold text-text-secondary hover:text-text-primary px-3 py-2 rounded-lg hover:bg-paper-2 transition-colors whitespace-nowrap">
              Sign in
            </Link>
            <Link to="/register" className="text-sm font-bold bg-brand-blue text-white px-3.5 sm:px-4 py-2 rounded-xl hover:opacity-90 transition-opacity whitespace-nowrap">
              Sign up<span className="hidden min-[400px]:inline"> free</span>
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ────────────────────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-4 pt-14 pb-16 md:pt-20 md:pb-24">
        <div className="grid grid-cols-1 lg:grid-cols-[1.05fr_1fr] gap-12 lg:gap-10 items-center">
          <div className="ea-rise">
            <span className="inline-flex items-center gap-1.5 bg-white border border-border-warm text-text-secondary text-xs font-semibold px-3 py-1.5 rounded-full mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-green" />
              For classrooms &amp; independent readers
            </span>
            <h1 className="font-display font-semibold text-4xl sm:text-5xl md:text-[3.75rem] leading-[1.04] tracking-tight mb-6 [overflow-wrap:anywhere]">
              Read, react, and write —{' '}
              <span className="text-brand-blue">right on the page.</span>
            </h1>
            <p className="text-lg sm:text-xl text-text-secondary mb-8 leading-relaxed max-w-xl">
              Easy Annotate turns any PDF into active reading. Students react and write notes
              directly on the text, teachers see their thinking and assign scaffolded writing,
              and everyone exports polished work.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                to="/register"
                className="inline-flex items-center justify-center gap-2 bg-brand-blue text-white font-bold px-7 py-3.5 rounded-xl hover:opacity-90 transition-opacity text-base"
              >
                Start for free
                <ArrowRight size={18} />
              </Link>
              <a
                href="#how"
                className="inline-flex items-center justify-center gap-2 bg-white border border-border-warm text-text-primary font-semibold px-7 py-3.5 rounded-xl hover:bg-paper-2 transition-colors text-base"
              >
                See how it works
              </a>
            </div>
            <p className="text-sm text-text-secondary/80 mt-4">No credit card required · 14-day free Pro trial for teachers</p>
          </div>

          {/* Product visual — an annotated book page (shows the function) */}
          <div className="ea-rise relative" style={{ animationDelay: '120ms' }}>
            <div className="bg-white rounded-2xl border border-border-warm shadow-[0_24px_60px_-30px_rgba(32,36,43,0.45)] p-6 sm:p-7">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-semibold text-text-secondary uppercase tracking-wide">The Great Gatsby</span>
                <span className="text-xs text-text-secondary/70">page 84</span>
              </div>

              <div className="font-display text-[1.05rem] leading-[1.85] text-text-primary/90">
                Gatsby believed in the green light, the orgastic future that
                year by year recedes before us.{' '}
                <mark className="bg-brand-yellow/45 rounded px-0.5 text-text-primary">
                  It eluded us then, but that&apos;s no matter — tomorrow we will run faster,
                  stretch out our arms farther.
                </mark>{' '}
                And one fine morning—
              </div>

              {/* Reaction chip attached to the highlight */}
              <div className="mt-4 inline-flex items-center gap-2 bg-paper border border-border-warm rounded-full pl-2 pr-3 py-1.5 shadow-sm">
                <span className="text-lg leading-none" aria-hidden>🤔</span>
                <span className="text-xs font-semibold text-text-primary">Makes me think</span>
              </div>

              {/* Student note */}
              <div className="mt-4 bg-paper-2 rounded-xl p-4 border border-border-warm">
                <div className="flex items-center gap-1.5 mb-1.5 text-xs font-semibold text-brand-blue">
                  <Highlighter size={13} /> My note
                </div>
                <p className="text-sm text-text-secondary leading-relaxed">
                  The green light feels like hope, but it keeps moving away — is that the whole point?
                </p>
              </div>

              {/* Read-aloud control row */}
              <div className="mt-5 flex items-center justify-between border-t border-border-warm pt-4">
                <button className="inline-flex items-center gap-2 text-sm font-semibold text-text-primary">
                  <span className="bg-brand-blue text-white rounded-full p-1.5"><Volume2 size={14} /></span>
                  Read aloud
                </button>
                <div className="flex items-center gap-1.5 text-base" aria-hidden>
                  <span>😲</span><span>🤔</span><span>❤️</span><span>⭐</span><span>❓</span>
                </div>
              </div>
            </div>

            {/* Teacher-sees-this caption */}
            <div className="hidden sm:flex absolute -bottom-4 -left-3 items-center gap-2 bg-text-primary text-white text-xs font-semibold px-3.5 py-2 rounded-xl shadow-lg">
              <Eye size={13} /> Your teacher sees every annotation
            </div>
          </div>
        </div>
      </section>

      {/* ── Capability strip ────────────────────────────────────────────────── */}
      <section className="border-y border-border-warm bg-white">
        <div className="max-w-6xl mx-auto px-4 py-5 grid grid-cols-2 md:grid-cols-4 gap-y-4 gap-x-6 text-sm">
          {[
            { icon: <MessageSquare size={16} />, label: 'Annotate any PDF' },
            { icon: <PenLine size={16} />, label: 'Scaffolded writing tool' },
            { icon: <Volume2 size={16} />, label: 'Read-aloud built in' },
            { icon: <ShieldCheck size={16} />, label: 'FERPA-aware privacy' },
          ].map(({ icon, label }) => (
            <div key={label} className="flex items-center gap-2.5 text-text-secondary font-medium">
              <span className="text-brand-blue shrink-0">{icon}</span>
              {label}
            </div>
          ))}
        </div>
      </section>

      {/* ── Persona tabs ────────────────────────────────────────────────────── */}
      <section className="py-20">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="font-display font-semibold text-3xl sm:text-4xl tracking-tight mb-2 text-center">One tool, three ways to read</h2>
          <p className="text-text-secondary text-center mb-10">Pick the experience that fits you.</p>

          <div className="flex justify-center gap-2 mb-10 flex-wrap">
            {PERSONAS.map((p, i) => (
              <button
                key={p.id}
                onClick={() => setActivePersona(i)}
                aria-pressed={activePersona === i}
                className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
                  activePersona === i
                    ? 'bg-text-primary text-white shadow-sm'
                    : 'bg-white border border-border-warm text-text-secondary hover:border-brand-blue hover:text-brand-blue'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="bg-white rounded-2xl border border-border-warm p-8 md:p-10 shadow-[0_18px_50px_-34px_rgba(32,36,43,0.4)]">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
              <div>
                <h3 className="font-display font-semibold text-2xl sm:text-[1.7rem] leading-snug tracking-tight mb-3">{persona.headline}</h3>
                <p className="text-text-secondary mb-6 leading-relaxed">{persona.sub}</p>
                <Link
                  to={persona.href}
                  className="inline-flex items-center gap-2 text-white font-bold px-6 py-3 rounded-xl hover:opacity-90 transition-opacity text-sm"
                  style={{ backgroundColor: persona.accent }}
                >
                  {persona.cta}
                  <ArrowRight size={16} />
                </Link>
              </div>
              <ul className="space-y-3">
                {persona.bullets.map((b) => (
                  <li key={b} className="flex items-start gap-2.5 text-sm text-text-primary/90">
                    <CheckCircle2 size={16} className="shrink-0 mt-0.5" style={{ color: persona.accent }} />
                    {b}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── How it works ────────────────────────────────────────────────────── */}
      <section id="how" className="py-20 bg-white border-y border-border-warm">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="font-display font-semibold text-3xl sm:text-4xl tracking-tight mb-2 text-center">From PDF to insight in three steps</h2>
          <p className="text-text-secondary text-center mb-12">No setup, no new file formats — just upload and read.</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { n: '1', title: 'Upload any PDF', desc: 'A novel chapter, a news article, a primary source. Teachers assign to a class; independent readers go straight to their bookshelf.' },
              { n: '2', title: 'Read, react, and write', desc: 'Select text, tap a reaction, add a note. Use read aloud while you follow along. Open the writing workspace without losing your place.' },
              { n: '3', title: 'See thinking, export work', desc: 'Teachers see every annotation per student, per page. Students export polished writing to PDF or Google Docs in one click.' },
            ].map(({ n, title, desc }) => (
              <div key={n} className="relative bg-paper rounded-2xl p-6 border border-border-warm">
                <div className="font-display font-semibold text-brand-blue text-2xl mb-3">{n}</div>
                <h3 className="font-bold text-lg mb-2 tracking-tight">{title}</h3>
                <p className="text-sm text-text-secondary leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Writing tool spotlight ───────────────────────────────────────────── */}
      <section className="py-20 max-w-6xl mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <span className="inline-flex items-center gap-1.5 text-brand-purple text-sm font-bold mb-4">
              <PenLine size={15} /> Writing tool
            </span>
            <h2 className="font-display font-semibold text-3xl sm:text-4xl tracking-tight mb-4 leading-tight">From reading to writing — without leaving the book.</h2>
            <p className="text-text-secondary mb-6 leading-relaxed">
              Teachers assign a writing task when they upload a book. Students see the prompt before
              they start reading and open the writing workspace directly from the page they&apos;re on.
            </p>
            <ul className="space-y-3">
              {[
                { icon: <Layers size={15} />, text: '4 organizer templates: Paragraph Builder, Main Idea, Compare & Contrast, Story Map' },
                { icon: <GraduationCap size={15} />, text: 'Guided mode shows sentence starters; Independent mode shows labels only' },
                { icon: <PenLine size={15} />, text: 'Teachers add a custom prompt students see throughout the reading' },
                { icon: <FileText size={15} />, text: 'Export finished writing as PDF or open in Google Docs' },
              ].map(({ icon, text }) => (
                <li key={text} className="flex items-start gap-2.5 text-sm text-text-primary/90">
                  <span className="text-brand-purple shrink-0 mt-0.5">{icon}</span>
                  {text}
                </li>
              ))}
            </ul>
          </div>

          {/* Writing workspace mock (no fake chrome) */}
          <div className="bg-white rounded-2xl border border-border-warm shadow-[0_18px_50px_-34px_rgba(32,36,43,0.4)] p-5 sm:p-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wide text-text-secondary">Paragraph Builder</span>
              <span className="text-xs font-semibold text-brand-purple bg-brand-purple/10 rounded-full px-2.5 py-1">Guided</span>
            </div>
            <div className="bg-brand-purple/8 rounded-lg px-3 py-2.5 mb-4 text-xs text-text-primary/80 font-medium border border-brand-purple/15">
              ✍️ Prompt: Analyze how Fitzgerald uses a symbol to develop a theme in the novel.
            </div>
            <div className="space-y-3">
              {WRITING_STEPS.map((step, i) => (
                <div key={i} className="bg-paper rounded-xl p-3.5 border border-border-warm">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-text-primary">{step.label}</span>
                    <span className="text-xs text-text-secondary/80 italic">Starter: {step.starter}</span>
                  </div>
                  <p className="text-xs text-text-secondary leading-relaxed">{step.value}</p>
                </div>
              ))}
            </div>
            <div className="flex gap-2 mt-4">
              <span className="flex-1 bg-brand-purple text-white text-xs font-bold py-2.5 rounded-lg text-center">Export PDF</span>
              <span className="flex-1 border border-border-warm text-text-secondary text-xs font-semibold py-2.5 rounded-lg text-center">Open in Google Docs</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Feature grid ────────────────────────────────────────────────────── */}
      <section id="features" className="bg-white border-t border-border-warm py-20">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="font-display font-semibold text-3xl sm:text-4xl tracking-tight mb-2 text-center">Everything you need to read closely</h2>
          <p className="text-text-secondary text-center mb-12">Built for real classrooms and independent learners alike.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-border-warm rounded-2xl overflow-hidden border border-border-warm">
            {FEATURES.map(({ icon, title, desc }) => (
              <div key={title} className="bg-white p-6 hover:bg-paper transition-colors">
                <div className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-brand-blue/10 text-brand-blue mb-3">{icon}</div>
                <h3 className="font-bold mb-1.5 tracking-tight">{title}</h3>
                <p className="text-sm text-text-secondary leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing teaser ──────────────────────────────────────────────────── */}
      <section className="bg-text-primary py-20">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <h2 className="font-display font-semibold text-3xl sm:text-4xl tracking-tight text-white mb-3">Free to start. Upgrade when you&apos;re ready.</h2>
          <p className="text-white/65 mb-6 leading-relaxed">
            The free plan includes 1 classroom, up to 30 students, and 5 books. Pro unlocks unlimited
            classrooms, students, books, and PDF annotation export.
          </p>
          <p className="text-white/45 text-sm mb-8">Every new teacher account includes a 14-day free trial of Pro.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/register"
              className="inline-flex items-center justify-center gap-2 bg-brand-yellow text-text-primary font-bold px-8 py-4 rounded-xl hover:opacity-90 transition-opacity"
            >
              Create a free account
              <ArrowRight size={18} />
            </Link>
            <Link
              to="/pricing"
              className="inline-flex items-center justify-center gap-2 border border-white/25 text-white font-semibold px-8 py-4 rounded-xl hover:bg-white/10 transition-colors"
            >
              See all plans
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────────── */}
      <footer className="border-t border-border-warm bg-paper">
        <div className="max-w-6xl mx-auto px-4 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-text-secondary">
          <div className="flex items-center gap-2">
            <div className="bg-brand-blue text-white p-1 rounded-md">
              <BookOpen size={14} />
            </div>
            <span className="font-semibold text-text-primary">Easy Annotate</span>
            <span className="text-text-secondary/70">· © 2026 Dembryllc</span>
          </div>
          <div className="flex gap-5">
            <Link to="/pricing" className="hover:text-brand-blue transition-colors">Pricing</Link>
            <Link to="/privacy" className="hover:text-brand-blue transition-colors">Privacy</Link>
            <Link to="/terms" className="hover:text-brand-blue transition-colors">Terms</Link>
            <a href="mailto:dembryllc@gmail.com" className="hover:text-brand-blue transition-colors">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
