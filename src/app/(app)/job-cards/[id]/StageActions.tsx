"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { JOB_STAGES, STAGE_LABEL, JobStage, nextStage } from "@/lib/jobcard";

export default function StageActions({ jobCardId, currentStage }: { jobCardId: number; currentStage: string }) {
  const [note, setNote] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  const next = nextStage(currentStage);

  const move = (stage: JobStage) => {
    setMsg(null);
    start(async () => {
      const res = await fetch(`/api/job-cards/${jobCardId}/stage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage, note }),
      });
      if (res.ok) { setNote(""); router.refresh(); }
      else { const d = await res.json().catch(() => ({})); setMsg(d.error ?? "Failed"); }
    });
  };

  return (
    <div className="card p-4">
      <h2 className="font-semibold text-sm mb-3">Advance Stage</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
        <div className="md:col-span-2">
          <label className="label">Note (optional)</label>
          <input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="What was done in this stage?" />
        </div>
        <div>
          {next ? (
            <button className="btn-primary w-full" onClick={() => move(next)} disabled={pending}>
              → Move to {STAGE_LABEL[next]}
            </button>
          ) : (
            <div className="text-sm text-green-700 font-semibold text-center py-2">✅ Job complete</div>
          )}
        </div>
      </div>
      <div className="mt-3 text-xs text-gray-600">
        Jump to any stage: {" "}
        {JOB_STAGES.map((s) => (
          <button
            key={s}
            className="mr-2 px-2 py-0.5 rounded border border-gray-300 text-xs hover:bg-gray-100 disabled:opacity-50"
            onClick={() => move(s)}
            disabled={pending || s === currentStage}
          >
            {STAGE_LABEL[s]}
          </button>
        ))}
      </div>
      {msg && <div className="text-sm text-red-600 mt-2">{msg}</div>}
    </div>
  );
}
