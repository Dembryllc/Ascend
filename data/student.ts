import type { ProgressState, ScoreProfile } from "@/types";

export const defaultScoreProfile: ScoreProfile = {
  studentName: "Maya",
  totalScore: 1230,
  rwScore: 520,
  mathScore: 710,
  rwPercentile: 64,
  mathPercentile: 89,
  totalPercentile: 78,
  testDate: "2026-10-04",
  targetScore: 1400,
  weeklyStudyGoal: 5,
  domainBands: {
    info: 3,
    craft: 1,
    exp: 2,
    conv: 3,
    alg: 4,
    adv: 4,
    prob: 4,
    geo: 3
  },
  domainConfidence: {
    info: 4,
    craft: 2,
    exp: 3,
    conv: 4,
    alg: 5,
    adv: 4,
    prob: 4,
    geo: 3
  }
};

export const defaultProgress: ProgressState = {
  completedModules: ["alg"],
  practiceAccuracy: {
    info: 0.76,
    craft: 0.58,
    exp: 0.62,
    conv: 0.78,
    alg: 0.86,
    adv: 0.8,
    prob: 0.82,
    geo: 0.7
  },
  confidenceRatings: defaultScoreProfile.domainConfidence,
  timeSpentMinutes: {
    info: 72,
    craft: 88,
    exp: 64,
    conv: 45,
    alg: 42,
    adv: 38,
    prob: 36,
    geo: 55
  },
  scoreHistory: [
    { date: "2026-03-14", total: 1140, rw: 500, math: 640 },
    { date: "2026-04-12", total: 1190, rw: 510, math: 680 },
    { date: "2026-05-04", total: 1230, rw: 520, math: 710 }
  ]
};
