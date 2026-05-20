import { ArrowRight, Clock, ClipboardList, FileText, Sparkles } from "lucide-react";
import { digitalSatSections } from "@/data/sat-reference";
import { modules } from "@/data/modules";
import { Badge, LinkButton, ProgressBar, Shell } from "@/components/ui";

export default function PracticeTestsPage() {
  return (
    <Shell>
      <div className="space-y-7">
        <section>
          <Badge tone="violet" icon={ClipboardList}>Digital SAT practice tests</Badge>
          <h1 className="page-title mt-4">Practice like the digital SAT.</h1>
          <p className="page-sub">
            Ascend now separates quick skill practice from full module practice. Use skill modules to learn, then use timed modules to build test-day stamina.
          </p>
        </section>

        <section className="grid gap-5 lg:grid-cols-2">
          {digitalSatSections.map((section) => (
            <div key={section.id} className="card card-pad-lg">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <Badge tone={section.id === "rw" ? "rose" : "violet"}>{section.name}</Badge>
                  <h2 className="display mt-3 text-3xl">{section.modules} adaptive modules</h2>
                </div>
                <div className="grid h-16 w-16 place-items-center rounded-2xl bg-surface2 text-violet">
                  <Clock size={26} />
                </div>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-lg bg-surface2 p-4">
                  <div className="label">Time per module</div>
                  <div className="display mt-1 text-3xl">{section.moduleMinutes}m</div>
                </div>
                <div className="rounded-lg bg-surface2 p-4">
                  <div className="label">Questions per module</div>
                  <div className="display mt-1 text-3xl">{section.questionsPerModule}</div>
                </div>
              </div>
              <ul className="mt-5 space-y-2 text-sm leading-6 text-muted">
                {section.notes.map((note) => <li key={note}>{note}</li>)}
              </ul>
              <div className="mt-5 flex flex-wrap gap-3">
                <LinkButton href={`/practice?section=${section.id}`} variant="accent" iconRight={ArrowRight}>Start timed module</LinkButton>
                <LinkButton href="/modules" variant="ghost">Review skills first</LinkButton>
              </div>
            </div>
          ))}
        </section>

        <section className="card card-pad-lg">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <Badge tone="green" icon={Sparkles}>Adaptive prep plan</Badge>
              <h2 className="display mt-3 text-2xl">What a useful practice test should produce</h2>
            </div>
            <LinkButton href="/upload" variant="ghost" iconRight={FileText}>Analyze score report</LinkButton>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {modules.map((module) => (
              <div key={module.id} className={`${module.colorClass} rounded-lg border border-border bg-surface2 p-4`}>
                <div className="mb-2 flex justify-between gap-3 text-sm font-bold">
                  <span>{module.name}</span>
                  <span className="text-muted">{module.impact} impact</span>
                </div>
                <ProgressBar value={module.progress} tone="bg-[var(--c)]" />
                <p className="mt-2 text-xs leading-5 text-muted">
                  After a timed module, Ascend should update accuracy, confidence, time spent, and next recommended lesson here.
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </Shell>
  );
}
