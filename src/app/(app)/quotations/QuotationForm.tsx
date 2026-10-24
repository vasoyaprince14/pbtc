"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { calcLineTax, sumTotals } from "@/lib/gst";
import { inr } from "@/lib/format";

type Customer = { id: number; name: string; gstin: string; stateCode: string; stateName: string; city: string };
type Product = { id: number; sku: string; name: string; hsnCode: string; unit: string; gstRate: number; salePrice: number };

type LineItem = {
  productId: number; description: string; hsnCode: string; quantity: number; rate: number;
  discount: number; gstRate: number; unit: string; deliveryDays: number;
};

const emptyLine = (): LineItem => ({
  productId: 0, description: "", hsnCode: "", quantity: 1, rate: 0,
  discount: 0, gstRate: 18, unit: "PCS", deliveryDays: 15,
});

export default function QuotationForm({
  customers, products, shopStateCode, initial, isEdit, quotationId,
}: {
  customers: Customer[];
  products: Product[];
  shopStateCode: string;
  initial: {
    quotationNo: string;
    quotationDate: string;
    validUntil: string;
    customerId: number;
    items: LineItem[];
    paymentTerms: string;
    deliveryTerms: string;
    notes: string;
    status: string;
  };
  isEdit?: boolean;
  quotationId?: number;
}) {
  const [quotationNo] = useState(initial.quotationNo);
  const [quotationDate, setQuotationDate] = useState(initial.quotationDate);
  const [validUntil, setValidUntil] = useState(initial.validUntil);
  const [customerId, setCustomerId] = useState(initial.customerId);
  const [items, setItems] = useState<LineItem[]>(initial.items.length ? initial.items : [emptyLine()]);
  const [paymentTerms, setPaymentTerms] = useState(initial.paymentTerms);
  const [deliveryTerms, setDeliveryTerms] = useState(initial.deliveryTerms);
  const [notes, setNotes] = useState(initial.notes);
  const [status, setStatus] = useState(initial.status);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  const customer = customers.find((c) => c.id === customerId);
  const isInterState = !!(customer && customer.stateCode && customer.stateCode !== shopStateCode);

  const lineTaxes = useMemo(
    () => items.map((it) => calcLineTax({ quantity: it.quantity, rate: it.rate, discount: it.discount, gstRate: it.gstRate }, isInterState)),
    [items, isInterState]
  );
  const totals = useMemo(() => sumTotals(lineTaxes), [lineTaxes]);

  const setLine = (idx: number, patch: Partial<LineItem>) =>
    setItems((r) => r.map((row, i) => (i === idx ? { ...row, ...patch } : row)));

  const pickProduct = (idx: number, id: number) => {
    const p = products.find((x) => x.id === id);
    if (!p) return;
    setLine(idx, { productId: p.id, hsnCode: p.hsnCode, rate: p.salePrice, gstRate: p.gstRate, unit: p.unit, description: p.name });
  };

  const submit = () => {
    setMsg(null);
    if (!customerId) { setMsg("Select a customer"); return; }
    const clean = items.filter((i) => i.productId && i.quantity > 0);
    if (clean.length === 0) { setMsg("Add at least one item"); return; }

    start(async () => {
      const url = isEdit ? `/api/quotations/${quotationId}` : "/api/quotations";
      const method = isEdit ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quotationNo, quotationDate, validUntil, customerId, items: clean,
          paymentTerms, deliveryTerms, notes, status, isInterState,
        }),
      });
      if (res.ok) {
        const d = await res.json();
        router.push(`/quotations/${d.id}`);
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
            <label className="label">Quote No</label>
            <input className="input font-mono" value={quotationNo} readOnly />
          </div>
          <div>
            <label className="label">Date *</label>
            <input type="date" className="input" value={quotationDate} onChange={(e) => setQuotationDate(e.target.value)} />
          </div>
          <div>
            <label className="label">Valid Until</label>
            <input type="date" className="input" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
          </div>
          <div>
            <label className="label">Status</label>
            <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="draft">Draft</option>
              <option value="sent">Sent</option>
              <option value="accepted">Accepted</option>
              <option value="rejected">Rejected</option>
              <option value="expired">Expired</option>
            </select>
          </div>
          <div className="md:col-span-4">
            <label className="label">Customer *</label>
            <select className="input" value={customerId} onChange={(e) => setCustomerId(Number(e.target.value))}>
              <option value="0">-- Select Customer --</option>
              {customers.map((c) => <option key={c.id} value={c.id}>{c.name}{c.city ? ` — ${c.city}` : ""}</option>)}
            </select>
            {customer && (
              <div className="text-xs text-gray-600 mt-1">
                {customer.stateName && <span>State: {customer.stateName} ({customer.stateCode})</span>}
                {" • "}
                <span className={isInterState ? "text-blue-700" : "text-green-700"}>
                  {isInterState ? "IGST" : "CGST + SGST"}
                </span>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="card overflow-hidden">
        <div className="p-3 border-b bg-gray-50 flex justify-between items-center">
          <h2 className="font-semibold text-sm">Line Items</h2>
          <button type="button" className="btn-secondary text-xs" onClick={() => setItems((r) => [...r, emptyLine()])}>+ Add Row</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px]">
            <thead>
              <tr>
                <th className="th w-8">#</th>
                <th className="th">Product / Description</th>
                <th className="th">HSN</th>
                <th className="th text-right w-20">Qty</th>
                <th className="th w-16">Unit</th>
                <th className="th text-right w-24">Rate</th>
                <th className="th text-right w-16">GST%</th>
                <th className="th text-right w-20">Delivery (days)</th>
                <th className="th text-right w-28">Total</th>
                <th className="th w-8"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((it, i) => {
                const t = lineTaxes[i];
                return (
                  <tr key={i}>
                    <td className="td text-xs">{i + 1}</td>
                    <td className="td">
                      <select className="input py-1" value={it.productId} onChange={(e) => pickProduct(i, Number(e.target.value))}>
                        <option value="0">-- Select --</option>
                        {products.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
                      </select>
                      <input
                        className="input py-1 text-xs mt-1"
                        placeholder="Description / spec (optional, shown on PDF)"
                        value={it.description}
                        onChange={(e) => setLine(i, { description: e.target.value })}
                      />
                    </td>
                    <td className="td"><input className="input py-1 font-mono text-xs" value={it.hsnCode} onChange={(e) => setLine(i, { hsnCode: e.target.value })} /></td>
                    <td className="td"><input type="number" step="0.01" className="input py-1 text-right" value={it.quantity} onChange={(e) => setLine(i, { quantity: Number(e.target.value) })} /></td>
                    <td className="td text-xs">{it.unit}</td>
                    <td className="td"><input type="number" step="0.01" className="input py-1 text-right" value={it.rate} onChange={(e) => setLine(i, { rate: Number(e.target.value) })} /></td>
                    <td className="td">
                      <select className="input py-1 text-right" value={it.gstRate} onChange={(e) => setLine(i, { gstRate: Number(e.target.value) })}>
                        {[0, 5, 12, 18, 28].map((g) => <option key={g} value={g}>{g}</option>)}
                      </select>
                    </td>
                    <td className="td"><input type="number" className="input py-1 text-right" value={it.deliveryDays} onChange={(e) => setLine(i, { deliveryDays: Number(e.target.value) })} /></td>
                    <td className="td text-right font-medium">{inr(t.total)}</td>
                    <td className="td">
                      {items.length > 1 && (
                        <button type="button" className="text-red-600 text-lg" onClick={() => setItems((r) => r.filter((_, x) => x !== i))}>×</button>
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
          <h2 className="font-semibold text-sm">Terms &amp; Notes</h2>
          <div>
            <label className="label">Payment Terms</label>
            <textarea className="input" rows={2} value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)} />
          </div>
          <div>
            <label className="label">Delivery Terms</label>
            <textarea className="input" rows={2} value={deliveryTerms} onChange={(e) => setDeliveryTerms(e.target.value)} />
          </div>
          <div>
            <label className="label">Notes</label>
            <textarea className="input" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </section>
        <section className="card p-4">
          <h2 className="font-semibold text-sm mb-3">Summary</h2>
          <div className="space-y-1 text-sm">
            <Row label="Sub Total (Taxable)" value={inr(totals.subTotal)} />
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
        <button className="btn-primary" onClick={submit} disabled={pending}>{pending ? "Saving…" : (isEdit ? "Update" : "Save Quotation")}</button>
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
