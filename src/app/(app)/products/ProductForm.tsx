"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type Product = {
  id?: number;
  sku: string;
  name: string;
  hsnCode: string;
  unit: string;
  category: string;
  gstRate: number;
  purchasePrice: number;
  salePrice: number;
  rack: string;
  openingStock: number;
  minStock: number;
  isActive: boolean;
};

const DEFAULTS: Product = {
  sku: "",
  name: "",
  hsnCode: "",
  unit: "PCS",
  category: "",
  gstRate: 18,
  purchasePrice: 0,
  salePrice: 0,
  rack: "",
  openingStock: 0,
  minStock: 0,
  isActive: true,
};

const UNITS = ["PCS", "SET", "KG", "GM", "MTR", "CM", "LTR", "ML", "PKT", "BOX", "ROLL", "PAIR"];

export default function ProductForm({ product }: { product?: Product }) {
  const [form, setForm] = useState<Product>(product ?? DEFAULTS);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  const isEdit = !!product?.id;

  const set = <K extends keyof Product>(k: K, v: Product[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  return (
    <form
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        setMsg(null);
        start(async () => {
          const url = isEdit ? `/api/products/${product!.id}` : "/api/products";
          const method = isEdit ? "PUT" : "POST";
          const res = await fetch(url, {
            method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(form),
          });
          if (res.ok) {
            router.push("/products");
            router.refresh();
          } else {
            const d = await res.json().catch(() => ({}));
            setMsg(d.error ?? "Save failed");
          }
        });
      }}
    >
      <section className="card p-5">
        <h2 className="font-semibold text-gray-800 mb-4">Item Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label">SKU / Item Code *</label>
            <input className="input font-mono" required value={form.sku} onChange={(e) => set("sku", e.target.value)} />
          </div>
          <div>
            <label className="label">Name *</label>
            <input className="input" required value={form.name} onChange={(e) => set("name", e.target.value)} />
          </div>
          <div>
            <label className="label">Category</label>
            <input className="input" value={form.category} onChange={(e) => set("category", e.target.value)} placeholder="e.g. Brass Parts" />
          </div>
          <div>
            <label className="label">HSN Code</label>
            <input className="input font-mono" value={form.hsnCode} onChange={(e) => set("hsnCode", e.target.value)} />
          </div>
          <div>
            <label className="label">Unit</label>
            <select className="input" value={form.unit} onChange={(e) => set("unit", e.target.value)}>
              {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Rack / Location</label>
            <input className="input" value={form.rack} onChange={(e) => set("rack", e.target.value)} placeholder="e.g. A-3-Top" />
          </div>
        </div>
      </section>

      <section className="card p-5">
        <h2 className="font-semibold text-gray-800 mb-4">Pricing & Tax</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="label">Purchase Price (₹)</label>
            <input type="number" step="0.01" className="input" value={form.purchasePrice} onChange={(e) => set("purchasePrice", Number(e.target.value))} />
          </div>
          <div>
            <label className="label">Sale Price (₹)</label>
            <input type="number" step="0.01" className="input" value={form.salePrice} onChange={(e) => set("salePrice", Number(e.target.value))} />
          </div>
          <div>
            <label className="label">GST Rate (%)</label>
            <select className="input" value={form.gstRate} onChange={(e) => set("gstRate", Number(e.target.value))}>
              {[0, 5, 12, 18, 28].map((g) => <option key={g} value={g}>{g}%</option>)}
            </select>
          </div>
        </div>
      </section>

      <section className="card p-5">
        <h2 className="font-semibold text-gray-800 mb-4">Stock</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="label">Opening Stock</label>
            <input type="number" step="0.01" className="input" value={form.openingStock} onChange={(e) => set("openingStock", Number(e.target.value))} disabled={isEdit} />
            {isEdit && <div className="text-xs text-gray-500 mt-1">Use purchases/adjustments to change stock after creation</div>}
          </div>
          <div>
            <label className="label">Min Stock Alert</label>
            <input type="number" step="0.01" className="input" value={form.minStock} onChange={(e) => set("minStock", Number(e.target.value))} />
          </div>
          <div className="flex items-end">
            <label className="inline-flex items-center gap-2">
              <input type="checkbox" checked={form.isActive} onChange={(e) => set("isActive", e.target.checked)} />
              <span className="text-sm">Active</span>
            </label>
          </div>
        </div>
      </section>

      <div className="flex items-center gap-3">
        <button className="btn-primary" disabled={pending}>{pending ? "Saving…" : (isEdit ? "Update" : "Create")}</button>
        <button type="button" className="btn-secondary" onClick={() => router.back()}>Cancel</button>
        {msg && <span className="text-sm text-red-600">{msg}</span>}
      </div>
    </form>
  );
}
