import { Clock, Users } from "lucide-react";
import { modules } from "@/data/modules";
import { defaultProgress, defaultScoreProfile } from "@/data/student";
import { benchmarkStatus, generateStudyPlan, MATH_BENCHMARK, RW_BENCHMARK } from "@/lib/plan";
import { Badge, ProgressBar, Shell } from "@/components/ui";

export default function SummaryPage() {
  const profile = defaultScoreProfile;
  const progress = defaultProgress;
  const plan = generateStudyPlan(profile);
  const status = benchmarkStatus(profile);

  return (
    <Shell>
      <div className="space-y-6">
        <div>
          <Badge tone="violet" icon={Users}>Parent / teacher summary</Badge>
          <h1 className="page-title mt-4">{profile.studentName}&apos;s SAT progress</h1>
          <p className="page-sub">A simple read-only view of current scores, benchmark status, practice plan, and recent activity.</p>
        </div>

        <section className="grid gap-4 md:grid-cols-4">
          <div className="card card-pad"><div className="label">Current score</div><div className="display mt-2 text-4xl">{profile.totalScore}</div></div>
          <div className="card card-pad"><div className="label">Target</div><div className="display mt-2 text-4xl text-violet">{profile.targetScore}</div></div>
          <div className="card card-pad"><div className="label">R&W</div><div className="display mt-2 text-4xl">{profile.rwScore}</div><Badge tone={status.rwBelowBenchmark ? "rose" : "green"}>{status.rwBelowBenchmark ? `Below ${RW_BENCHMARK}` : `Above ${RW_BENCHMARK}`}</Badge></div>
          <div className="card card-pad"><div className="label">Math</div><div className="display mt-2 text-4xl">{profile.mathScore}</div><Badge tone={status.mathBelowBenchmark ? "rose" : "green"}>{status.mathBelowBenchmark ? `Below ${MATH_BENCHMARK}` : `Above ${MATH_BENCHMARK}`}</Badge></div>
        </section>

        <section className="card card-pad-lg">
          <h2 className="display text-2xl">Recommended practice plan</h2>
          <p className="mt-3 max-w-3xl leading-7 text-ink2">
            {profile.studentName} is above both college-readiness benchmarks. The biggest opportunity is {plan.priorityAreas[0].name}, followed by {plan.priorityAreas[1].name}. Math stays in the plan as maintenance so current strengths do not fade.
          </p>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {plan.priorityAreas.map((module) => (
              <div key={module.id} className={`${module.colorClass} rounded-lg border border-border bg-surface2 p-4`}>
                <div className="font-bold">{module.name}</div>
                <div className="mt-1 text-sm text-muted">{module.impact} impact · {profile.domainBands[module.id]}/4 band</div>
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-5 lg:grid-cols-2">
          <div className="card card-pad-lg">
            <h2 className="display mb-4 text-2xl">Weakest areas</h2>
            <div className="space-y-4">
              {plan.priorityAreas.map((module) => (
                <div key={module.id} className={module.colorClass}>
                  <div className="mb-1 flex justify-between text-sm font-semibold"><span>{module.name}</span><span>Band {profile.domainBands[module.id]}/4</span></div>
                  <ProgressBar value={profile.domainBands[module.id]} max={4} tone="bg-[var(--c)]" />
                </div>
              ))}
            </div>
          </div>
          <div className="card card-pad-lg">
            <h2 className="display mb-4 text-2xl">Student progress</h2>
            <div className="space-y-4">
              {modules.slice(0, 6).map((module) => (
                <div key={module.id} className={module.colorClass}>
                  <div className="mb-1 flex justify-between text-sm font-semibold"><span>{module.name}</span><span>{module.progress}%</span></div>
                  <ProgressBar value={module.progress} tone="bg-[var(--c)]" />
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="card card-pad flex flex-wrap items-center justify-between gap-3 bg-surface2">
          <div className="flex items-center gap-3">
            <Clock size={18} />
            <div>
              <div className="font-bold">Last activity</div>
              <div className="text-sm text-muted">Craft and Structure practice · 35 minutes · 58% accuracy. Total study time tracked: {Object.values(progress.timeSpentMinutes).reduce((a, b) => a + b, 0)} minutes.</div>
            </div>
          </div>
        </section>
      </div>
    </Shell>
  );
}
