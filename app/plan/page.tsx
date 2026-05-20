"use client";

import { useEffect, useState } from "react";
import { ArrowRight, Check, Flag, Sparkles, Star } from "lucide-react";
import { defaultScoreProfile } from "@/data/student";
import { officialDomainDetails } from "@/data/sat-reference";
import { generateStudyPlan } from "@/lib/plan";
import { readScoreAnalysis, readScoreProfile } from "@/lib/storage";
import type { ScoreProfile, ScoreReportAnalysis } from "@/types";
import { Badge, LinkButton, ModuleGlyph, ProgressBar, Shell } from "@/components/ui";

export default function PlanPage() {
  const [profile, setProfile] = useState<ScoreProfile>(defaultScoreProfile);
  const [analysis, setAnalysis] = useState<ScoreReportAnalysis | null>(null);

  useEffect(() => {
    setProfile(readScoreProfile());
    setAnalysis(readScoreAnalysis());
  }, []);

  const plan = generateStudyPlan(profile);

  return (
    <Shell>
      <div className="space-y-7">
        <section>
          <Badge tone="violet" icon={Sparkles}>Personalized study plan</Badge>
          <h1 className="page-title mt-4">{profile.studentName}, here is your roadmap to {profile.targetScore}.</h1>
          <p className="page-sub">{plan.encouragement}</p>
        </section>

        {analysis ? (
          <section className="card card-pad-lg border-violet/30 bg-surface">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <Badge tone="violet">Based on score report analysis</Badge>
              <Badge tone={analysis.extractionConfidence === "High" ? "green" : analysis.extractionConfidence === "Medium" ? "amber" : "rose"}>
                {analysis.extractionConfidence} extraction confidence
              </Badge>
            </div>
            <h2 className="display text-2xl">What Ascend found</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {analysis.findings.map((finding) => (
                <div key={finding} className="rounded-lg bg-surface2 p-3 text-sm leading-6 text-ink2">{finding}</div>
              ))}
            </div>
            <p className="mt-4 text-sm leading-6 text-muted">{analysis.sectionAdvice}</p>
          </section>
        ) : null}

        <section className="card card-pad-lg bg-ink text-bg">
          <div className="grid gap-6 md:grid-cols-[160px_1fr_160px] md:items-center">
            <div>
              <div className="text-xs font-bold uppercase tracking-[0.06em] opacity-60">Where you are</div>
              <div className="display mt-2 text-5xl">{profile.totalScore}</div>
            </div>
            <div>
              <ProgressBar value={profile.totalScore - 400} max={profile.targetScore - 400} tone="bg-pink" />
              <div className="mt-3 flex justify-between text-xs font-semibold opacity-70">
                <span>400</span>
                <span>+{profile.targetScore - profile.totalScore} points</span>
                <span>1600</span>
              </div>
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-[0.06em] opacity-60">Target</div>
              <div className="display mt-2 text-5xl text-pink">{profile.targetScore}</div>
            </div>
          </div>
        </section>

        <section className="grid gap-5 lg:grid-cols-2">
          <div className="card card-pad-lg">
            <Badge tone="rose" icon={Flag}>Priority areas</Badge>
            <h2 className="display mt-4 text-2xl">Major growth areas</h2>
            <div className="mt-4 space-y-3">
              {plan.majorGrowthAreas.map((module, index) => (
                <a key={module.id} href={`/modules/${module.id}`} className={`${module.colorClass} flex items-center gap-3 rounded-lg border border-border bg-surface2 p-3`}>
                  <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-ink text-sm font-bold text-bg">#{index + 1}</div>
                  <ModuleGlyph module={module} />
                  <div className="flex-1">
                    <div className="font-bold">{module.name}</div>
                    <div className="text-xs text-muted">{module.impact} impact · confidence {profile.domainConfidence[module.id]}/5 · {officialDomainDetails[module.id].coverage}</div>
                  </div>
                  <ArrowRight size={16} />
                </a>
              ))}
            </div>
          </div>

          <div className="card card-pad-lg">
            <Badge tone="green" icon={Star}>Quick wins</Badge>
            <h2 className="display mt-4 text-2xl">Protect easy points</h2>
            <div className="mt-4 space-y-3">
              {plan.quickWins.map((module) => (
                <div key={module.id} className={`${module.colorClass} flex items-center gap-3 rounded-lg bg-greenSoft p-3`}>
                  <ModuleGlyph module={module} />
                  <div className="flex-1">
                    <div className="font-bold">{module.name}</div>
                    <div className="text-xs text-green">Strong area · one short quiz per week</div>
                  </div>
                  <Badge tone="green" icon={Check}>Keep warm</Badge>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="card card-pad-lg">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="display text-2xl">This week&apos;s schedule</h2>
              <p className="mt-1 text-sm text-muted">{plan.sectionBalance}</p>
            </div>
            <Badge tone="violet">{plan.weeklySchedule.length} sessions</Badge>
          </div>
          <div className="space-y-2">
            {plan.weeklySchedule.map((session) => (
              <div key={`${session.day}-${session.focus}`} className="grid gap-3 rounded-lg bg-surface2 p-4 md:grid-cols-[56px_8px_1fr_72px_96px] md:items-center">
                <div className="font-mono text-xs font-bold uppercase text-muted">{session.day}</div>
                <div className={`h-8 rounded-full ${session.priority === "High" ? "bg-rose" : session.priority === "Medium" ? "bg-amber" : "bg-border"}`} />
                <div>
                  <div className="font-bold">{session.focus}</div>
                  <div className="text-sm text-muted">{session.task}</div>
                </div>
                <div className="font-mono text-sm text-muted">{session.minutes}m</div>
                <LinkButton href="/practice" variant="ghost" className="w-full">Start</LinkButton>
              </div>
            ))}
          </div>
        </section>

        <section className="card card-pad-lg bg-violetSoft">
          <Badge tone="violet" icon={Sparkles}>Target score strategy</Badge>
          <h2 className="display mt-4 text-2xl text-violetDeep">Why this plan works</h2>
          <p className="mt-3 max-w-3xl leading-7 text-violetDeep">{plan.targetScoreStrategy} Lower-confidence domains get extra practice, and each week stays between 3 and 5 sessions so it feels repeatable.</p>
          <div className="mt-4 rounded-lg bg-white/40 p-4 text-sm leading-6 text-violetDeep">
            Next skill to unlock in {plan.recommendedModules[0].name}: {officialDomainDetails[plan.recommendedModules[0].id].nextBandSkill}
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <LinkButton href={`/modules/${plan.recommendedModules[0].id}`} variant="accent" iconRight={ArrowRight}>Start first module</LinkButton>
            <LinkButton href="/summary" variant="ghost">Share summary</LinkButton>
          </div>
        </section>

        {analysis ? (
          <section className="card card-pad-lg">
            <h2 className="display text-2xl">Next actions from your report</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              {analysis.nextActions.map((action) => (
                <div key={action} className="rounded-lg border border-border bg-surface2 p-4 text-sm font-semibold leading-6">{action}</div>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </Shell>
  );
}
