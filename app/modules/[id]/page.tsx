import { notFound } from "next/navigation";
import { ArrowRight, Check, Flag } from "lucide-react";
import { modules } from "@/data/modules";
import { questions } from "@/data/questions";
import { Badge, LinkButton, ModuleGlyph, ProgressBar, Shell } from "@/components/ui";

export function generateStaticParams() {
  return modules.map((module) => ({ id: module.id }));
}

export default async function ModuleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const module = modules.find((item) => item.id === id);
  if (!module) notFound();
  const moduleQuestions = questions.filter((question) => question.moduleId === module.id);

  return (
    <Shell>
      <div className="space-y-7">
        <section className="flex flex-wrap items-start gap-4">
          <ModuleGlyph module={module} />
          <div className="max-w-3xl flex-1">
            <div className="flex flex-wrap gap-2">
              <Badge>{module.section === "rw" ? "Reading and Writing" : "Math"}</Badge>
              <Badge tone={module.impact === "High" ? "rose" : "amber"} icon={Flag}>{module.impact} score impact</Badge>
              <Badge tone={module.completed ? "green" : "violet"} icon={module.completed ? Check : undefined}>{module.completed ? "Completed" : "In progress"}</Badge>
            </div>
            <h1 className="page-title mt-4">{module.name}</h1>
            <p className="page-sub">{module.overview}</p>
          </div>
          <div className="card card-pad min-w-56">
            <div className="label">Confidence rating</div>
            <div className="display mt-2 text-4xl">{module.confidence}/5</div>
            <div className="mt-3">
              <ProgressBar value={module.progress} tone="bg-violet" />
            </div>
            <p className="mt-2 text-xs font-semibold text-muted">{module.progress}% complete · {module.practiced} questions</p>
          </div>
        </section>

        <section className="grid gap-5 lg:grid-cols-[1.1fr_.9fr]">
          <div className="card card-pad-lg">
            <Badge tone="violet">Lesson overview</Badge>
            <h2 className="display mt-4 text-3xl">What to know first</h2>
            <p className="mt-3 leading-7 text-ink2">{module.overview}</p>
            <h3 className="display mt-6 text-xl">Strategy notes</h3>
            <div className="mt-3 grid gap-3">
              {module.strategyNotes.map((note, index) => (
                <div key={note} className="flex gap-3 rounded-lg bg-surface2 p-3">
                  <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-ink text-sm font-bold text-bg">{index + 1}</div>
                  <p className="text-sm leading-6 text-ink2">{note}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="card card-pad-lg bg-pinkSoft">
            <Badge tone="rose">Worked example</Badge>
            <h2 className="display mt-4 text-2xl">{module.workedExample.prompt}</h2>
            <ol className="mt-4 space-y-3 text-sm leading-6 text-ink2">
              {module.workedExample.steps.map((step) => <li key={step}>{step}</li>)}
            </ol>
            <div className="mt-5 rounded-lg bg-white/70 p-4 text-sm font-semibold text-ink">Answer: {module.workedExample.answer}</div>
          </div>
        </section>

        <section className="card card-pad-lg">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="display text-2xl">Practice questions</h2>
              <p className="mt-1 text-sm text-muted">Instant answer feedback and confidence check included.</p>
            </div>
            <LinkButton href={`/practice?module=${module.id}`} variant="accent" iconRight={ArrowRight}>Start practice</LinkButton>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {moduleQuestions.map((question) => (
              <div key={question.id} className="rounded-lg border border-border bg-surface2 p-4">
                <Badge tone={question.difficulty === "Easy" ? "green" : question.difficulty === "Medium" ? "amber" : "rose"}>{question.difficulty}</Badge>
                <p className="mt-3 text-sm font-semibold leading-6">{question.skillTag}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </Shell>
  );
}
