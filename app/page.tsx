import { ArrowRight, FileUp, Play, Sparkles, UserRound } from "lucide-react";
import { modules } from "@/data/modules";
import { defaultScoreProfile } from "@/data/student";
import { generateStudyPlan } from "@/lib/plan";
import { Badge, HeroBand, LinkButton, ModuleCard, ProgressBar, Shell } from "@/components/ui";

export default function HomePage() {
  const plan = generateStudyPlan(defaultScoreProfile);

  return (
    <Shell>
      <div className="space-y-8">
        <HeroBand>
          <Badge tone="violet" icon={Sparkles}>Know your score. Build your plan. Ascend.</Badge>
          <h1 className="display mt-5 max-w-3xl text-5xl leading-[1.02] md:text-7xl">A simple SAT tutor that turns practice into a plan.</h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-bg/75">
            Study the exact SAT domains, upload or enter a score report, and get a weekly plan that feels doable.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <LinkButton href="/account" variant="soft" iconRight={UserRound}>Create account</LinkButton>
            <LinkButton href="/dashboard" variant="ghost" iconRight={ArrowRight}>Open dashboard</LinkButton>
            <LinkButton href="/upload" variant="ghost" iconRight={FileUp}>Add score report</LinkButton>
          </div>
        </HeroBand>

        <section className="grid gap-4 md:grid-cols-3">
          <div className="card card-pad">
            <div className="label">Current score</div>
            <div className="display mt-2 text-4xl">{defaultScoreProfile.totalScore}</div>
            <p className="mt-1 text-sm text-muted">Target {defaultScoreProfile.targetScore}</p>
          </div>
          <div className="card card-pad">
            <div className="label">Next module</div>
            <div className="display mt-2 text-2xl">{plan.recommendedModules[0].name}</div>
            <p className="mt-1 text-sm text-muted">High priority this week</p>
          </div>
          <div className="card card-pad">
            <div className="label">Weekly goal</div>
            <div className="display mt-2 text-4xl">{defaultScoreProfile.weeklyStudyGoal}</div>
            <p className="mt-1 text-sm text-muted">short sessions</p>
          </div>
        </section>

        <section>
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="display text-3xl">Start with these</h2>
            <LinkButton href="/practice" variant="ghost" iconRight={Play}>Practice</LinkButton>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {plan.priorityAreas.map((module) => <ModuleCard key={module.id} module={module} />)}
          </div>
        </section>

        <section className="card card-pad-lg">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="display text-2xl">Progress by SAT domain</h2>
            <Badge>{modules.length} modules</Badge>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {modules.map((module) => (
              <div key={module.id} className={module.colorClass}>
                <div className="mb-1 flex justify-between text-sm font-semibold">
                  <span>{module.name}</span>
                  <span className="text-muted">{module.progress}%</span>
                </div>
                <ProgressBar value={module.progress} tone="bg-[var(--c)]" />
              </div>
            ))}
          </div>
        </section>
      </div>
    </Shell>
  );
}
