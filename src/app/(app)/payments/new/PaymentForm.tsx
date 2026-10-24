"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type Party = { id: number; name: string };

export default function PaymentForm({
  customers, suppliers, defaultDate,
}: {
  customers: Party[];
  suppliers: Party[];
  defaultDate: string;
}) {
  const [type, setType] = useState<"RECEIVED" | "PAID">("RECEIVED");
  const [partyId, setPartyId] = useState(0);
  const [paidOn, setPaidOn] = useState(defaultDate);
  const [amount, setAmount] = useState(0);
  const [mode, setMode] = useState("Cash");
  const [refNo, setRefNo] = useState("");
  const [notes, setNotes] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  const parties = type === "RECEIVED" ? customers : suppliers;

  const submit = () => {
    setMsg(null);
    if (!partyId) { setMsg(type === "RECEIVED" ? "Select customer" : "Select supplier"); return; }
    if (amount <= 0) { setMsg("Amount must be > 0"); return; }
    start(async () => {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type, paidOn, amount, mode, refNo, notes,
          customerId: type === "RECEIVED" ? partyId : null,
          supplierId: type === "PAID" ? partyId : null,
        }),
      });
      if (res.ok) {
        router.push("/payments");
        router.refresh();
      } else {
        const d = await res.json().catch(() => ({}));
        setMsg(d.error ?? "Save failed");
      }
    });
  };

  return (
    <div className="card p-5 space-y-4 max-w-2xl">
      <div className="flex gap-3">
        <button className={`btn ${type === "RECEIVED" ? "bg-green-600 text-white" : "bg-gray-100"}`} onClick={() => { setType("RECEIVED"); setPartyId(0); }}>Money Received (from Customer)</button>
        <button className={`btn ${type === "PAID" ? "bg-red-600 text-white" : "bg-gray-100"}`} onClick={() => { setType("PAID"); setPartyId(0); }}>Money Paid (to Supplier)</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="label">{type === "RECEIVED" ? "Customer" : "Supplier"} *</label>
          <select className="input" value={partyId} onChange={(e) => setPartyId(Number(e.target.value))}>
            <option value="0">-- Select --</option>
            {parties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Date</label>
          <input type="date" className="input" value={paidOn} onChange={(e) => setPaidOn(e.target.value)} />
        </div>
        <div>
          <label className="label">Amount (₹) *</label>
          <input type="number" step="0.01" className="input" value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
        </div>
        <div>
          <label className="label">Payment Mode</label>
          <select className="input" value={mode} onChange={(e) => setMode(e.target.value)}>
            {["Cash", "Bank Transfer", "UPI", "Cheque", "Card"].map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Reference No (Cheque/UTR)</label>
          <input className="input" value={refNo} onChange={(e) => setRefNo(e.target.value)} />
        </div>
        <div className="md:col-span-2">
          <label className="label">Notes</label>
          <textarea className="input" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button className="btn-primary" onClick={submit} disabled={pending}>{pending ? "Saving…" : "Save Payment"}</button>
        <button className="btn-secondary" onClick={() => router.back()}>Cancel</button>
        {msg && <span className="text-sm text-red-600">{msg}</span>}
      </div>
    </div>
  );
}
