"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export default function DangerZone() {
  const [confirmText, setConfirmText] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();

  const armed = confirmText === "CLEAR";

  const clearAll = () => {
    if (!armed) return;
    if (!confirm("Last check — this permanently deletes ALL products, parties and transactions. Continue?")) return;
    setMsg(null);
    start(async () => {
      const res = await fetch("/api/admin/clear", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: "CLEAR" }),
      });
      const d = await res.json().catch(() => ({}));
      if (res.ok) {
        setErr(false);
        setMsg(d.message ?? "All data cleared.");
        setConfirmText("");
        router.refresh();
      } else {
        setErr(true);
        setMsg(d.error ?? "Clear failed");
      }
    });
  };

  return (
    <div className="card p-5 border-red-300 border">
      <h2 className="font-semibold text-red-700">Danger Zone</h2>
      <p className="text-sm text-gray-700 mt-2">
        Permanently deletes <strong>all</strong> products, customers, suppliers, invoices, purchases,
        challans, quotations, sales orders, job cards, payments, stock history and uploaded files.
      </p>
      <p className="text-sm text-gray-700 mt-1">
        Your shop settings and user logins are kept, so you stay signed in. <strong>This cannot be undone</strong> —
        download a backup first.
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <input
          className="input max-w-xs"
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          placeholder="Type CLEAR to enable"
          aria-label="Type CLEAR to confirm"
        />
        <button
          type="button"
          className="px-4 py-2 rounded text-white bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed"
          onClick={clearAll}
          disabled={!armed || pending}
        >
          {pending ? "Clearing…" : "Clear All Data"}
        </button>
        {msg && <span className={`text-sm ${err ? "text-red-700" : "text-green-700"}`}>{msg}</span>}
      </div>
    </div>
  );
}
