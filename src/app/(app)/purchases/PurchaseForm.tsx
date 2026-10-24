"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { calcLineTax, sumTotals } from "@/lib/gst";
import { inr } from "@/lib/format";

type Supplier = {
  id: number; name: string; gstin: string; stateCode: string; stateName: string;
};
type Product = {
  id: number; sku: string; name: string; hsnCode: string; unit: string;
  gstRate: number; purchasePrice: number;
};

type LineItem = {
  productId: number;
  hsnCode: string;
  quantity: number;
  rate: number;
  discount: number;
  gstRate: number;
  unit: string;
  productName: string;
};

const emptyLine = (): LineItem => ({
  productId: 0, hsnCode: "", quantity: 1, rate: 0, discount: 0, gstRate: 18, unit: "PCS", productName: "",
});

export default function PurchaseForm({
  suppliers, products, shopStateCode, initial,
}: {
  suppliers: Supplier[];
  products: Product[];
  shopStateCode: string;
  initial: {
    billNo: string;
    supplierBillNo: string;
    billDate: string;
    supplierId: number;
    items: LineItem[];
    discount: number;
    notes: string;
    paidAmount: number;
  };
}) {
  const [billNo] = useState(initial.billNo);
  const [supplierBillNo, setSupplierBillNo] = useState(initial.supplierBillNo);
  const [billDate, setBillDate] = useState(initial.billDate);
  const [supplierId, setSupplierId] = useState(initial.supplierId);
  const [items, setItems] = useState<LineItem[]>(initial.items.length ? initial.items : [emptyLine()]);
  const [notes, setNotes] = useState(initial.notes);
  const [paidAmount, setPaidAmount] = useState(initial.paidAmount);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  const supplier = suppliers.find((s) => s.id === supplierId);
  const isInterState = !!(supplier && supplier.stateCode && supplier.stateCode !== shopStateCode);

  const lineTaxes = useMemo(
    () => items.map((it) => calcLineTax({
      quantity: it.quantity, rate: it.rate, discount: it.discount, gstRate: it.gstRate,
    }, isInterState)),
    [items, isInterState]
  );
  const totals = useMemo(() => sumTotals(lineTaxes), [lineTaxes]);

  const setLine = (idx: number, patch: Partial<LineItem>) =>
    setItems((rows) => rows.map((r, i) => (i === idx ? { ...r, ...patch } : r)));

  const pickProduct = (idx: number, productId: number) => {
    const p = products.find((x) => x.id === productId);
    if (!p) return;
    setLine(idx, {
      productId: p.id, productName: p.name, hsnCode: p.hsnCode,
      rate: p.purchasePrice, gstRate: p.gstRate, unit: p.unit,
    });
  };

  const submit = () => {
    setMsg(null);
    if (!supplierId) { setMsg("Select a supplier"); return; }
    const cleanItems = items.filter((i) => i.productId && i.quantity > 0);
    if (cleanItems.length === 0) { setMsg("Add at least one valid item"); return; }
    start(async () => {
      const res = await fetch("/api/purchases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          billNo, supplierBillNo, billDate, supplierId,
          items: cleanItems, notes, paidAmount, isInterState,
        }),
      });
      if (res.ok) {
        const d = await res.json();
        router.push(`/purchases/${d.id}`);
        router.refresh();
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
            <label className="label">Our Bill No</label>
            <input className="input font-mono" value={billNo} readOnly />
          </div>
          <div>
            <label className="label">Supplier's Bill No</label>
            <input className="input" value={supplierBillNo} onChange={(e) => setSupplierBillNo(e.target.value)} />
          </div>
          <div>
            <label className="label">Bill Date *</label>
            <input type="date" className="input" value={billDate} onChange={(e) => setBillDate(e.target.value)} />
          </div>
          <div>
            <label className="label">Supplier *</label>
            <select className="input" value={supplierId} onChange={(e) => setSupplierId(Number(e.target.value))}>
              <option value="0">-- Select --</option>
              {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        </div>
        {supplier && (
          <div className="text-xs text-gray-600 mt-2">
            {supplier.gstin && <span className="font-mono mr-3">GSTIN: {supplier.gstin}</span>}
            {supplier.stateName && <span>State: {supplier.stateName} ({supplier.stateCode})</span>}
            {" • "}
            <span className={isInterState ? "text-blue-700" : "text-green-700"}>
              {isInterState ? "IGST (inter-state)" : "CGST + SGST (intra-state)"}
            </span>
          </div>
        )}
      </section>

      <section className="card overflow-hidden">
        <div className="p-3 border-b border-gray-200 flex justify-between items-center bg-gray-50">
          <h2 className="font-semibold text-gray-800 text-sm">Line Items</h2>
          <button type="button" onClick={() => setItems((r) => [...r, emptyLine()])} className="btn-secondary text-xs">+ Add Row</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead>
              <tr>
                <th className="th w-8">#</th>
                <th className="th">Product</th>
                <th className="th">HSN</th>
                <th className="th text-right w-20">Qty</th>
                <th className="th w-16">Unit</th>
                <th className="th text-right w-24">Rate</th>
                <th className="th text-right w-20">Disc</th>
                <th className="th text-right w-16">GST%</th>
                <th className="th text-right w-28">Total</th>
                <th className="th w-8"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((it, i) => {
                const t = lineTaxes[i];
                return (
                  <tr key={i}>
                    <td className="td text-gray-500 text-xs">{i + 1}</td>
                    <td className="td">
                      <select className="input py-1" value={it.productId} onChange={(e) => pickProduct(i, Number(e.target.value))}>
                        <option value="0">-- Select --</option>
                        {products.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
                      </select>
                    </td>
                    <td className="td"><input className="input py-1 font-mono text-xs" value={it.hsnCode} onChange={(e) => setLine(i, { hsnCode: e.target.value })} /></td>
                    <td className="td"><input type="number" step="0.01" className="input py-1 text-right" value={it.quantity} onChange={(e) => setLine(i, { quantity: Number(e.target.value) })} /></td>
                    <td className="td text-xs">{it.unit}</td>
                    <td className="td"><input type="number" step="0.01" className="input py-1 text-right" value={it.rate} onChange={(e) => setLine(i, { rate: Number(e.target.value) })} /></td>
                    <td className="td"><input type="number" step="0.01" className="input py-1 text-right" value={it.discount} onChange={(e) => setLine(i, { discount: Number(e.target.value) })} /></td>
                    <td className="td">
                      <select className="input py-1 text-right" value={it.gstRate} onChange={(e) => setLine(i, { gstRate: Number(e.target.value) })}>
                        {[0, 5, 12, 18, 28].map((g) => <option key={g} value={g}>{g}</option>)}
                      </select>
                    </td>
                    <td className="td text-right font-medium">{inr(t.total)}</td>
                    <td className="td">
                      {items.length > 1 && (
                        <button type="button" className="text-red-600 hover:text-red-800 text-lg" onClick={() => setItems((r) => r.filter((_, x) => x !== i))}>×</button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <section className="card p-4 space-y-3">
          <h2 className="font-semibold text-gray-800 text-sm">Notes / Payment</h2>
          <div>
            <label className="label">Notes</label>
            <textarea className="input" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <div>
            <label className="label">Amount Paid (₹)</label>
            <input type="number" step="0.01" className="input" value={paidAmount} onChange={(e) => setPaidAmount(Number(e.target.value))} />
          </div>
        </section>
        <section className="card p-4">
          <h2 className="font-semibold text-gray-800 text-sm mb-3">Summary</h2>
          <div className="space-y-1 text-sm">
            <Row label="Sub Total" value={inr(totals.subTotal)} />
            {isInterState
              ? <Row label="IGST" value={inr(totals.igstTotal)} />
              : (<><Row label="CGST" value={inr(totals.cgstTotal)} /><Row label="SGST" value={inr(totals.sgstTotal)} /></>)}
            <Row label="Round Off" value={inr(totals.roundOff)} muted />
            <div className="border-t pt-2 mt-2">
              <Row label="Grand Total" value={inr(totals.grandTotal)} bold />
            </div>
          </div>
        </section>
      </div>

      <div className="flex items-center gap-3 pt-2">
        <button className="btn-primary" onClick={submit} disabled={pending}>{pending ? "Saving…" : "Save Purchase"}</button>
        <button className="btn-secondary" onClick={() => router.back()}>Cancel</button>
        {msg && <span className="text-sm text-red-600">{msg}</span>}
      </div>
    </div>
  );
}

function Row({ label, value, bold, muted }: { label: string; value: string; bold?: boolean; muted?: boolean }) {
  return (
    <div className={`flex justify-between ${bold ? "font-bold text-base" : ""} ${muted ? "text-gray-500 text-xs" : ""}`}>
      <span>{label}</span>
      <span className="font-mono">{value}</span>
    </div>
  );
}
