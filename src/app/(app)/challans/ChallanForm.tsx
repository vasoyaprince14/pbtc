"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type Customer = { id: number; name: string; city: string };
type Product = { id: number; sku: string; name: string; unit: string };

type LineItem = { productId: number; quantity: number; remarks: string; unit: string; productName: string };
const emptyLine = (): LineItem => ({ productId: 0, quantity: 1, remarks: "", unit: "PCS", productName: "" });

const PURPOSES = ["Job Work", "For Approval", "Sample", "Return", "Repair", "Sale on Approval", "Other"];

export default function ChallanForm({
  customers, products, initial,
}: {
  customers: Customer[];
  products: Product[];
  initial: {
    challanNo: string;
    challanDate: string;
    customerId: number;
    purpose: string;
    vehicleNo: string;
    transporter: string;
    notes: string;
    items: LineItem[];
  };
}) {
  const [challanNo] = useState(initial.challanNo);
  const [challanDate, setChallanDate] = useState(initial.challanDate);
  const [customerId, setCustomerId] = useState(initial.customerId);
  const [purpose, setPurpose] = useState(initial.purpose);
  const [vehicleNo, setVehicleNo] = useState(initial.vehicleNo);
  const [transporter, setTransporter] = useState(initial.transporter);
  const [notes, setNotes] = useState(initial.notes);
  const [items, setItems] = useState<LineItem[]>(initial.items.length ? initial.items : [emptyLine()]);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  const setLine = (idx: number, patch: Partial<LineItem>) =>
    setItems((r) => r.map((row, i) => (i === idx ? { ...row, ...patch } : row)));

  const pickProduct = (idx: number, id: number) => {
    const p = products.find((x) => x.id === id);
    if (!p) return;
    setLine(idx, { productId: p.id, productName: p.name, unit: p.unit });
  };

  const submit = () => {
    setMsg(null);
    if (!customerId) { setMsg("Select a customer"); return; }
    const clean = items.filter((i) => i.productId && i.quantity > 0);
    if (clean.length === 0) { setMsg("Add at least one valid item"); return; }
    start(async () => {
      const res = await fetch("/api/challans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          challanNo, challanDate, customerId, purpose, vehicleNo, transporter, notes,
          items: clean.map((c) => ({ productId: c.productId, quantity: c.quantity, remarks: c.remarks })),
        }),
      });
      if (res.ok) {
        const d = await res.json();
        router.push(`/challans/${d.id}/print`);
      } else {
        const d = await res.json().catch(() => ({}));
        setMsg(d.error ?? "Save failed");
      }
    });
  };

  return (
    <div className="space-y-4">
      <section className="card p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <label className="label">Challan No</label>
            <input className="input font-mono" value={challanNo} readOnly />
          </div>
          <div>
            <label className="label">Date *</label>
            <input type="date" className="input" value={challanDate} onChange={(e) => setChallanDate(e.target.value)} />
          </div>
          <div>
            <label className="label">Customer *</label>
            <select className="input" value={customerId} onChange={(e) => setCustomerId(Number(e.target.value))}>
              <option value="0">-- Select --</option>
              {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Purpose *</label>
            <select className="input" value={purpose} onChange={(e) => setPurpose(e.target.value)}>
              {PURPOSES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Vehicle No</label>
            <input className="input" value={vehicleNo} onChange={(e) => setVehicleNo(e.target.value)} />
          </div>
          <div>
            <label className="label">Transporter</label>
            <input className="input" value={transporter} onChange={(e) => setTransporter(e.target.value)} />
          </div>
          <div className="md:col-span-2">
            <label className="label">Notes</label>
            <input className="input" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>
      </section>

      <section className="card overflow-hidden">
        <div className="p-3 border-b border-gray-200 flex justify-between items-center bg-gray-50">
          <h2 className="font-semibold text-gray-800 text-sm">Items</h2>
          <button type="button" onClick={() => setItems((r) => [...r, emptyLine()])} className="btn-secondary text-xs">+ Add Row</button>
        </div>
        <table className="w-full">
          <thead>
            <tr>
              <th className="th w-8">#</th>
              <th className="th">Product</th>
              <th className="th text-right w-24">Qty</th>
              <th className="th w-16">Unit</th>
              <th className="th">Remarks</th>
              <th className="th w-8"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((it, i) => (
              <tr key={i}>
                <td className="td text-xs">{i + 1}</td>
                <td className="td">
                  <select className="input py-1" value={it.productId} onChange={(e) => pickProduct(i, Number(e.target.value))}>
                    <option value="0">-- Select --</option>
                    {products.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
                  </select>
                </td>
                <td className="td"><input type="number" step="0.01" className="input py-1 text-right" value={it.quantity} onChange={(e) => setLine(i, { quantity: Number(e.target.value) })} /></td>
                <td className="td text-xs">{it.unit}</td>
                <td className="td"><input className="input py-1" value={it.remarks} onChange={(e) => setLine(i, { remarks: e.target.value })} /></td>
                <td className="td">
                  {items.length > 1 && (
                    <button type="button" className="text-red-600 text-lg" onClick={() => setItems((r) => r.filter((_, x) => x !== i))}>×</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <div className="flex items-center gap-3">
        <button className="btn-primary" onClick={submit} disabled={pending}>{pending ? "Saving…" : "Save & Print"}</button>
        <button className="btn-secondary" onClick={() => router.back()}>Cancel</button>
        {msg && <span className="text-sm text-red-600">{msg}</span>}
      </div>
    </div>
  );
}
