"use client";

import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Check, FileText, FileUp, Lock, Shield } from "lucide-react";
import { modules } from "@/data/modules";
import { defaultScoreProfile } from "@/data/student";
import { analyzeScoreText, buildAnalysis, extractPdfText } from "@/lib/score-report";
import { readScoreAnalysis, readScoreProfile, saveScoreAnalysis, saveScoreProfile } from "@/lib/storage";
import type { DomainBand, ScoreProfile, ScoreReportAnalysis } from "@/types";
import { Badge, Button, Shell } from "@/components/ui";

export default function UploadPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<ScoreProfile>(defaultScoreProfile);
  const [fileName, setFileName] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<ScoreReportAnalysis | null>(null);
  const [status, setStatus] = useState<"idle" | "reading" | "ready" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setProfile(readScoreProfile());
    setAnalysis(readScoreAnalysis());
  }, []);

  async function onFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setFileName(file?.name ?? null);
    setStatus("reading");
    setError(null);

    try {
      const text = await extractPdfText(file);
      const result = analyzeScoreText(text, file.name);
      setProfile(result.profile);
      setAnalysis(result.analysis);
      setStatus("ready");
    } catch {
      setStatus("error");
      setError("I could not read this PDF automatically. You can still enter the scores below and Ascend will analyze them.");
      const fallbackAnalysis = buildAnalysis(profile, "", file.name);
      setAnalysis(fallbackAnalysis);
    }
  }

  function updateNumber(field: keyof Pick<ScoreProfile, "totalScore" | "rwScore" | "mathScore" | "targetScore" | "weeklyStudyGoal" | "totalPercentile" | "rwPercentile" | "mathPercentile">, value: string) {
    setProfile((current) => ({ ...current, [field]: Number(value) }));
  }

  function updateBand(moduleId: string, value: string) {
    setProfile((current) => ({
      ...current,
      domainBands: { ...current.domainBands, [moduleId]: Number(value) as DomainBand }
    }));
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    const nextAnalysis = buildAnalysis(profile, analysis?.extractedTextPreview ?? "", fileName ?? analysis?.fileName);
    saveScoreProfile(profile);
    saveScoreAnalysis(nextAnalysis);
    router.push("/plan");
  }

  return (
    <Shell>
      <div className="space-y-6">
        <div>
          <Badge tone="violet" icon={FileUp}>Score report</Badge>
          <h1 className="page-title mt-4">Upload or enter your SAT scores</h1>
          <p className="page-sub">Upload a PDF score report for local analysis, or enter scores manually. Ascend reads what it can, ranks weak domains, and builds a study plan.</p>
        </div>

        <div className="grid gap-5 lg:grid-cols-[.9fr_1.1fr]">
          <section className="card card-pad-lg">
            <label className="flex min-h-72 cursor-pointer flex-col items-center justify-center rounded-card border-2 border-dashed border-border bg-surface2 p-6 text-center transition hover:border-violet">
              <input type="file" accept="application/pdf" className="hidden" onChange={onFile} />
              <div className="grid h-16 w-16 place-items-center rounded-2xl bg-white text-violet"><FileUp size={28} /></div>
              <h2 className="display mt-4 text-2xl">{fileName ?? "Drop your score report PDF here"}</h2>
              <p className="mt-2 text-sm text-muted">{status === "reading" ? "Reading PDF text and looking for scores..." : "PDF is analyzed locally in your browser. No paid APIs used."}</p>
              <span className="btn btn-accent mt-5">{status === "reading" ? "Analyzing..." : "Choose a PDF"}</span>
            </label>
            <div className="mt-4 grid gap-3 text-sm text-ink2">
              <div className="flex gap-2"><Lock size={16} className="mt-0.5 text-violet" /> Uploaded reports are not sent anywhere in this local MVP.</div>
              <div className="flex gap-2"><Shield size={16} className="mt-0.5 text-violet" /> Ascend looks for total, section scores, percentiles, and Knowledge & Skills domain language.</div>
            </div>
            {error ? (
              <div className="mt-4 rounded-lg border border-amber bg-amberSoft p-4 text-sm leading-6 text-ink2">
                <div className="mb-1 flex items-center gap-2 font-bold text-amber"><AlertCircle size={16} /> PDF needs manual review</div>
                {error}
              </div>
            ) : null}
            {analysis ? <AnalysisPanel analysis={analysis} /> : null}
          </section>

          <form onSubmit={submit} className="card card-pad-lg space-y-5">
            <h2 className="display text-2xl">Manual score entry</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <label><span className="label">Student name</span><input className="input mt-2" value={profile.studentName} onChange={(event) => setProfile({ ...profile, studentName: event.target.value })} /></label>
              <label><span className="label">Test date</span><input className="input mt-2" type="date" value={profile.testDate} onChange={(event) => setProfile({ ...profile, testDate: event.target.value })} /></label>
              <label><span className="label">Total score</span><input className="input mt-2" type="number" min={400} max={1600} value={profile.totalScore} onChange={(event) => updateNumber("totalScore", event.target.value)} /></label>
              <label><span className="label">Target score</span><input className="input mt-2" type="number" min={400} max={1600} value={profile.targetScore} onChange={(event) => updateNumber("targetScore", event.target.value)} /></label>
              <label><span className="label">Reading/Writing score</span><input className="input mt-2" type="number" min={200} max={800} value={profile.rwScore} onChange={(event) => updateNumber("rwScore", event.target.value)} /></label>
              <label><span className="label">Math score</span><input className="input mt-2" type="number" min={200} max={800} value={profile.mathScore} onChange={(event) => updateNumber("mathScore", event.target.value)} /></label>
              <label><span className="label">Total percentile</span><input className="input mt-2" type="number" min={1} max={99} value={profile.totalPercentile ?? ""} onChange={(event) => updateNumber("totalPercentile", event.target.value)} /></label>
              <label><span className="label">Weekly study goal</span><input className="input mt-2" type="number" min={3} max={5} value={profile.weeklyStudyGoal} onChange={(event) => updateNumber("weeklyStudyGoal", event.target.value)} /></label>
            </div>

            <div>
              <h3 className="display mb-3 text-xl">Domain performance</h3>
              <div className="grid gap-3 md:grid-cols-2">
                {modules.map((module) => (
                  <label key={module.id} className="rounded-lg border border-border bg-surface2 p-3">
                    <span className="text-sm font-semibold">{module.name}</span>
                    <select className="input mt-2" value={profile.domainBands[module.id]} onChange={(event) => updateBand(module.id, event.target.value)}>
                      <option value={1}>1 · Needs work</option>
                      <option value={2}>2 · Developing</option>
                      <option value={3}>3 · On track</option>
                      <option value={4}>4 · Strong</option>
                    </select>
                  </label>
                ))}
              </div>
            </div>

            <Button variant="accent" type="submit">Save analysis and build my study plan</Button>
          </form>
        </div>
      </div>
    </Shell>
  );
}

function AnalysisPanel({ analysis }: { analysis: ScoreReportAnalysis }) {
  const priorityModules = analysis.priorityDomainIds
    .map((id) => modules.find((module) => module.id === id))
    .filter(Boolean);

  return (
    <div className="mt-5 rounded-card border border-border bg-surface p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 font-bold"><FileText size={17} /> Score report analysis</div>
        <Badge tone={analysis.extractionConfidence === "High" ? "green" : analysis.extractionConfidence === "Medium" ? "amber" : "rose"}>
          {analysis.extractionConfidence} confidence
        </Badge>
      </div>
      <div className="space-y-2 text-sm leading-6 text-ink2">
        {analysis.findings.map((finding) => (
          <div key={finding} className="flex gap-2"><Check size={15} className="mt-1 text-green" /> {finding}</div>
        ))}
      </div>
      <div className="mt-4">
        <div className="label mb-2">What to work on first</div>
        <div className="flex flex-wrap gap-2">
          {priorityModules.map((module) => module ? <Badge key={module.id} tone={module.impact === "High" ? "rose" : "violet"}>{module.name}</Badge> : null)}
        </div>
      </div>
      <p className="mt-4 text-sm leading-6 text-muted">{analysis.sectionAdvice}</p>
      {analysis.missingFields.length ? (
        <p className="mt-3 text-xs font-semibold text-amber">Please confirm manually: {analysis.missingFields.join(", ")}.</p>
      ) : null}
    </div>
  );
}
