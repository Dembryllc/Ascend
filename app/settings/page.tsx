"use client";

import { useState } from "react";
import { Shield, Trash2 } from "lucide-react";
import { deleteAscendData } from "@/lib/storage";
import { Badge, Button, Shell } from "@/components/ui";

export default function SettingsPage() {
  const [deleted, setDeleted] = useState(false);

  function handleDelete() {
    deleteAscendData();
    setDeleted(true);
  }

  return (
    <Shell>
      <div className="max-w-3xl space-y-6">
        <div>
          <Badge tone="violet" icon={Shield}>Data privacy</Badge>
          <h1 className="page-title mt-4">Settings and privacy</h1>
          <p className="page-sub">
            Ascend only stores the information needed to create your study plan. Students can delete uploaded score reports and saved score data at any time. Ascend is designed to support SAT preparation, not to sell student data.
          </p>
        </div>

        <section className="card card-pad-lg">
          <h2 className="display text-2xl">What this MVP stores</h2>
          <div className="mt-4 grid gap-3 text-sm leading-6 text-ink2">
            <div className="rounded-lg bg-surface2 p-4">Score numbers, target score, percentiles if entered, test date, and domain performance bands.</div>
            <div className="rounded-lg bg-surface2 p-4">Practice progress, confidence ratings, accuracy, completed modules, and time spent.</div>
            <div className="rounded-lg bg-surface2 p-4">PDF upload is a placeholder in this local MVP; no external parser or paid API is called.</div>
          </div>
        </section>

        <section className="card card-pad-lg border-rose/30">
          <h2 className="display text-2xl">Delete saved data</h2>
          <p className="mt-2 text-sm leading-6 text-muted">This clears locally saved score and progress data from this browser. Mock starter data will still appear as the fallback demo state.</p>
          <Button variant="ghost" icon={Trash2} className="mt-5 border-rose/40 text-rose" onClick={handleDelete}>Delete local Ascend data</Button>
          {deleted ? <Badge tone="green" className="ml-3">Local data deleted</Badge> : null}
        </section>
      </div>
    </Shell>
  );
}
