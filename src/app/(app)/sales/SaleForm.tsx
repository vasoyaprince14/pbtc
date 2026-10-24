"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { calcLineTax, sumTotals } from "@/lib/gst";
import { inr } from "@/lib/format";

type Customer = {
  id: number; name: string; gstin: string; stateCode: string; stateName: string;
  address: string; city: string; pincode: string;
};
type Product = {
  id: number; sku: string; name: string; hsnCode: string; unit: string;
  gstRate: number; salePrice: number; purchasePrice: number;
};

export type SaleFormInitial = {
  invoiceNo: string;
  invoiceDate: string;
  customerId: number;
  items: LineItem[];
  discount: number;
  vehicleNo: string;
  transporter: string;
  transporterGstin?: string;
  distanceKm?: number | null;
  ewayBillNo?: string;
  dispatchAddress?: string;
  notes: string;
  paidAmount: number;
  salesOrderId?: number | null;
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
  salesOrderItemId?: number | null;
};

const emptyLine = (): LineItem => ({
  productId: 0,
  hsnCode: "",
  quantity: 1,
  rate: 0,
  discount: 0,
  gstRate: 18,
  unit: "PCS",
  productName: "",
  salesOrderItemId: null,
});

export default function SaleForm({
  customers,
  products,
  shopStateCode,
  initial,
}: {
  customers: Customer[];
  products: Product[];
  shopStateCode: string;
  initial: SaleFormInitial;
}) {
  const [invoiceNo] = useState(initial.invoiceNo);
  const [invoiceDate, setInvoiceDate] = useState(initial.invoiceDate);
  const [customerId, setCustomerId] = useState(initial.customerId);
  const [items, setItems] = useState<LineItem[]>(initial.items.length ? initial.items : [emptyLine()]);
  const [discount, setDiscount] = useState(initial.discount);
  const [vehicleNo, setVehicleNo] = useState(initial.vehicleNo);
  const [transporter, setTransporter] = useState(initial.transporter);
  const [transporterGstin, setTransporterGstin] = useState(initial.transporterGstin ?? "");
  const [distanceKm, setDistanceKm] = useState<number | null>(initial.distanceKm ?? null);
  const [ewayBillNo, setEwayBillNo] = useState(initial.ewayBillNo ?? "");
  const [dispatchAddress, setDispatchAddress] = useState(initial.dispatchAddress ?? "");
  const [notes, setNotes] = useState(initial.notes);
  const [paidAmount, setPaidAmount] = useState(initial.paidAmount);
  const [salesOrderId, setSalesOrderId] = useState<number>(initial.salesOrderId ?? 0);
  const [availableSOs, setAvailableSOs] = useState<{ id: number; soNo: string; soDate: string; status: string }[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  const customer = customers.find((c) => c.id === customerId);
  const isInterState = !!(customer && customer.stateCode && customer.stateCode !== shopStateCode);

  useEffect(() => {
    if (!customerId) { setAvailableSOs([]); setSalesOrderId(0); return; }
    fetch(`/api/sales-orders?customerId=${customerId}&status=open,partial`)
      .then((r) => r.ok ? r.json() : [])
      .then((d) => setAvailableSOs(d ?? []))
      .catch(() => setAvailableSOs([]));
  }, [customerId]);

  const loadFromSO = async () => {
    if (!salesOrderId) return;
    const res = await fetch(`/api/sales-orders/${salesOrderId}`);
    if (!res.ok) { setMsg("Could not load Sales Order"); return; }
    const so = await res.json();
    const newLines: LineItem[] = so.items
      .filter((soi: any) => soi.remainingQty > 0.0001)
      .map((soi: any) => ({
        productId: soi.productId,
        productName: soi.product.name,
        hsnCode: soi.hsnCode,
        quantity: soi.remainingQty,
        rate: soi.rate,
        discount: 0,
        gstRate: soi.gstRate,
        unit: soi.product.unit,
        salesOrderItemId: soi.id,
      }));
    if (newLines.length === 0) { setMsg("This Sales Order is fully dispatched"); return; }
    setItems(newLines);
    setMsg(`Loaded ${newLines.length} pending item(s) from SO ${so.soNo}`);
  };

  const lineTaxes = useMemo(
    () => items.map((it) => calcLineTax({
      quantity: it.quantity, rate: it.rate, discount: it.discount, gstRate: it.gstRate,
    }, isInterState)),
    [items, isInterState]
  );

  const totals = useMemo(() => sumTotals(lineTaxes), [lineTaxes]);

  const setLine = (idx: number, patch: Partial<LineItem>) => {
    setItems((rows) => rows.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  };

  const pickProduct = (idx: number, productId: number) => {
    const p = products.find((x) => x.id === productId);
    if (!p) return;
    setLine(idx, {
      productId: p.id,
      productName: p.name,
      hsnCode: p.hsnCode,
      rate: p.salePrice,
      gstRate: p.gstRate,
      unit: p.unit,
      salesOrderItemId: null,
    });
  };

  const addRow = () => setItems((r) => [...r, emptyLine()]);
  const removeRow = (i: number) => setItems((r) => r.filter((_, idx) => idx !== i));

  const submit = () => {
    setMsg(null);
    if (!customerId) { setMsg("Select a customer"); return; }
    const cleanItems = items.filter((i) => i.productId && i.quantity > 0);
    if (cleanItems.length === 0) { setMsg("Add at least one valid item"); return; }

    start(async () => {
      const res = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoiceNo,
          invoiceDate,
          customerId,
          items: cleanItems.map(({ productId, hsnCode, quantity, rate, discount, gstRate }) => ({
            productId, hsnCode, quantity, rate, discount, gstRate,
          })),
          itemSalesOrderItemIds: cleanItems.map((i) => i.salesOrderItemId ?? null),
          salesOrderId: salesOrderId || null,
          discount,
          vehicleNo,
          transporter,
          transporterGstin,
          distanceKm: distanceKm ?? null,
          ewayBillNo,
          dispatchAddress,
          notes,
          paidAmount,
          isInterState,
        }),
      });
      if (res.ok) {
        const d = await res.json();
        router.push(`/sales/${d.id}`);
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
            <label className="label">Invoice No</label>
            <input className="input font-mono" value={invoiceNo} readOnly />
          </div>
          <div>
            <label className="label">Date *</label>
            <input type="date" className="input" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} />
          </div>
          <div className="md:col-span-2">
            <label className="label">Customer *</label>
            <select className="input" value={customerId} onChange={(e) => setCustomerId(Number(e.target.value))}>
              <option value="0">-- Select Customer --</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>{c.name}{c.city ? ` — ${c.city}` : ""}</option>
              ))}
            </select>
            {customer && (
              <div className="text-xs text-gray-600 mt-1">
                {customer.gstin && <span className="font-mono mr-3">GSTIN: {customer.gstin}</span>}
                {customer.stateName && <span>State: {customer.stateName} ({customer.stateCode})</span>}
                {" • "}
                <span className={isInterState ? "text-blue-700" : "text-green-700"}>
                  {isInterState ? "IGST (inter-state)" : "CGST + SGST (intra-state)"}
                </span>
              </div>
            )}
          </div>
        </div>

        {availableSOs.length > 0 && (
          <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[220px]">
              <label className="label text-blue-900">Dispatch against Sales Order (optional)</label>
              <select className="input" value={salesOrderId} onChange={(e) => setSalesOrderId(Number(e.target.value))}>
                <option value="0">-- No SO (direct sale) --</option>
                {availableSOs.map((so) => (
                  <option key={so.id} value={so.id}>{so.soNo} ({so.status})</option>
                ))}
              </select>
            </div>
            <button type="button" className="btn-secondary" onClick={loadFromSO} disabled={!salesOrderId}>
              ↓ Load pending items from SO
            </button>
          </div>
        )}
      </section>

      <section className="card overflow-hidden">
        <div className="p-3 border-b border-gray-200 flex justify-between items-center bg-gray-50">
          <h2 className="font-semibold text-gray-800 text-sm">Line Items</h2>
          <button type="button" onClick={addRow} className="btn-secondary text-xs">+ Add Row</button>
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
                    <td className="td text-gray-500 text-xs">
                      {i + 1}
                      {it.salesOrderItemId && <div className="text-[9px] text-blue-600">SO</div>}
                    </td>
                    <td className="td">
                      <select className="input py-1" value={it.productId} onChange={(e) => pickProduct(i, Number(e.target.value))}>
                        <option value="0">-- Select --</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                        ))}
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
                        <button type="button" className="text-red-600 hover:text-red-800 text-lg" onClick={() => removeRow(i)}>×</button>
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
          <h2 className="font-semibold text-gray-800 text-sm">Dispatch &amp; E-way Bill</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Vehicle No</label>
              <input className="input" value={vehicleNo} onChange={(e) => setVehicleNo(e.target.value)} />
            </div>
            <div>
              <label className="label">Transporter</label>
              <input className="input" value={transporter} onChange={(e) => setTransporter(e.target.value)} />
            </div>
            <div>
              <label className="label">Transporter GSTIN</label>
              <input className="input font-mono" value={transporterGstin} onChange={(e) => setTransporterGstin(e.target.value.toUpperCase())} maxLength={15} />
            </div>
            <div>
              <label className="label">Distance (km)</label>
              <input type="number" step="0.1" className="input" value={distanceKm ?? ""} onChange={(e) => setDistanceKm(e.target.value === "" ? null : Number(e.target.value))} />
            </div>
            <div>
              <label className="label">E-way Bill No</label>
              <input className="input font-mono" value={ewayBillNo} onChange={(e) => setEwayBillNo(e.target.value)} />
            </div>
            <div>
              <label className="label">Amount Received (₹)</label>
              <input type="number" step="0.01" className="input" value={paidAmount} onChange={(e) => setPaidAmount(Number(e.target.value))} />
            </div>
          </div>
          <div>
            <label className="label">Dispatch Address (if different)</label>
            <textarea className="input" rows={2} value={dispatchAddress} onChange={(e) => setDispatchAddress(e.target.value)} />
          </div>
          <div>
            <label className="label">Notes / Remarks</label>
            <textarea className="input" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </section>

        <section className="card p-4">
          <h2 className="font-semibold text-gray-800 text-sm mb-3">Summary</h2>
          <div className="space-y-1 text-sm">
            <Row label="Sub Total (Taxable)" value={inr(totals.subTotal)} />
            {isInterState ? (
              <Row label="IGST" value={inr(totals.igstTotal)} />
            ) : (
              <>
                <Row label="CGST" value={inr(totals.cgstTotal)} />
                <Row label="SGST" value={inr(totals.sgstTotal)} />
              </>
            )}
            <Row label="Round Off" value={inr(totals.roundOff)} muted />
            <div className="border-t pt-2 mt-2">
              <Row label="Grand Total" value={inr(totals.grandTotal)} bold />
            </div>
            <div className="text-xs text-gray-600 pt-1">Balance Due: {inr(totals.grandTotal - paidAmount)}</div>
          </div>
        </section>
      </div>

      <div className="flex items-center gap-3 pt-2">
        <button className="btn-primary" onClick={submit} disabled={pending}>{pending ? "Saving…" : "Save Invoice"}</button>
        <button className="btn-secondary" onClick={() => router.back()}>Cancel</button>
        {msg && <span className={`text-sm ${msg.startsWith("Loaded") ? "text-green-700" : "text-red-600"}`}>{msg}</span>}
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
