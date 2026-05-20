"use client";

import { defaultProgress, defaultScoreProfile } from "@/data/student";
import type { Account, ProgressState, ScoreProfile, ScoreReportAnalysis } from "@/types";

const scoreKey = "ascend-score-profile";
const progressKey = "ascend-progress-state";
const accountKey = "ascend-account";
const analysisKey = "ascend-score-analysis";

export function readScoreProfile(): ScoreProfile {
  if (typeof window === "undefined") return defaultScoreProfile;
  const raw = window.localStorage.getItem(scoreKey);
  return raw ? { ...defaultScoreProfile, ...JSON.parse(raw) } : defaultScoreProfile;
}

export function saveScoreProfile(profile: ScoreProfile) {
  window.localStorage.setItem(scoreKey, JSON.stringify(profile));
}

export function readAccount(): Account | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(accountKey);
  return raw ? JSON.parse(raw) : null;
}

export function saveAccount(account: Account) {
  window.localStorage.setItem(accountKey, JSON.stringify(account));
}

export function signOut() {
  window.localStorage.removeItem(accountKey);
}

export function readProgress(): ProgressState {
  if (typeof window === "undefined") return defaultProgress;
  const raw = window.localStorage.getItem(progressKey);
  return raw ? { ...defaultProgress, ...JSON.parse(raw) } : defaultProgress;
}

export function saveProgress(progress: ProgressState) {
  window.localStorage.setItem(progressKey, JSON.stringify(progress));
}

export function readScoreAnalysis(): ScoreReportAnalysis | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(analysisKey);
  return raw ? JSON.parse(raw) : null;
}

export function saveScoreAnalysis(analysis: ScoreReportAnalysis) {
  window.localStorage.setItem(analysisKey, JSON.stringify(analysis));
}

export function deleteAscendData() {
  window.localStorage.removeItem(scoreKey);
  window.localStorage.removeItem(progressKey);
  window.localStorage.removeItem(analysisKey);
}
