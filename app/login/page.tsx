"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, BookOpen, FileUp, Lock, UserRound } from "lucide-react";
import { defaultScoreProfile } from "@/data/student";
import { readAccount, readScoreProfile, saveAccount, saveScoreProfile } from "@/lib/storage";
import type { Account, UserRole } from "@/types";
import { Badge, Button, LinkButton } from "@/components/ui";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("signup");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<UserRole>("student");
  const [goal, setGoal] = useState<Account["goal"]>("study-first");

  useEffect(() => {
    const saved = readAccount();
    if (saved) {
      setMode("login");
      setName(saved.name);
      setEmail(saved.email);
      setRole(saved.role);
      setGoal(saved.goal);
    }
  }, []);

  function submit(event: FormEvent) {
    event.preventDefault();
    const profile = readScoreProfile();
    const account: Account = {
      id: readAccount()?.id ?? crypto.randomUUID(),
      name: name || "Student",
      email,
      role,
      goal,
      createdAt: readAccount()?.createdAt ?? new Date().toISOString()
    };
    saveAccount(account);
    saveScoreProfile({ ...defaultScoreProfile, ...profile, studentName: account.name });
    router.push(goal === "already-tested" ? "/upload" : "/study");
  }

  return (
    <main className="min-h-screen bg-bg px-4 py-6 md:grid md:place-items-center">
      <div className="grid w-full max-w-6xl gap-6 lg:grid-cols-[1fr_460px]">
        <section className="relative overflow-hidden rounded-[22px] bg-ink p-7 text-bg md:p-10">
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-violet/40 blur-3xl" />
          <div className="absolute -bottom-24 left-24 h-64 w-64 rounded-full bg-pink/30 blur-3xl" />
          <div className="relative">
            <div className="mb-8 flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-bg text-xl font-black text-ink">A</div>
              <div>
                <div className="display text-2xl">Ascend</div>
                <div className="text-sm text-bg/65">SAT study that starts immediately</div>
              </div>
            </div>
            <Badge tone="violet">No wandering. No giant course map first.</Badge>
            <h1 className="display mt-5 max-w-2xl text-5xl leading-[1.03] md:text-7xl">Sit down, start studying, know what to do next.</h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-bg/75">
              Ascend opens to a focused study session: one priority, one question, instant feedback, and a clear next step.
            </p>
            <div className="mt-8 grid gap-3 md:grid-cols-3">
              {[
                [BookOpen, "Start with a skill", "If you have not tested yet."],
                [FileUp, "Upload a report", "If you already have scores."],
                [Lock, "Save progress", "Local account for this MVP."]
              ].map(([Icon, title, copy]) => {
                const IconComponent = Icon as typeof BookOpen;
                return (
                  <div key={title as string} className="rounded-card bg-white/10 p-4">
                    <IconComponent size={20} />
                    <div className="mt-3 font-bold">{title as string}</div>
                    <div className="mt-1 text-xs leading-5 text-bg/65">{copy as string}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <form onSubmit={submit} className="card card-pad-lg flex flex-col justify-center">
          <Badge tone="violet" icon={UserRound}>{mode === "signup" ? "Create account" : "Welcome back"}</Badge>
          <h2 className="display mt-4 text-3xl">{mode === "signup" ? "Set up your study room." : "Log back in."}</h2>
          <p className="mt-2 text-sm leading-6 text-muted">This local MVP uses email as your sign-in identity. Production auth can replace this later without changing the student flow.</p>

          <div className="mt-5 space-y-4">
            <label><span className="label">Name</span><input className="input mt-2" value={name} onChange={(event) => setName(event.target.value)} placeholder="Maya" required /></label>
            <label><span className="label">Email</span><input className="input mt-2" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="student@example.com" required /></label>
          </div>

          <div className="mt-5">
            <div className="label mb-3">I am a</div>
            <div className="grid grid-cols-3 gap-2">
              {(["student", "parent", "teacher"] as UserRole[]).map((item) => (
                <button type="button" key={item} onClick={() => setRole(item)} className={`rounded-lg border px-3 py-2 text-sm font-bold capitalize ${role === item ? "border-violet bg-violetSoft text-violetDeep" : "border-border bg-surface2"}`}>
                  {item}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-5">
            <div className="label mb-3">What should happen first?</div>
            <div className="grid gap-2">
              {[
                ["study-first", "Start studying immediately"],
                ["already-tested", "Upload my SAT score report"],
                ["both", "Study now and upload later"]
              ].map(([value, label]) => (
                <button type="button" key={value} onClick={() => setGoal(value as Account["goal"])} className={`rounded-lg border p-3 text-left text-sm font-bold ${goal === value ? "border-violet bg-violetSoft text-violetDeep" : "border-border bg-surface2"}`}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          <Button variant="accent" type="submit" iconRight={ArrowRight} className="mt-6 w-full">
            {goal === "already-tested" ? "Continue to upload" : "Start studying"}
          </Button>
          <div className="mt-4 flex justify-center gap-2 text-sm">
            <button type="button" onClick={() => setMode(mode === "signup" ? "login" : "signup")} className="font-bold text-violet">
              {mode === "signup" ? "I already have a local account" : "Create a new local account"}
            </button>
          </div>
          <LinkButton href="/" variant="ghost" className="mt-3">Preview without login</LinkButton>
        </form>
      </div>
    </main>
  );
}
