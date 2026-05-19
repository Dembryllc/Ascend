import { ArrowRight, FileUp, Sparkles, Target } from "lucide-react";
import { modules } from "@/data/modules";
import { defaultScoreProfile } from "@/data/student";
import { generateStudyPlan, MATH_BENCHMARK, RW_BENCHMARK } from "@/lib/plan";
import { Badge, HeroBand, LinkButton, ModuleCard, ProgressBar, Shell } from "@/components/ui";

export default function DashboardPage() {
  const profile = defaultScoreProfile;
  const plan = generateStudyPlan(profile);
  const progressToTarget = ((profile.totalScore - 400) / (profile.targetScore - 400)) * 100;

  return (
    <Shell>
      <div className="space-y-7">
        <HeroBand>
          <div className="flex flex-wrap gap-2">
            <Badge tone="green">12-day streak</Badge>
            <Badge tone="violet">Test date {new Date(profile.testDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</Badge>
          </div>
          <h1 className="display mt-5 max-w-3xl text-4xl leading-tight md:text-6xl">Hi {profile.studentName}. You&apos;ve got this.</h1>
          <p className="mt-3 max-w-xl text-bg/75">Start with {plan.recommendedModules[0].name}. It is the clearest path toward your target right now.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <LinkButton href={`/modules/${plan.recommendedModules[0].id}`} variant="soft" iconRight={ArrowRight}>Continue studying</LinkButton>
            <LinkButton href="/upload" variant="ghost" iconRight={FileUp}>Upload score report</LinkButton>
          </div>
        </HeroBand>

        <section className="grid gap-4 md:grid-cols-3">
          <div className="card card-pad">
            <div className="label">Latest total SAT score</div>
            <div className="display mt-2 text-5xl">{profile.totalScore}</div>
            <p className="mt-2 text-sm text-muted">{profile.totalPercentile}th percentile</p>
          </div>
          <div className="card card-pad">
            <div className="label">Current target score</div>
            <div className="mt-2 flex items-center gap-2">
              <div className="display text-5xl text-violet">{profile.targetScore}</div>
              <Target className="text-violet" />
            </div>
            <div className="mt-4">
              <ProgressBar value={progressToTarget} />
              <p className="mt-2 text-xs font-semibold text-muted">+{profile.targetScore - profile.totalScore} points to go</p>
            </div>
          </div>
          <div className="card card-pad bg-violet text-white">
            <div className="text-xs font-bold uppercase tracking-[0.06em] opacity-75">Weekly study goal</div>
            <div className="display mt-2 text-3xl">{profile.weeklyStudyGoal} sessions</div>
            <p className="mt-3 text-sm opacity-80">3 to 5 focused sessions works better than cramming.</p>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <div className="card card-pad">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <div className="label">Reading and Writing</div>
                <div className="display text-3xl">{profile.rwScore}</div>
              </div>
              <Badge tone={profile.rwScore >= RW_BENCHMARK ? "green" : "rose"}>{profile.rwScore >= RW_BENCHMARK ? "Above benchmark" : "Below benchmark"}</Badge>
            </div>
            <ProgressBar value={profile.rwScore - 200} max={600} tone="bg-pink" />
          </div>
          <div className="card card-pad">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <div className="label">Math</div>
                <div className="display text-3xl">{profile.mathScore}</div>
              </div>
              <Badge tone={profile.mathScore >= MATH_BENCHMARK ? "green" : "rose"}>{profile.mathScore >= MATH_BENCHMARK ? "Above benchmark" : "Below benchmark"}</Badge>
            </div>
            <ProgressBar value={profile.mathScore - 200} max={600} tone="bg-violet" />
          </div>
        </section>

        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="display text-3xl">Recommended next lessons</h2>
            <LinkButton href="/plan" variant="ghost" iconRight={Sparkles}>Study plan</LinkButton>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {plan.recommendedModules.slice(0, 3).map((module) => <ModuleCard key={module.id} module={module} />)}
          </div>
        </section>

        <section className="card card-pad-lg">
          <h2 className="display mb-4 text-2xl">Progress by SAT domain</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {modules.map((module) => (
              <div key={module.id} className={module.colorClass}>
                <div className="mb-1 flex justify-between text-sm font-semibold">
                  <span>{module.name}</span>
                  <span className="text-muted">Band {profile.domainBands[module.id]}/4</span>
                </div>
                <ProgressBar value={profile.domainBands[module.id]} max={4} tone="bg-[var(--c)]" />
              </div>
            ))}
          </div>
        </section>
      </div>
    </Shell>
  );
}
