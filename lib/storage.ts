"use client";

import { defaultProgress, defaultScoreProfile } from "@/data/student";
import type { ProgressState, ScoreProfile } from "@/types";

const scoreKey = "ascend-score-profile";
const progressKey = "ascend-progress-state";

export function readScoreProfile(): ScoreProfile {
  if (typeof window === "undefined") return defaultScoreProfile;
  const raw = window.localStorage.getItem(scoreKey);
  return raw ? { ...defaultScoreProfile, ...JSON.parse(raw) } : defaultScoreProfile;
}

export function saveScoreProfile(profile: ScoreProfile) {
  window.localStorage.setItem(scoreKey, JSON.stringify(profile));
}

export function readProgress(): ProgressState {
  if (typeof window === "undefined") return defaultProgress;
  const raw = window.localStorage.getItem(progressKey);
  return raw ? { ...defaultProgress, ...JSON.parse(raw) } : defaultProgress;
}

export function saveProgress(progress: ProgressState) {
  window.localStorage.setItem(progressKey, JSON.stringify(progress));
}

export function deleteAscendData() {
  window.localStorage.removeItem(scoreKey);
  window.localStorage.removeItem(progressKey);
}
