"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowRight, Check, Flag, X } from "lucide-react";
import { modules } from "@/data/modules";
import { questions } from "@/data/questions";
import { Badge, Button, ProgressBar, Shell } from "@/components/ui";

function PracticeContent() {
  const search = useSearchParams();
  const moduleId = search.get("module") ?? "craft";
  const filtered = questions.filter((question) => question.moduleId === moduleId);
  const queue = filtered.length ? filtered : questions;
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [confidence, setConfidence] = useState<number | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [answered, setAnswered] = useState(0);
  const question = queue[index % queue.length];
  const module = useMemo(() => modules.find((item) => item.id === question.moduleId), [question.moduleId]);
  const isCorrect = picked === question.correctAnswer;

  function submit() {
    if (!picked) return;
    setSubmitted(true);
    setAnswered((value) => value + 1);
    if (picked === question.correctAnswer) setCorrectCount((value) => value + 1);
  }

  function next() {
    setIndex((value) => value + 1);
    setPicked(null);
    setSubmitted(false);
    setConfidence(null);
  }

  return (
    <Shell>
      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <section className="card card-pad-lg">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              <Badge tone="violet">{module?.name ?? "Practice"}</Badge>
              <Badge tone={question.difficulty === "Easy" ? "green" : question.difficulty === "Medium" ? "amber" : "rose"}>{question.difficulty}</Badge>
              <Badge>{question.skillTag}</Badge>
            </div>
            <div className="w-40">
              <ProgressBar value={(index % queue.length) + 1} max={queue.length} tone="bg-violet" />
            </div>
          </div>

          <h1 className="display text-2xl leading-tight md:text-3xl">{question.questionText}</h1>
          <div className="mt-6 grid gap-3">
            {question.choices.map((choice) => {
              const active = picked === choice;
              const correct = submitted && choice === question.correctAnswer;
              const wrong = submitted && active && !correct;
              return (
                <button
                  key={choice}
                  disabled={submitted}
                  onClick={() => setPicked(choice)}
                  className={`flex items-start gap-3 rounded-lg border p-4 text-left transition ${
                    correct ? "border-green bg-greenSoft" : wrong ? "border-rose bg-roseSoft" : active ? "border-violet bg-violetSoft" : "border-border bg-surface2 hover:border-violet/50"
                  }`}
                >
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white text-xs font-bold">{String.fromCharCode(65 + question.choices.indexOf(choice))}</span>
                  <span className="flex-1 text-sm leading-6">{choice}</span>
                  {correct ? <Check size={18} /> : null}
                  {wrong ? <X size={18} /> : null}
                </button>
              );
            })}
          </div>

          {!submitted ? (
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
              <button className="flex items-center gap-2 text-sm font-semibold text-muted"><Flag size={15} /> Flag for review</button>
              <Button variant="accent" iconRight={ArrowRight} onClick={submit} disabled={!picked} className={!picked ? "opacity-50" : ""}>Submit answer</Button>
            </div>
          ) : (
            <div className="mt-6 space-y-4">
              <div className={`rounded-lg border p-4 ${isCorrect ? "border-green bg-greenSoft" : "border-rose bg-roseSoft"}`}>
                <div className="font-bold">{isCorrect ? "Nice, that is right." : `Not quite. Correct answer: ${question.correctAnswer}`}</div>
                <p className="mt-2 text-sm leading-6 text-ink2">{question.explanation}</p>
              </div>
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <div className="mb-2 text-xs font-bold uppercase tracking-[0.06em] text-muted">How confident did you feel?</div>
                  <div className="flex flex-wrap gap-2">
                    {[1, 2, 3, 4, 5].map((rating) => (
                      <button key={rating} onClick={() => setConfidence(rating)} className={`rounded-lg border px-3 py-2 text-sm font-semibold ${confidence === rating ? "border-violet bg-violetSoft text-violetDeep" : "border-border bg-surface"}`}>
                        {rating}
                      </button>
                    ))}
                  </div>
                </div>
                <Button variant="primary" iconRight={ArrowRight} onClick={next}>Next question</Button>
              </div>
            </div>
          )}
        </section>

        <aside className="space-y-4">
          <div className="card card-pad">
            <div className="label">This session</div>
            <div className="display mt-2 text-4xl">{answered ? Math.round((correctCount / answered) * 100) : 0}%</div>
            <p className="mt-2 text-sm text-muted">{correctCount} correct · {answered} answered</p>
          </div>
          <div className="card card-pad bg-violetSoft">
            <div className="label text-violetDeep">Coach note</div>
            <p className="mt-3 text-sm leading-6 text-violetDeep">Read the question goal first, then answer. The SAT rewards calm matching more than speed on the first pass.</p>
          </div>
        </aside>
      </div>
    </Shell>
  );
}

export default function PracticePage() {
  return (
    <Suspense fallback={<Shell><div className="card card-pad-lg">Loading practice...</div></Shell>}>
      <PracticeContent />
    </Suspense>
  );
}
