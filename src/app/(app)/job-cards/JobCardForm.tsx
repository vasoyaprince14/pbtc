"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type Product = { id: number; sku: string; name: string; unit: string };
type SOData = {
  id: number; soNo: string; customerName: string;
  items: { id: number; productId: number; productName: string; orderedQty: number; remainingQty: number }[];
};

export default function JobCardForm({
  products, salesOrders, initial,
}: {
  products: Product[];
  salesOrders: SOData[];
  initial: {
    cardNo: string;
    productId: number;
    salesOrderId: number | null;
    quantity: number;
    operator: string;
    machine: string;
    startedAt: string;
    targetDate: string;
    notes: string;
  };
}) {
  const [cardNo] = useState(initial.cardNo);
  const [productId, setProductId] = useState(initial.productId);
  const [salesOrderId, setSalesOrderId] = useState(initial.salesOrderId ?? 0);
  const [quantity, setQuantity] = useState(initial.quantity);
  const [operator, setOperator] = useState(initial.operator);
  const [machine, setMachine] = useState(initial.machine);
  const [startedAt, setStartedAt] = useState(initial.startedAt);
  const [targetDate, setTargetDate] = useState(initial.targetDate);
  const [notes, setNotes] = useState(initial.notes);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  const selectedSO = useMemo(() => salesOrders.find((s) => s.id === salesOrderId), [salesOrders, salesOrderId]);

  const submit = () => {
    setMsg(null);
    if (!productId) { setMsg("Select a product"); return; }
    if (quantity <= 0) { setMsg("Quantity must be > 0"); return; }
    start(async () => {
      const res = await fetch("/api/job-cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cardNo, productId, salesOrderId: salesOrderId || null,
          quantity, operator, machine, startedAt, targetDate, notes,
        }),
      });
      if (res.ok) {
        const d = await res.json();
        router.push(`/job-cards/${d.id}`);
        router.refresh();
      } else {
        const d = await res.json().catch(() => ({}));
        setMsg(d.error ?? "Save failed");
      }
    });
  };

  return (
    <div className="card p-5 space-y-4 max-w-3xl">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="label">Card No</label>
          <input className="input font-mono" value={cardNo} readOnly />
        </div>
        <div>
          <label className="label">Sales Order (optional)</label>
          <select className="input" value={salesOrderId} onChange={(e) => {
            const id = Number(e.target.value);
            setSalesOrderId(id);
            const so = salesOrders.find((s) => s.id === id);
            if (so && so.items.length > 0) {
              const item = so.items.find((i) => i.remainingQty > 0) ?? so.items[0];
              setProductId(item.productId);
              setQuantity(item.remainingQty || item.orderedQty);
            }
          }}>
            <option value="0">-- Standalone (no SO) --</option>
            {salesOrders.map((so) => (
              <option key={so.id} value={so.id}>{so.soNo} — {so.customerName}</option>
            ))}
          </select>
          {selectedSO && (
            <div className="text-xs text-gray-600 mt-1">
              For: {selectedSO.customerName}
              <div className="text-[11px] mt-0.5">
                Pending items: {selectedSO.items.filter((i) => i.remainingQty > 0).map((i) => `${i.productName} (${i.remainingQty})`).join(", ") || "none"}
              </div>
            </div>
          )}
        </div>
        <div>
          <label className="label">Product *</label>
          <select className="input" value={productId} onChange={(e) => setProductId(Number(e.target.value))}>
            <option value="0">-- Select --</option>
            {products.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
          </select>
        </div>
        <div>
          <label className="label">Quantity to Produce *</label>
          <input type="number" step="0.01" className="input" value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} />
        </div>
        <div>
          <label className="label">Machine</label>
          <input className="input" value={machine} onChange={(e) => setMachine(e.target.value)} placeholder="e.g. CNC-1, Turret-2" />
        </div>
        <div>
          <label className="label">Operator</label>
          <input className="input" value={operator} onChange={(e) => setOperator(e.target.value)} />
        </div>
        <div>
          <label className="label">Start Date</label>
          <input type="date" className="input" value={startedAt} onChange={(e) => setStartedAt(e.target.value)} />
        </div>
        <div>
          <label className="label">Target Completion</label>
          <input type="date" className="input" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />
        </div>
        <div className="md:col-span-2">
          <label className="label">Notes</label>
          <textarea className="input" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Special instructions, tooling, material spec…" />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button className="btn-primary" onClick={submit} disabled={pending}>{pending ? "Saving…" : "Create Job Card"}</button>
        <button className="btn-secondary" onClick={() => router.back()}>Cancel</button>
        {msg && <span className="text-sm text-red-600">{msg}</span>}
      </div>
    </div>
  );
}
