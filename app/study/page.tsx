"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, Clock, FileUp, Sparkles, X } from "lucide-react";
import { modules } from "@/data/modules";
import { questions } from "@/data/questions";
import { generateStudyPlan } from "@/lib/plan";
import { readAccount, readScoreProfile, readStudyAttempts, saveStudyAttempt } from "@/lib/storage";
import type { Account, Confidence, Question, ScoreProfile } from "@/types";
import { Badge, Button, LinkButton, ModuleGlyph, ProgressBar, Shell } from "@/components/ui";
import { defaultScoreProfile } from "@/data/student";

export default function StudyPage() {
  const [profile, setProfile] = useState<ScoreProfile>(defaultScoreProfile);
  const [account, setAccount] = useState<Account | null>(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [picked, setPicked] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [confidence, setConfidence] = useState<Confidence>(3);
  const [sessionCorrect, setSessionCorrect] = useState(0);
  const [sessionAnswered, setSessionAnswered] = useState(0);

  useEffect(() => {
    setProfile(readScoreProfile());
    setAccount(readAccount());
  }, []);

  const plan = generateStudyPlan(profile);
  const focusModule = plan.recommendedModules[0];
  const focusQuestions = useMemo(() => {
    const attemptedIds = new Set(readStudyAttempts().map((attempt) => attempt.questionId));
    const fresh = questions.filter((question) => question.moduleId === focusModule.id && !attemptedIds.has(question.id));
    const all = questions.filter((question) => question.moduleId === focusModule.id);
    return fresh.length ? fresh : all;
  }, [focusModule.id, sessionAnswered]);
  const question: Question = focusQuestions[questionIndex % focusQuestions.length];
  const correct = picked === question.correctAnswer;

  function submit() {
    if (!picked) return;
    setSubmitted(true);
    setSessionAnswered((value) => value + 1);
    if (correct) setSessionCorrect((value) => value + 1);
    saveStudyAttempt({
      questionId: question.id,
      moduleId: question.moduleId,
      pickedAnswer: picked,
      correct,
      confidence,
      answeredAt: new Date().toISOString()
    });
  }

  function nextQuestion() {
    setQuestionIndex((value) => value + 1);
    setPicked("");
    setSubmitted(false);
    setConfidence(3);
  }

  return (
    <Shell>
      <div className="space-y-6">
        <section className="grid gap-5 lg:grid-cols-[1fr_340px]">
          <div className="relative overflow-hidden rounded-[18px] bg-ink p-6 text-bg md:p-8">
            <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-violet/40 blur-3xl" />
            <div className="relative">
              <Badge tone="violet" icon={Sparkles}>Study now</Badge>
              <h1 className="display mt-4 text-4xl leading-tight md:text-6xl">
                {account ? `${account.name}, start here.` : "Start here."}
              </h1>
              <p className="mt-3 max-w-2xl text-bg/75">
                Today’s focus is {focusModule.name} because it is currently your highest-leverage area. Do one warm-up, answer a few questions, then Ascend tells you what to do next.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <LinkButton href={`/modules/${focusModule.id}`} variant="soft">Review lesson</LinkButton>
                <LinkButton href="/upload" variant="ghost" iconRight={FileUp}>Add score report</LinkButton>
              </div>
            </div>
          </div>

          <aside className="card card-pad">
            <div className="label">15-minute study block</div>
            <div className="mt-4 space-y-3">
              {[
                ["2 min", "Read the strategy reminder"],
                ["10 min", "Answer focused questions"],
                ["3 min", "Review misses and confidence"]
              ].map(([time, task], index) => (
                <div key={task} className="flex gap-3">
                  <div className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold ${index === 0 ? "bg-violet text-white" : "bg-surface2 text-muted"}`}>{index + 1}</div>
                  <div>
                    <div className="text-sm font-bold">{task}</div>
                    <div className="text-xs text-muted">{time}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-5">
              <div className="mb-1 flex justify-between text-xs font-bold text-muted">
                <span>Session progress</span>
                <span>{sessionAnswered}/5</span>
              </div>
              <ProgressBar value={sessionAnswered} max={5} tone="bg-violet" />
            </div>
          </aside>
        </section>

        <section className="grid gap-5 lg:grid-cols-[330px_1fr]">
          <aside className="card card-pad-lg">
            <div className={focusModule.colorClass}>
              <ModuleGlyph module={focusModule} />
              <h2 className="display mt-4 text-2xl">{focusModule.name}</h2>
              <p className="mt-2 text-sm leading-6 text-muted">{focusModule.short}</p>
              <div className="mt-4 rounded-lg bg-surface2 p-4">
                <div className="label">Strategy reminder</div>
                <p className="mt-2 text-sm leading-6 text-ink2">{focusModule.strategyNotes[0]}</p>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-surface2 p-3">
                  <div className="label">Accuracy</div>
                  <div className="display mt-1 text-2xl">{sessionAnswered ? Math.round((sessionCorrect / sessionAnswered) * 100) : 0}%</div>
                </div>
                <div className="rounded-lg bg-surface2 p-3">
                  <div className="label">Confidence</div>
                  <div className="display mt-1 text-2xl">{confidence}/5</div>
                </div>
              </div>
            </div>
          </aside>

          <div className="card card-pad-lg">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-2">
                <Badge tone="violet">{question.skillTag}</Badge>
                <Badge tone={question.difficulty === "Easy" ? "green" : question.difficulty === "Medium" ? "amber" : "rose"}>{question.difficulty}</Badge>
              </div>
              <div className="flex items-center gap-2 text-xs font-bold text-muted"><Clock size={14} /> No timer yet. Learn first.</div>
            </div>
            <h2 className="display text-2xl leading-tight">{question.questionText}</h2>
            <div className="mt-6 grid gap-3">
              {question.choices.map((choice, index) => {
                const active = picked === choice;
                const isCorrectChoice = submitted && choice === question.correctAnswer;
                const isWrongPick = submitted && active && !isCorrectChoice;
                return (
                  <button
                    key={choice}
                    disabled={submitted}
                    onClick={() => setPicked(choice)}
                    className={`flex items-start gap-3 rounded-lg border p-4 text-left transition ${
                      isCorrectChoice ? "border-green bg-greenSoft" : isWrongPick ? "border-rose bg-roseSoft" : active ? "border-violet bg-violetSoft" : "border-border bg-surface2 hover:border-violet"
                    }`}
                  >
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white text-xs font-bold">{String.fromCharCode(65 + index)}</span>
                    <span className="flex-1 text-sm leading-6">{choice}</span>
                    {isCorrectChoice ? <Check size={18} /> : null}
                    {isWrongPick ? <X size={18} /> : null}
                  </button>
                );
              })}
            </div>

            {!submitted ? (
              <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
                <div>
                  <div className="label mb-2">Confidence before submitting</div>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((rating) => (
                      <button key={rating} onClick={() => setConfidence(rating as Confidence)} className={`rounded-lg border px-3 py-2 text-sm font-bold ${confidence === rating ? "border-violet bg-violetSoft text-violetDeep" : "border-border bg-surface"}`}>
                        {rating}
                      </button>
                    ))}
                  </div>
                </div>
                <Button variant="accent" onClick={submit} disabled={!picked} className={!picked ? "opacity-50" : ""}>Check answer</Button>
              </div>
            ) : (
              <div className="mt-6 space-y-4">
                <div className={`rounded-lg border p-4 ${correct ? "border-green bg-greenSoft" : "border-rose bg-roseSoft"}`}>
                  <div className="font-bold">{correct ? "Good. Keep that pattern." : `Not yet. Correct answer: ${question.correctAnswer}`}</div>
                  <p className="mt-2 text-sm leading-6 text-ink2">{question.explanation}</p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Button variant="primary" iconRight={ArrowRight} onClick={nextQuestion}>{sessionAnswered >= 5 ? "Keep going" : "Next question"}</Button>
                  <Link href="/plan" className="btn btn-ghost">See full plan</Link>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </Shell>
  );
}
