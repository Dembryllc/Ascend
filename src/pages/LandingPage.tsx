/* Hallmark · macrostructure: Marquee Hero (show-the-product) · genre: instructional-warm
 * tone: teacher-to-teacher, any-classroom-first · anchor hue: cool (brand blue)
 * theme: brand-on-warm-paper · display: Fraunces · body: Inter
 * enrichment: Tier-A CSS art (annotated book page) · no fake browser chrome
 * positioning: guided reading + writing workspace, not "PDF annotator"
 */
import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '@/context/auth-context'
import { homeForRole } from '@/types'
import { subscribeLeadMagnet } from '@/firebase/leadMagnet'
import {
  BookOpen, CheckCircle2, Eye, MessageSquare, TrendingUp, Users,
  Volume2, PenLine, FileText, Smartphone, ShieldCheck,
  GraduationCap, Layers, ArrowRight, Highlighter, Upload, Sparkles, Mail,
} from 'lucide-react'

// ─── Problem section pain cards ────────────────────────────────────────────────
const PAIN_POINTS = [
  {
    icon: <MessageSquare size={18} aria-hidden="true" />,
    title: 'Students can read the text but cannot easily show their thinking',
    desc: 'Reading and responding live in different tools, so reactions and ideas get lost before they reach the teacher.',
  },
  {
    icon: <PenLine size={18} aria-hidden="true" />,
    title: 'Writing tasks get separated from the reading',
    desc: 'Students finish the text, then switch apps to write about it — losing the evidence and the momentum.',
  },
  {
    icon: <Eye size={18} aria-hidden="true" />,
    title: 'Teachers do not know who is confused until the work is turned in',
    desc: 'By the time a packet is collected, there is no way to see who stalled on page 3 or skipped the hard part.',
  },
]

// ─── ICT / inclusion section bullets ───────────────────────────────────────────
const ICT_BULLETS = [
  'Same text for the whole class',
  'Built-in read-aloud support',
  'Simple reactions and notes for quick thinking',
  'Scaffolded writing tasks for deeper responses',
  'Teacher dashboard to see who needs help',
  'Works for whole class, small group, or individual assignments',
]

const WRITING_STEPS = [
  { label: 'Topic Sentence', value: "Fitzgerald uses the green light as a symbol of Gatsby's longing for a life he can never reach.", starter: 'In the novel…' },
  { label: 'Evidence', value: "Gatsby reaches toward the green light across the bay in Chapter 1, even before Daisy's return.", starter: 'For example…' },
  { label: 'Analysis', value: 'The color green suggests hope, but its distance suggests that hope will always stay out of reach.', starter: 'This shows that…' },
]

// ─── Feature grid data (outcome-oriented) ──────────────────────────────────────
const FEATURES = [
  {
    icon: <MessageSquare size={20} aria-hidden="true" />,
    title: 'Capture Student Thinking Instantly',
    desc: 'Students highlight text, choose a reaction, and add a note without interrupting the reading flow.',
  },
  {
    icon: <PenLine size={20} aria-hidden="true" />,
    title: 'Build Writing Into the Reading',
    desc: 'Assign paragraph builders, main idea tasks, compare and contrast responses, or story maps directly inside the reading experience.',
  },
  {
    icon: <Volume2 size={20} aria-hidden="true" />,
    title: 'Support Readers With Built-In Read Aloud',
    desc: 'Students can listen to the text while staying on the same page as the rest of the class.',
  },
  {
    icon: <Eye size={20} aria-hidden="true" />,
    title: "See Every Student's Work",
    desc: 'View reactions, notes, writing, progress, and completion by student, page, or assignment.',
  },
  {
    icon: <TrendingUp size={20} aria-hidden="true" />,
    title: 'Know Who Needs Help',
    desc: 'Track progress so you can see who finished, who paused, and who may be stuck before the work is collected.',
  },
  {
    icon: <FileText size={20} aria-hidden="true" />,
    title: 'Export Finished Writing',
    desc: 'Students can export polished writing as PDF or Google Docs-compatible files.',
  },
  {
    icon: <Users size={20} aria-hidden="true" />,
    title: 'Assign With Simple Class Codes',
    desc: 'Students join with a class code, making setup fast for classrooms.',
  },
  {
    icon: <Smartphone size={20} aria-hidden="true" />,
    title: 'Designed for Mobile Reading',
    desc: 'Students can read, highlight, react, and write from a phone, tablet, Chromebook, or computer.',
  },
  {
    icon: <ShieldCheck size={20} aria-hidden="true" />,
    title: 'Built for Student Privacy',
    desc: 'Designed with school use in mind. Keep student work protected and avoid unnecessary data exposure.',
  },
]

const PRIVACY_BULLETS = [
  'FERPA-aware design',
  'Student work stays protected',
  'No public student sharing',
  'Class-code based access',
  'Teacher-controlled assignments',
  'Built for real classroom workflows',
]

export default function LandingPage() {
  const { profile, loading } = useAuth()
  const [captureEmail, setCaptureEmail] = useState('')
  const [captureSubmitted, setCaptureSubmitted] = useState(false)
  const [captureSubmitting, setCaptureSubmitting] = useState(false)

  const handleCapture = async (e: React.FormEvent) => {
    e.preventDefault()
    if (captureSubmitting) return
    setCaptureSubmitting(true)
    try {
      await subscribeLeadMagnet(captureEmail.trim().toLowerCase())
    } catch {
      // Non-critical — still show success so a slow/failed AC call doesn't
      // block the visitor. Worst case they don't get the email; not worth
      // surfacing an error for a lead-magnet signup.
    }
    setCaptureSubmitting(false)
    setCaptureSubmitted(true)
  }

  if (!loading && profile) {
    return <Navigate to={homeForRole(profile.role)} replace />
  }

  return (
    <div className="min-h-screen bg-paper text-text-primary overflow-x-clip">

      {/* ── Nav ─────────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-paper/85 backdrop-blur-md border-b border-border-warm">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="bg-brand-blue text-white p-1.5 rounded-lg">
              <BookOpen size={20} aria-hidden="true" />
            </div>
            <span className="hidden min-[360px]:inline text-base sm:text-lg font-bold tracking-tight whitespace-nowrap">Easy Annotate</span>
          </div>
          <nav className="hidden sm:flex items-center gap-1 text-sm text-text-secondary font-medium">
            <a href="#how" className="px-3 py-2 rounded-lg hover:bg-paper-2 transition-colors">How it works</a>
            <a href="#inclusion" className="px-3 py-2 rounded-lg hover:bg-paper-2 transition-colors">Mixed-needs classrooms</a>
            <a href="#features" className="px-3 py-2 rounded-lg hover:bg-paper-2 transition-colors">Features</a>
            <Link to="/pricing" className="px-3 py-2 rounded-lg hover:bg-paper-2 transition-colors">Pricing</Link>
          </nav>
          <div className="flex items-center gap-1 sm:gap-3 shrink-0">
            <Link to="/login" className="text-sm font-semibold text-text-secondary hover:text-text-primary px-3 py-2.5 rounded-lg hover:bg-paper-2 transition-colors whitespace-nowrap">
              Sign in
            </Link>
            <Link to="/register" className="text-sm font-bold bg-brand-blue text-white px-3.5 sm:px-4 py-2.5 rounded-xl hover:opacity-90 transition-opacity whitespace-nowrap">
              Sign up<span className="hidden min-[400px]:inline"> free</span>
            </Link>
          </div>
        </div>
      </header>

      {/* ── 1. Hero ─────────────────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-4 pt-14 pb-16 md:pt-20 md:pb-24">
        <div className="grid grid-cols-1 lg:grid-cols-[1.05fr_1fr] gap-12 lg:gap-10 items-center">
          <div className="ea-rise">
            <span className="inline-flex items-center gap-1.5 bg-white border border-border-warm text-text-secondary text-xs font-semibold px-3 py-1.5 rounded-full mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-green" />
              For any classroom, any reader
            </span>
            <h1 className="font-display font-semibold text-4xl sm:text-5xl md:text-[3.75rem] leading-[1.04] tracking-tight mb-6 [overflow-wrap:anywhere]">
              Every Student. One Text.{' '}
              <span className="text-brand-blue">Full Participation.</span>
            </h1>
            <p className="text-lg sm:text-xl text-text-secondary mb-8 leading-relaxed max-w-xl">
              Upload any PDF and turn it into an interactive reading lesson where students can
              listen, highlight, react, record notes, and write directly on the page — while
              teachers see every step of the learning process.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                to="/register"
                className="inline-flex items-center justify-center gap-2 bg-brand-blue text-white font-bold px-7 py-3.5 rounded-xl hover:opacity-90 transition-opacity text-base"
              >
                Start for Free
                <ArrowRight size={18} aria-hidden="true" />
              </Link>
              <a
                href="#how"
                className="inline-flex items-center justify-center gap-2 bg-white border border-border-warm text-text-primary font-semibold px-7 py-3.5 rounded-xl hover:bg-paper-2 transition-colors text-base"
              >
                See How It Works
              </a>
            </div>
            <p className="text-sm text-text-secondary/80 mt-4">No credit card required. Built for real classrooms.</p>
          </div>

          {/* Product visual — an annotated, scaffolded book page (shows the whole workflow) */}
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
                  <Highlighter size={13} aria-hidden="true" /> My note
                </div>
                <p className="text-sm text-text-secondary leading-relaxed">
                  The green light feels like hope, but it keeps moving away — is that the whole point?
                </p>
              </div>

              {/* Writing scaffold hint */}
              <div className="mt-4 bg-brand-purple/8 rounded-xl p-3.5 border border-brand-purple/15">
                <div className="flex items-center gap-1.5 mb-1 text-xs font-bold text-brand-purple">
                  <PenLine size={13} aria-hidden="true" /> Writing task open
                </div>
                <p className="text-xs text-text-secondary/90 italic">Starter: &ldquo;This shows that…&rdquo;</p>
              </div>

              {/* Read-aloud control row */}
              <div className="mt-5 flex items-center justify-between border-t border-border-warm pt-4">
                <div className="inline-flex items-center gap-2 text-sm font-semibold text-text-primary">
                  <span className="bg-brand-blue text-white rounded-full p-1.5"><Volume2 size={14} aria-hidden="true" /></span>
                  Read aloud
                </div>
                <div className="flex items-center gap-1.5 text-base" aria-hidden>
                  <span>😲</span><span>🤔</span><span>❤️</span><span>⭐</span><span>❓</span>
                </div>
              </div>
            </div>

            {/* Teacher-sees-this caption */}
            <div className="hidden sm:flex absolute -bottom-4 -left-3 items-center gap-2 bg-text-primary text-white text-xs font-semibold px-3.5 py-2 rounded-xl shadow-lg">
              <Eye size={13} aria-hidden="true" /> Your teacher sees every annotation
            </div>
          </div>
        </div>
      </section>

      {/* ── Capability strip ────────────────────────────────────────────────── */}
      <section className="border-y border-border-warm bg-white">
        <div className="max-w-6xl mx-auto px-4 py-5 grid grid-cols-2 md:grid-cols-4 gap-y-4 gap-x-6 text-sm">
          {[
            { icon: <MessageSquare size={16} aria-hidden="true" />, label: 'Annotate any PDF' },
            { icon: <PenLine size={16} aria-hidden="true" />, label: 'Scaffolded writing tool' },
            { icon: <Volume2 size={16} aria-hidden="true" />, label: 'Read-aloud built in' },
            { icon: <ShieldCheck size={16} aria-hidden="true" />, label: 'FERPA-aware privacy' },
          ].map(({ icon, label }) => (
            <div key={label} className="flex items-center gap-2.5 text-text-secondary font-medium">
              <span className="text-brand-blue shrink-0">{icon}</span>
              {label}
            </div>
          ))}
        </div>
      </section>

      {/* ── 2. Problem ──────────────────────────────────────────────────────── */}
      <section className="py-20">
        <div className="max-w-6xl mx-auto px-4">
          <div className="max-w-2xl mx-auto text-center mb-12">
            <h2 className="font-display font-semibold text-3xl sm:text-4xl tracking-tight mb-4">PDFs Were Never Built for Real Reading Instruction</h2>
            <p className="text-text-secondary leading-relaxed">
              Teachers upload articles, chapters, packets, and primary sources every day. But too
              often the reading, annotation, read-aloud support, writing assignment, and teacher
              feedback all live in separate places. That makes it harder for students to
              participate and harder for teachers to see what is actually happening.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {PAIN_POINTS.map(({ icon, title, desc }) => (
              <div key={title} className="bg-white rounded-2xl p-6 border border-border-warm">
                <div className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-brand-red/10 text-brand-red mb-3">{icon}</div>
                <h3 className="font-bold mb-1.5 tracking-tight leading-snug">{title}</h3>
                <p className="text-sm text-text-secondary leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 3. Solution ─────────────────────────────────────────────────────── */}
      <section className="py-20 bg-white border-y border-border-warm">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <span className="inline-flex items-center gap-1.5 text-brand-blue text-sm font-bold mb-4">
            <Sparkles size={15} aria-hidden="true" /> The idea
          </span>
          <h2 className="font-display font-semibold text-3xl sm:text-4xl tracking-tight mb-4">Turn Any PDF Into an Interactive Reading Lesson</h2>
          <p className="text-text-secondary leading-relaxed text-lg">
            Easy Annotate brings reading, reactions, notes, read-aloud support, writing tasks, and
            teacher visibility into one simple workspace. Students stay on the page. Teachers stay
            connected to the thinking.
          </p>
        </div>
      </section>

      {/* ── 4. How it works ─────────────────────────────────────────────────── */}
      <section id="how" className="py-20">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="font-display font-semibold text-3xl sm:text-4xl tracking-tight mb-2 text-center">From PDF to insight in three steps</h2>
          <p className="text-text-secondary text-center mb-12">No setup, no new file formats — just upload and read.</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { n: '1', title: 'Upload any PDF', desc: 'Upload a novel chapter, article, primary source, worksheet, or reading passage. Assign it to a class, group, or individual student.' },
              { n: '2', title: 'Read, react, and write', desc: 'Students highlight text, tap a reaction, add a note, use read-aloud, and open writing supports without leaving the page.' },
              { n: '3', title: 'See student thinking', desc: 'Teachers see annotations, notes, progress, reactions, and writing samples in one place — by student, page, or assignment.' },
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

      {/* ── 5. Mixed-needs / inclusion ──────────────────────────────────────── */}
      <section id="inclusion" className="py-20 bg-white border-y border-border-warm">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <span className="inline-flex items-center gap-1.5 text-brand-green text-sm font-bold mb-4">
                <Users size={15} aria-hidden="true" /> One lesson, every learner
              </span>
              <h2 className="font-display font-semibold text-3xl sm:text-4xl tracking-tight mb-4 leading-tight">
                One Lesson Has to Reach Every Student — ICT, General Ed, or Independent
              </h2>
              <p className="text-text-secondary leading-relaxed">
                In real classrooms, students do not all access text the same way. Some need
                read-aloud support. Some need sentence starters. Some need a simpler way to show
                thinking. Some are ready to write more deeply. Easy Annotate keeps every student on
                the same text — whether you're co-teaching an ICT section, running a general ed
                classroom, or supporting one student one-on-one — while giving each one the
                supports they need to participate.
              </p>
            </div>
            <ul className="space-y-3 bg-paper rounded-2xl p-6 sm:p-8 border border-border-warm">
              {ICT_BULLETS.map((b) => (
                <li key={b} className="flex items-start gap-2.5 text-sm sm:text-base text-text-primary/90">
                  <CheckCircle2 size={18} aria-hidden="true" className="shrink-0 mt-0.5 text-brand-green" />
                  {b}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ── 6. Reading to writing ───────────────────────────────────────────── */}
      <section className="py-20 max-w-6xl mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <span className="inline-flex items-center gap-1.5 text-brand-purple text-sm font-bold mb-4">
              <PenLine size={15} aria-hidden="true" /> Writing tool
            </span>
            <h2 className="font-display font-semibold text-3xl sm:text-4xl tracking-tight mb-4 leading-tight">From Reading to Writing — Without Leaving the Text</h2>
            <p className="text-text-secondary mb-6 leading-relaxed">
              Teachers can attach writing tasks directly to the reading experience. Students see
              the prompt before they begin, collect evidence as they read, and build responses
              with guided or independent support.
            </p>
            <ul className="space-y-3">
              {[
                { icon: <Layers size={15} aria-hidden="true" />, text: 'Paragraph Builder, Main Idea, Compare & Contrast, and Story Map organizers' },
                { icon: <GraduationCap size={15} aria-hidden="true" />, text: 'Sentence starters and guided steps for scaffolded, evidence-based writing' },
                { icon: <PenLine size={15} aria-hidden="true" />, text: 'Teachers add a custom prompt students see throughout the reading' },
                { icon: <FileText size={15} aria-hidden="true" />, text: 'Export finished writing as PDF or open in Google Docs' },
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

      {/* ── 7. Teacher visibility ───────────────────────────────────────────── */}
      <section className="py-20 bg-white border-y border-border-warm">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Dashboard mock */}
            <div className="order-2 lg:order-1 bg-paper rounded-2xl border border-border-warm shadow-[0_18px_50px_-34px_rgba(32,36,43,0.4)] p-5 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold uppercase tracking-wide text-text-secondary">The Great Gatsby · Ch. 1</span>
                <span className="text-xs text-text-secondary/70">24 students</span>
              </div>
              <div className="space-y-2.5">
                {[
                  { name: 'Maya R.', status: '🤔 Reacted · note added', page: 'p. 84', color: 'text-brand-green' },
                  { name: 'Diego T.', status: '😲 Reacted', page: 'p. 62', color: 'text-brand-blue' },
                  { name: 'Sam K.', status: 'Paused 4 min', page: 'p. 41', color: 'text-brand-red' },
                  { name: 'Priya N.', status: 'Writing task open', page: 'p. 84', color: 'text-brand-purple' },
                ].map((row) => (
                  <div key={row.name} className="flex items-center justify-between bg-white rounded-lg px-3.5 py-2.5 border border-border-warm text-sm">
                    <span className="font-semibold text-text-primary">{row.name}</span>
                    <span className={`text-xs font-medium ${row.color}`}>{row.status}</span>
                    <span className="text-xs text-text-secondary/70">{row.page}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="order-1 lg:order-2">
              <span className="inline-flex items-center gap-1.5 text-brand-blue text-sm font-bold mb-4">
                <Eye size={15} aria-hidden="true" /> Live visibility
              </span>
              <h2 className="font-display font-semibold text-3xl sm:text-4xl tracking-tight mb-4 leading-tight">
                See Every Student&apos;s Thinking in One Place
              </h2>
              <p className="text-text-secondary mb-6 leading-relaxed">
                Easy Annotate gives teachers a live window into student reading. See who reacted,
                who wrote a note, who stopped on a page, and who needs support before the lesson
                is finished.
              </p>
              <Link
                to="/register"
                className="inline-flex items-center gap-2 bg-brand-blue text-white font-bold px-6 py-3 rounded-xl hover:opacity-90 transition-opacity text-sm"
              >
                Start for Free
                <ArrowRight size={16} aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── 8. Feature grid ─────────────────────────────────────────────────── */}
      <section id="features" className="py-20">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="font-display font-semibold text-3xl sm:text-4xl tracking-tight mb-2 text-center">Everything you need to run the lesson</h2>
          <p className="text-text-secondary text-center mb-12">Built for real classrooms, ICT co-teaching teams, and independent learners alike.</p>
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

      {/* ── 9. Privacy / classroom safety ───────────────────────────────────── */}
      <section className="py-20 bg-white border-y border-border-warm">
        <div className="max-w-5xl mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <span className="inline-flex items-center gap-1.5 text-brand-green text-sm font-bold mb-4">
                <ShieldCheck size={15} aria-hidden="true" /> Privacy
              </span>
              <h2 className="font-display font-semibold text-3xl sm:text-4xl tracking-tight mb-4 leading-tight">Built for Classrooms, Not Data Mining</h2>
              <p className="text-text-secondary leading-relaxed">
                Easy Annotate is designed for school use, with student privacy and classroom
                control in mind.
              </p>
            </div>
            <ul className="space-y-3 bg-paper rounded-2xl p-6 sm:p-8 border border-border-warm">
              {PRIVACY_BULLETS.map((b) => (
                <li key={b} className="flex items-start gap-2.5 text-sm sm:text-base text-text-primary/90">
                  <CheckCircle2 size={18} aria-hidden="true" className="shrink-0 mt-0.5 text-brand-green" />
                  {b}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ── 10. Final CTA ────────────────────────────────────────────────────── */}
      <section className="bg-text-primary py-20">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-white/10 text-brand-yellow mb-6">
            <Upload size={22} aria-hidden="true" />
          </div>
          <h2 className="font-display font-semibold text-3xl sm:text-4xl tracking-tight text-white mb-3">Free to start. Upgrade when you&apos;re ready.</h2>
          <p className="text-white/65 mb-6 leading-relaxed">
            Upload a text, assign it to your students, and see how much more visible reading becomes.
            The free plan includes 1 classroom, up to 30 students, and 5 books. Pro unlocks unlimited
            classrooms, students, books, and PDF annotation export.
          </p>
          <p className="text-white/70 text-sm mb-8">Every new teacher account includes a 14-day free trial of Pro. Independent readers and homeschool learners can start free too — no classroom required.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/register"
              className="inline-flex items-center justify-center gap-2 bg-brand-yellow text-text-primary font-bold px-8 py-4 rounded-xl hover:opacity-90 transition-opacity"
            >
              Start for Free
              <ArrowRight size={18} aria-hidden="true" />
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

      {/* ── Email Capture: Free PDF Books & Assignments Guide ─────────────────── */}
      <section id="free-guide" className="py-20 bg-white border-y border-border-warm">
        <div className="max-w-xl mx-auto px-4 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-brand-blue/10 text-brand-blue mb-6">
            <Mail size={22} aria-hidden="true" />
          </div>
          <h2 className="font-display font-semibold text-3xl sm:text-4xl tracking-tight text-text-primary mb-3">
            Get the Free PDF Books &amp; Assignments Guide
          </h2>
          <p className="text-text-secondary mb-8 leading-relaxed">
            8 legitimate, no-cost sources for classroom texts — plus 5 public-domain readings already
            paired with a writing prompt, ready to drop straight into Easy Annotate.
          </p>
          {captureSubmitted ? (
            <div className="rounded-xl border border-border-warm bg-paper px-6 py-5 text-text-primary">
              🎉 Sent! Check your inbox — it should arrive in under a minute.
            </div>
          ) : (
            <form onSubmit={handleCapture} className="flex flex-col sm:flex-row gap-3 justify-center">
              <input
                type="email"
                required
                autoComplete="email"
                placeholder="you@school.edu"
                value={captureEmail}
                onChange={e => setCaptureEmail(e.target.value)}
                className="flex-1 sm:max-w-xs px-4 py-3 rounded-xl border border-border-warm bg-paper text-text-primary placeholder:text-text-secondary/60 focus:outline-none focus:ring-2 focus:ring-brand-blue"
              />
              <button
                type="submit"
                disabled={captureSubmitting}
                className="inline-flex items-center justify-center gap-2 bg-brand-blue text-white font-bold px-6 py-3 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-60"
              >
                {captureSubmitting ? 'Sending…' : 'Send Me the Guide'}
              </button>
            </form>
          )}
          <p className="text-text-secondary/70 text-xs mt-4">No spam. Unsubscribe anytime. We&apos;ll never share your email.</p>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────────── */}
      <footer className="border-t border-border-warm bg-paper">
        <div className="max-w-6xl mx-auto px-4 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-text-secondary">
          <div className="flex items-center gap-2">
            <div className="bg-brand-blue text-white p-1 rounded-md">
              <BookOpen size={14} aria-hidden="true" />
            </div>
            <span className="font-semibold text-text-primary">Easy Annotate</span>
            <span className="text-text-secondary/70">· © 2026 Dembryllc</span>
          </div>
          <div className="flex gap-5">
            <Link to="/pricing" className="hover:text-brand-blue transition-colors">Pricing</Link>
            <Link to="/accessibility" className="hover:text-brand-blue transition-colors">Accessibility</Link>
            <Link to="/privacy" className="hover:text-brand-blue transition-colors">Privacy</Link>
            <Link to="/terms" className="hover:text-brand-blue transition-colors">Terms</Link>
            <a href="mailto:dembryllc@gmail.com" className="hover:text-brand-blue transition-colors">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
