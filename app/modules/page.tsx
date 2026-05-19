import { modules } from "@/data/modules";
import { Badge, ModuleCard, Shell } from "@/components/ui";

export default function ModulesPage() {
  const rw = modules.filter((module) => module.section === "rw");
  const math = modules.filter((module) => module.section === "math");

  return (
    <Shell>
      <div className="space-y-8">
        <div>
          <Badge tone="violet">SAT skill modules</Badge>
          <h1 className="page-title mt-4">Module library</h1>
          <p className="page-sub">Eight focused modules mapped to the digital SAT Knowledge and Skills domains.</p>
        </div>

        <section>
          <h2 className="display mb-4 text-3xl">Reading and Writing</h2>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {rw.map((module) => <ModuleCard key={module.id} module={module} />)}
          </div>
        </section>

        <section>
          <h2 className="display mb-4 text-3xl">Math</h2>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {math.map((module) => <ModuleCard key={module.id} module={module} />)}
          </div>
        </section>
      </div>
    </Shell>
  );
}
