"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export default function QuotationActions({ quotation }: { quotation: { id: number; status: string; convertedSalesOrderId: number | null } }) {
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  const setStatus = (status: string) => {
    setMsg(null);
    start(async () => {
      const res = await fetch(`/api/quotations/${quotation.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) { setMsg(`Status → ${status}`); router.refresh(); }
      else { const d = await res.json().catch(() => ({})); setMsg(d.error ?? "Update failed"); }
    });
  };

  const convertToSO = () => {
    if (!confirm("Convert this quotation to a Sales Order? Items and prices will be copied.")) return;
    setMsg(null);
    start(async () => {
      const res = await fetch(`/api/quotations/${quotation.id}/convert`, { method: "POST" });
      if (res.ok) {
        const d = await res.json();
        router.push(`/sales-orders/${d.id}`);
      } else {
        const d = await res.json().catch(() => ({}));
        setMsg(d.error ?? "Convert failed");
      }
    });
  };

  return (
    <div className="card p-3 mb-4 flex flex-wrap items-center gap-2">
      <span className="text-xs text-gray-600 mr-2">Change status:</span>
      {["draft", "sent", "accepted", "rejected"].map((s) => (
        <button
          key={s}
          className={`btn ${quotation.status === s ? "bg-brand-600 text-white" : "bg-gray-100"}`}
          onClick={() => setStatus(s)}
          disabled={pending || quotation.status === s || quotation.status === "converted"}
        >
          {s}
        </button>
      ))}
      <div className="ml-auto flex items-center gap-2">
        {quotation.convertedSalesOrderId ? (
          <Link href={`/sales-orders/${quotation.convertedSalesOrderId}`} className="btn-secondary text-sm">
            → View Sales Order
          </Link>
        ) : (
          <button className="btn-primary" onClick={convertToSO} disabled={pending || quotation.status === "rejected"}>
            ✅ Convert to Sales Order
          </button>
        )}
      </div>
      {msg && <span className="text-xs text-gray-700 w-full">{msg}</span>}
    </div>
  );
}
