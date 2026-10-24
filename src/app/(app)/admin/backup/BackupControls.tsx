"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export default function BackupControls() {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const router = useRouter();

  const createBackup = () => {
    setMsg(null);
    start(async () => {
      const res = await fetch("/api/backup/create", { method: "POST" });
      if (res.ok) {
        const d = await res.json();
        setMsg(`Backup created: ${d.name}`);
        router.refresh();
      } else {
        const d = await res.json().catch(() => ({}));
        setMsg(d.error ?? "Backup failed");
      }
    });
  };

  return (
    <div className="mt-4 flex flex-wrap items-center gap-3">
      <button className="btn-primary" onClick={createBackup} disabled={pending}>
        {pending ? "Creating…" : "💾 Create Backup Now"}
      </button>
      <a href="/api/backup/download" className="btn-secondary">⬇ Download Live DB</a>
      {msg && <span className="text-sm text-green-700">{msg}</span>}
    </div>
  );
}
