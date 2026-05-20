"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, LogOut, UserRound } from "lucide-react";
import { defaultScoreProfile } from "@/data/student";
import { readAccount, readScoreProfile, saveAccount, saveScoreProfile, signOut } from "@/lib/storage";
import type { Account, UserRole } from "@/types";
import { Badge, Button, LinkButton, Shell } from "@/components/ui";

const roleCopy: Record<UserRole, string> = {
  student: "I am studying for the SAT.",
  parent: "I am helping a student stay on track.",
  teacher: "I support multiple students or classes."
};

export default function AccountPage() {
  const router = useRouter();
  const [account, setAccount] = useState<Account | null>(null);
  const [name, setName] = useState("Maya");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<UserRole>("student");
  const [goal, setGoal] = useState<Account["goal"]>("both");
  const [targetScore, setTargetScore] = useState(1400);
  const [testDate, setTestDate] = useState("2026-10-04");

  useEffect(() => {
    const saved = readAccount();
    const profile = readScoreProfile();
    setAccount(saved);
    setName(saved?.name ?? profile.studentName);
    setEmail(saved?.email ?? "");
    setRole(saved?.role ?? "student");
    setGoal(saved?.goal ?? "both");
    setTargetScore(profile.targetScore);
    setTestDate(profile.testDate);
  }, []);

  function submit(event: FormEvent) {
    event.preventDefault();
    const nextAccount: Account = {
      id: account?.id ?? crypto.randomUUID(),
      name,
      email,
      role,
      goal,
      createdAt: account?.createdAt ?? new Date().toISOString()
    };
    const profile = readScoreProfile();
    saveAccount(nextAccount);
    saveScoreProfile({ ...defaultScoreProfile, ...profile, studentName: name, targetScore, testDate });
    setAccount(nextAccount);
    router.push(goal === "already-tested" ? "/upload" : "/dashboard");
  }

  function handleSignOut() {
    signOut();
    setAccount(null);
  }

  return (
    <Shell>
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <form onSubmit={submit} className="card card-pad-lg space-y-5">
          <Badge tone="violet" icon={UserRound}>{account ? "Account settings" : "Create account"}</Badge>
          <div>
            <h1 className="page-title mt-4">{account ? "Your Ascend account" : "Let’s set up Ascend for you."}</h1>
            <p className="page-sub">This MVP stores your account locally in this browser. It gives the app a real student profile, goal, and starting path without adding production auth yet.</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label><span className="label">Name</span><input className="input mt-2" value={name} onChange={(event) => setName(event.target.value)} required /></label>
            <label><span className="label">Email</span><input className="input mt-2" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" required /></label>
            <label><span className="label">Target score</span><input className="input mt-2" type="number" min={400} max={1600} value={targetScore} onChange={(event) => setTargetScore(Number(event.target.value))} /></label>
            <label><span className="label">Test date</span><input className="input mt-2" type="date" value={testDate} onChange={(event) => setTestDate(event.target.value)} /></label>
          </div>

          <div>
            <div className="label mb-3">I am using Ascend as a</div>
            <div className="grid gap-3 md:grid-cols-3">
              {(["student", "parent", "teacher"] as UserRole[]).map((item) => (
                <button type="button" key={item} onClick={() => setRole(item)} className={`rounded-lg border p-4 text-left transition ${role === item ? "border-violet bg-violetSoft" : "border-border bg-surface2"}`}>
                  <div className="font-bold capitalize">{item}</div>
                  <div className="mt-1 text-xs leading-5 text-muted">{roleCopy[item]}</div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="label mb-3">Starting point</div>
            <div className="grid gap-3 md:grid-cols-3">
              {[
                ["already-tested", "I have a score report", "Upload it and get a diagnostic plan."],
                ["study-first", "I want to study first", "Jump into modules and practice."],
                ["both", "Both", "Use modules now and upload scores later."]
              ].map(([value, title, copy]) => (
                <button type="button" key={value} onClick={() => setGoal(value as Account["goal"])} className={`rounded-lg border p-4 text-left transition ${goal === value ? "border-violet bg-violetSoft" : "border-border bg-surface2"}`}>
                  <div className="font-bold">{title}</div>
                  <div className="mt-1 text-xs leading-5 text-muted">{copy}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button variant="accent" type="submit" iconRight={ArrowRight}>{account ? "Save account" : "Create account"}</Button>
            {account ? <Button type="button" variant="ghost" icon={LogOut} onClick={handleSignOut}>Sign out locally</Button> : null}
          </div>
        </form>

        <aside className="space-y-4">
          <div className="card card-pad bg-ink text-bg">
            <div className="label text-bg/60">Recommended flow</div>
            <div className="display mt-3 text-2xl">Create account → upload report → follow your plan.</div>
            <p className="mt-3 text-sm leading-6 text-bg/70">If you have not taken the SAT yet, start with modules and practice. Ascend will still track confidence and accuracy.</p>
          </div>
          <div className="card card-pad">
            <div className="font-bold">What changes after account setup?</div>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-muted">
              <li>Dashboard uses your name, target score, and date.</li>
              <li>Score upload saves analysis to your plan.</li>
              <li>Parent/teacher view reflects the same student profile.</li>
            </ul>
          </div>
          <LinkButton href="/upload" variant="ghost" iconRight={ArrowRight}>Go to score upload</LinkButton>
        </aside>
      </div>
    </Shell>
  );
}
