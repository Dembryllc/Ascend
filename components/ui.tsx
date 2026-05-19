import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowRight, BookOpen, Check, CircleHelp, FileUp, Flag, Home, LineChart, Lock, Play, Settings, Shield, Sparkles, Target, Trash2, Users } from "lucide-react";
import type { Module } from "@/types";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "accent" | "ghost" | "soft";
  icon?: LucideIcon;
  iconRight?: LucideIcon;
};

export const icons = {
  home: Home,
  book: BookOpen,
  upload: FileUp,
  spark: Sparkles,
  chart: LineChart,
  check: Check,
  flag: Flag,
  target: Target,
  users: Users,
  play: Play,
  shield: Shield,
  lock: Lock,
  trash: Trash2,
  settings: Settings,
  help: CircleHelp,
  arrowRight: ArrowRight
};

export function Button({ variant = "primary", icon: Icon, iconRight: IconRight, children, className = "", ...props }: ButtonProps) {
  return (
    <button className={`btn btn-${variant} ${className}`} {...props}>
      {Icon ? <Icon size={16} /> : null}
      {children}
      {IconRight ? <IconRight size={16} /> : null}
    </button>
  );
}

export function LinkButton({ href, variant = "primary", children, className = "", iconRight: IconRight }: {
  href: string;
  variant?: "primary" | "accent" | "ghost" | "soft";
  children: React.ReactNode;
  className?: string;
  iconRight?: LucideIcon;
}) {
  return (
    <Link href={href} className={`btn btn-${variant} ${className}`}>
      {children}
      {IconRight ? <IconRight size={16} /> : null}
    </Link>
  );
}

export function Badge({ tone = "default", children, icon: Icon, className = "" }: {
  tone?: "default" | "violet" | "rose" | "amber" | "green";
  children: React.ReactNode;
  icon?: LucideIcon;
  className?: string;
}) {
  return (
    <span className={`badge ${tone !== "default" ? `badge-${tone}` : ""} ${className}`}>
      {Icon ? <Icon size={12} /> : null}
      {children}
    </span>
  );
}

export function ProgressBar({ value, max = 100, tone = "bg-ink" }: { value: number; max?: number; tone?: string }) {
  const width = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className="progress-track">
      <div className={`progress-fill ${tone}`} style={{ width: `${width}%` }} />
    </div>
  );
}

export function ModuleGlyph({ module }: { module: Module }) {
  return (
    <div className={`${module.colorClass} grid h-11 w-11 place-items-center rounded-xl`} style={{ background: "var(--cs)", color: "var(--c)" }}>
      <span className="display text-lg">{module.name.slice(0, 1)}</span>
    </div>
  );
}

export function ModuleCard({ module, compact = false }: { module: Module; compact?: boolean }) {
  return (
    <Link href={`/modules/${module.id}`} className={`card card-pad block transition hover:-translate-y-0.5 hover:border-violet/40 ${module.colorClass}`}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <ModuleGlyph module={module} />
        {module.impact === "High" ? <Badge tone="rose" icon={Flag}>High impact</Badge> : <Badge>{module.impact}</Badge>}
      </div>
      <h3 className="display text-lg leading-tight">{module.name}</h3>
      {!compact ? <p className="mt-2 min-h-10 text-sm leading-5 text-muted">{module.short}</p> : null}
      <div className="mt-4 flex items-center justify-between text-xs font-semibold text-muted">
        <span>{module.progress}% complete</span>
        <span>{module.confidence}/5 confidence</span>
      </div>
      <div className="mt-2">
        <ProgressBar value={module.progress} tone="bg-[var(--c)]" />
      </div>
    </Link>
  );
}

export function Shell({ children }: { children: React.ReactNode }) {
  const nav = [
    ["Dashboard", "/dashboard", icons.home],
    ["Modules", "/modules", icons.book],
    ["Practice", "/practice", icons.play],
    ["Score report", "/upload", icons.upload],
    ["Study plan", "/plan", icons.spark],
    ["Parent view", "/summary", icons.users],
    ["Privacy", "/settings", icons.settings]
  ] as const;

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[260px_1fr]">
      <aside className="border-b border-border bg-surface/80 px-4 py-4 backdrop-blur lg:sticky lg:top-0 lg:h-screen lg:border-b-0 lg:border-r lg:p-5">
        <Link href="/" className="mb-5 flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-ink text-lg font-black text-bg">A</div>
          <div>
            <div className="display text-xl">Ascend</div>
            <div className="text-xs font-semibold text-muted">SAT tutor</div>
          </div>
        </Link>
        <nav className="flex gap-2 overflow-x-auto lg:flex-col lg:overflow-visible">
          {nav.map(([label, href, Icon]) => (
            <Link key={href} href={href} className="flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-ink2 transition hover:bg-surface2 hover:text-ink">
              <Icon size={17} />
              {label}
            </Link>
          ))}
        </nav>
        <div className="mt-6 hidden rounded-card bg-ink p-4 text-bg lg:block">
          <div className="mb-1 flex items-center gap-2 text-xs font-semibold opacity-75">
            <Sparkles size={13} /> Next best step
          </div>
          <div className="display text-lg leading-tight">Start Craft and Structure</div>
          <p className="mt-2 text-xs leading-5 opacity-75">Your biggest Reading and Writing lever this week.</p>
        </div>
      </aside>
      <main className="mx-auto w-full max-w-7xl px-4 py-6 md:px-8 md:py-8">{children}</main>
    </div>
  );
}

export function HeroBand({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <section className={`relative overflow-hidden rounded-[18px] bg-ink p-6 text-bg md:p-8 ${className}`}>
      <div className="absolute -right-20 -top-24 h-64 w-64 rounded-full bg-violet/40 blur-3xl" />
      <div className="absolute -bottom-24 left-1/3 h-64 w-64 rounded-full bg-pink/30 blur-3xl" />
      <div className="relative">{children}</div>
    </section>
  );
}
