import { modules } from "@/data/modules";
import type { Module, ScoreProfile, StudyPlan, StudySession } from "@/types";

export const RW_BENCHMARK = 480;
export const MATH_BENCHMARK = 530;

const impactWeight: Record<Module["impact"], number> = {
  Low: 0.8,
  Medium: 1,
  High: 1.2
};

export function benchmarkStatus(profile: ScoreProfile) {
  return {
    rwBelowBenchmark: profile.rwScore < RW_BENCHMARK,
    mathBelowBenchmark: profile.mathScore < MATH_BENCHMARK
  };
}

function modulePriority(module: Module, profile: ScoreProfile) {
  const band = profile.domainBands[module.id] ?? 3;
  const confidence = profile.domainConfidence[module.id] ?? module.confidence;
  const weakness = (4 - band) / 3;
  const lowConfidenceBoost = (5 - confidence) / 8;
  const status = benchmarkStatus(profile);
  const sectionBelow = module.section === "rw" ? status.rwBelowBenchmark : status.mathBelowBenchmark;
  const sectionGap = module.section === "rw" ? Math.max(0, RW_BENCHMARK - profile.rwScore) : Math.max(0, MATH_BENCHMARK - profile.mathScore);
  const sectionLever = sectionBelow ? 1.35 : sectionGap > 0 ? 1.1 : 1;
  return (weakness + lowConfidenceBoost) * sectionLever * impactWeight[module.impact];
}

export function rankedModules(profile: ScoreProfile) {
  return [...modules].sort((a, b) => modulePriority(b, profile) - modulePriority(a, profile));
}

export function generateStudyPlan(profile: ScoreProfile): StudyPlan {
  const ranked = rankedModules(profile);
  const status = benchmarkStatus(profile);
  const rwMathGap = profile.mathScore - profile.rwScore;
  const sectionBalance = rwMathGap > 120
    ? "More Reading and Writing this week, with one Math maintenance session."
    : rwMathGap < -120
      ? "More Math this week, with one Reading and Writing maintenance session."
      : "Balanced between Math and Reading and Writing.";

  const top = ranked.slice(0, 4);
  const quickWins = [...modules]
    .sort((a, b) => (profile.domainBands[b.id] ?? 3) - (profile.domainBands[a.id] ?? 3) || b.progress - a.progress)
    .slice(0, 3);

  const sessions = buildWeeklySchedule(top, profile);
  const below = [
    status.rwBelowBenchmark ? "Reading and Writing is below the 480 benchmark" : null,
    status.mathBelowBenchmark ? "Math is below the 530 benchmark" : null
  ].filter(Boolean);

  return {
    priorityAreas: top.slice(0, 3),
    recommendedModules: top,
    weeklySchedule: sessions,
    quickWins,
    majorGrowthAreas: top.slice(0, 3),
    sectionBalance,
    targetScoreStrategy: `You need ${Math.max(0, profile.targetScore - profile.totalScore)} more points to reach ${profile.targetScore}. ${below.length ? below.join(", ") + ", so that section gets first priority." : "Both sections are above benchmark, so the plan chases the highest-impact weak domains while protecting strengths."}`,
    encouragement: `${profile.studentName}, you do not need to study everything at once. Start with ${top[0].name}, keep sessions short, and use every missed question as a clue. Steady practice this week can turn the biggest weak spot into your best source of points.`
  };
}

function buildWeeklySchedule(recommended: Module[], profile: ScoreProfile): StudySession[] {
  const goal = Math.max(3, Math.min(5, profile.weeklyStudyGoal));
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri"];
  const sessions: StudySession[] = [];
  const primary = recommended[0];
  const secondary = recommended[1] ?? recommended[0];
  const third = recommended[2] ?? secondary;
  const maintenance = modules.find((module) => module.section !== primary.section && profile.domainBands[module.id] >= 3) ?? recommended[3] ?? primary;

  const template = [
    { module: primary, task: "Lesson overview + 8 practice questions", minutes: 35, priority: "High" as const },
    { module: secondary, task: "Worked example + confidence check", minutes: 30, priority: "High" as const },
    { module: third, task: "Targeted drill on missed-question patterns", minutes: 30, priority: "Medium" as const },
    { module: primary, task: "Short quiz + answer feedback review", minutes: 35, priority: "High" as const },
    { module: maintenance, task: "Maintenance tune-up to protect easy points", minutes: 20, priority: "Low" as const }
  ];

  for (let i = 0; i < goal; i += 1) {
    const item = template[i];
    sessions.push({
      day: days[i],
      focus: item.module.name,
      task: item.task,
      minutes: item.minutes,
      priority: item.priority
    });
  }

  return sessions;
}
