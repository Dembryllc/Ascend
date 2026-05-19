"use client";

import { ChangeEvent, FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { FileUp, Lock, Shield } from "lucide-react";
import { modules } from "@/data/modules";
import { defaultScoreProfile } from "@/data/student";
import { saveScoreProfile } from "@/lib/storage";
import type { DomainBand, ScoreProfile } from "@/types";
import { Badge, Button, Shell } from "@/components/ui";

export default function UploadPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<ScoreProfile>(defaultScoreProfile);
  const [fileName, setFileName] = useState<string | null>(null);

  function onFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setFileName(file?.name ?? null);
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
    saveScoreProfile(profile);
    router.push("/plan");
  }

  return (
    <Shell>
      <div className="space-y-6">
        <div>
          <Badge tone="violet" icon={FileUp}>Score report</Badge>
          <h1 className="page-title mt-4">Upload or enter your SAT scores</h1>
          <p className="page-sub">For this MVP, PDF upload is parser-ready and manual score entry builds the personalized plan immediately.</p>
        </div>

        <div className="grid gap-5 lg:grid-cols-[.9fr_1.1fr]">
          <section className="card card-pad-lg">
            <label className="flex min-h-72 cursor-pointer flex-col items-center justify-center rounded-card border-2 border-dashed border-border bg-surface2 p-6 text-center transition hover:border-violet">
              <input type="file" accept="application/pdf" className="hidden" onChange={onFile} />
              <div className="grid h-16 w-16 place-items-center rounded-2xl bg-white text-violet"><FileUp size={28} /></div>
              <h2 className="display mt-4 text-2xl">{fileName ?? "Drop your score report PDF here"}</h2>
              <p className="mt-2 text-sm text-muted">PDF placeholder/parser-ready interface. No paid APIs used.</p>
              <span className="btn btn-accent mt-5">Choose a PDF</span>
            </label>
            <div className="mt-4 grid gap-3 text-sm text-ink2">
              <div className="flex gap-2"><Lock size={16} className="mt-0.5 text-violet" /> Uploaded reports are not sent anywhere in this local MVP.</div>
              <div className="flex gap-2"><Shield size={16} className="mt-0.5 text-violet" /> The parser interface is ready for future extraction of scores, percentiles, and domain bands.</div>
            </div>
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

            <Button variant="accent" type="submit">Build my study plan</Button>
          </form>
        </div>
      </div>
    </Shell>
  );
}
