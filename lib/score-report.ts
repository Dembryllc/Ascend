import { modules } from "@/data/modules";
import { defaultScoreProfile } from "@/data/student";
import { generateStudyPlan, MATH_BENCHMARK, rankedModules, RW_BENCHMARK } from "@/lib/plan";
import type { Confidence, DomainBand, ScoreProfile, ScoreReportAnalysis } from "@/types";

const domainAliases: Record<string, string[]> = {
  info: ["information and ideas", "information & ideas"],
  craft: ["craft and structure", "craft & structure"],
  exp: ["expression of ideas"],
  conv: ["standard english conventions", "english conventions", "conventions"],
  alg: ["algebra"],
  adv: ["advanced math"],
  prob: ["problem solving and data analysis", "problem-solving and data analysis", "problem solving & data"],
  geo: ["geometry and trigonometry", "geometry & trigonometry", "geometry", "trigonometry"]
};

export async function extractPdfText(file: File): Promise<string> {
  const pdfjs = await import("pdfjs-dist/build/pdf.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
  const data = new Uint8Array(await file.arrayBuffer());
  const pdf = await pdfjs.getDocument({ data }).promise;
  const pageTexts: string[] = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    const text = content.items
      .map((item) => ("str" in item ? item.str : ""))
      .filter(Boolean)
      .join(" ");
    pageTexts.push(text);
  }

  return pageTexts.join("\n");
}

export function analyzeScoreText(text: string, fileName?: string) {
  const normalized = text.replace(/\s+/g, " ").trim();
  const profile = profileFromText(normalized);
  const analysis = buildAnalysis(profile, normalized, fileName);
  return { profile, analysis };
}

export function buildAnalysis(profile: ScoreProfile, extractedTextPreview = "", fileName?: string): ScoreReportAnalysis {
  const plan = generateStudyPlan(profile);
  const ranked = rankedModules(profile);
  const missingFields = [
    profile.totalScore ? null : "Total score",
    profile.rwScore ? null : "Reading and Writing score",
    profile.mathScore ? null : "Math score"
  ].filter(Boolean) as string[];

  const sectionAdvice = profile.rwScore < RW_BENCHMARK
    ? `Reading and Writing is below the ${RW_BENCHMARK} benchmark, so it should be the first priority.`
    : profile.mathScore < MATH_BENCHMARK
      ? `Math is below the ${MATH_BENCHMARK} benchmark, so Math practice gets the heaviest week-one focus.`
      : profile.mathScore - profile.rwScore > 120
        ? "Math is carrying the score. The fastest growth is likely in Reading and Writing."
        : profile.rwScore - profile.mathScore > 120
          ? "Reading and Writing is carrying the score. The fastest growth is likely in Math."
          : "Both sections are close enough that the plan stays balanced.";

  return {
    fileName,
    extractedTextPreview: extractedTextPreview.slice(0, 700),
    extractionConfidence: missingFields.length === 0 ? "High" : extractedTextPreview ? "Medium" : "Low",
    missingFields,
    priorityDomainIds: ranked.slice(0, 4).map((module) => module.id),
    sectionAdvice,
    findings: [
      `Current total: ${profile.totalScore}. Target: ${profile.targetScore}. Gap: ${Math.max(0, profile.targetScore - profile.totalScore)} points.`,
      `Reading and Writing: ${profile.rwScore} (${profile.rwScore >= RW_BENCHMARK ? "above" : "below"} benchmark ${RW_BENCHMARK}).`,
      `Math: ${profile.mathScore} (${profile.mathScore >= MATH_BENCHMARK ? "above" : "below"} benchmark ${MATH_BENCHMARK}).`,
      `Top recommended module: ${plan.recommendedModules[0].name}.`
    ],
    nextActions: [
      `Start ${plan.recommendedModules[0].name} today.`,
      `Do ${plan.weeklySchedule.length} focused sessions this week.`,
      "After each practice set, rate confidence so the plan can shift toward low-confidence domains."
    ]
  };
}

function profileFromText(text: string): ScoreProfile {
  const totalScore = findScore(text, [/total score[^0-9]{0,25}(\d{3,4})/i, /\b(1[0-5]\d{2}|1600|[4-9]\d{2})\b/]);
  const rwScore = findScore(text, [
    /reading\s*(?:and|&)\s*writing[^0-9]{0,35}(\d{3})/i,
    /evidence[-\s]*based[^0-9]{0,35}(\d{3})/i
  ]);
  const mathScore = findScore(text, [/math[^0-9]{0,35}(\d{3})/i]);
  const totalPercentile = findPercentile(text, [/total[^%]{0,30}(\d{1,2})(?:st|nd|rd|th)?\s*percentile/i]);
  const rwPercentile = findPercentile(text, [/reading\s*(?:and|&)\s*writing[^%]{0,40}(\d{1,2})(?:st|nd|rd|th)?\s*percentile/i]);
  const mathPercentile = findPercentile(text, [/math[^%]{0,40}(\d{1,2})(?:st|nd|rd|th)?\s*percentile/i]);
  const domainBands = { ...defaultScoreProfile.domainBands };

  for (const module of modules) {
    const band = findDomainBand(text, domainAliases[module.id]);
    if (band) domainBands[module.id] = band;
  }

  return {
    ...defaultScoreProfile,
    totalScore: validTotal(totalScore) ? totalScore : defaultScoreProfile.totalScore,
    rwScore: validSection(rwScore) ? rwScore : defaultScoreProfile.rwScore,
    mathScore: validSection(mathScore) ? mathScore : defaultScoreProfile.mathScore,
    totalPercentile: totalPercentile ?? defaultScoreProfile.totalPercentile,
    rwPercentile: rwPercentile ?? defaultScoreProfile.rwPercentile,
    mathPercentile: mathPercentile ?? defaultScoreProfile.mathPercentile,
    domainBands,
    domainConfidence: confidenceFromBands(domainBands)
  };
}

function findScore(text: string, patterns: RegExp[]) {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return Number(match[1]);
  }
  return 0;
}

function findPercentile(text: string, patterns: RegExp[]) {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return Number(match[1]);
  }
  return undefined;
}

function findDomainBand(text: string, aliases: string[]): DomainBand | null {
  for (const alias of aliases) {
    const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const context = text.match(new RegExp(`${escaped}.{0,120}`, "i"))?.[0] ?? "";
    if (!context) continue;
    if (/needs\s+work|not\s+yet|low|weak/i.test(context)) return 1;
    if (/developing|medium|approaching/i.test(context)) return 2;
    if (/on\s+track|meets|proficient/i.test(context)) return 3;
    if (/strong|advanced|exceeds|high/i.test(context)) return 4;
    const numeric = context.match(/\b([1-4])\b/);
    if (numeric?.[1]) return Number(numeric[1]) as DomainBand;
  }
  return null;
}

function confidenceFromBands(bands: Record<string, DomainBand>) {
  return Object.fromEntries(Object.entries(bands).map(([id, band]) => [id, Math.min(5, Math.max(1, band + 1)) as Confidence]));
}

function validTotal(score: number) {
  return score >= 400 && score <= 1600;
}

function validSection(score: number) {
  return score >= 200 && score <= 800;
}
