"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import JsBarcode from "jsbarcode";
import { inr } from "@/lib/format";

type Product = { id: number; sku: string; name: string; salePrice: number; unit: string; category: string };

export default function BarcodePanel({ products }: { products: Product[] }) {
  const [q, setQ] = useState("");
  const [picked, setPicked] = useState<Record<number, number>>({});
  const [showPrice, setShowPrice] = useState(true);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return products;
    return products.filter(
      (p) => p.name.toLowerCase().includes(term) || p.sku.toLowerCase().includes(term) || p.category.toLowerCase().includes(term)
    );
  }, [q, products]);

  const labels = useMemo(() => {
    const out: Product[] = [];
    for (const p of products) {
      const n = picked[p.id] ?? 0;
      for (let i = 0; i < n; i++) out.push(p);
    }
    return out;
  }, [picked, products]);

  return (
    <div className="space-y-4">
      <section className="card p-4 no-print">
        <div className="flex flex-wrap items-center gap-3 mb-3">
          <input className="input max-w-sm" placeholder="Search products…" value={q} onChange={(e) => setQ(e.target.value)} />
          <label className="inline-flex items-center gap-2 text-sm">
            <input type="checkbox" checked={showPrice} onChange={(e) => setShowPrice(e.target.checked)} />
            Show sale price on labels
          </label>
          <button className="btn-secondary ml-auto" onClick={() => setPicked({})}>Clear</button>
          <button className="btn-primary" onClick={() => window.print()} disabled={labels.length === 0}>
            🖨️ Print {labels.length} label(s)
          </button>
        </div>

        <div className="max-h-96 overflow-y-auto border rounded">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-gray-50">
              <tr>
                <th className="th">SKU</th>
                <th className="th">Product</th>
                <th className="th text-right">Price</th>
                <th className="th text-right w-32">Labels to Print</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id}>
                  <td className="td font-mono text-xs">{p.sku}</td>
                  <td className="td">{p.name}</td>
                  <td className="td text-right">{inr(p.salePrice)}</td>
                  <td className="td text-right">
                    <input
                      type="number"
                      min={0}
                      className="input py-1 text-right w-24 ml-auto"
                      value={picked[p.id] ?? 0}
                      onChange={(e) => setPicked((s) => ({ ...s, [p.id]: Math.max(0, Number(e.target.value) || 0) }))}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {labels.length > 0 && (
        <section className="card p-4 print-page">
          <h2 className="font-semibold mb-3 no-print">Preview ({labels.length} labels)</h2>
          <div className="grid grid-cols-4 gap-2 print:gap-1">
            {labels.map((p, i) => (
              <Label key={i} product={p} showPrice={showPrice} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function Label({ product, showPrice }: { product: Product; showPrice: boolean }) {
  const ref = useRef<SVGSVGElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    try {
      JsBarcode(ref.current, product.sku, {
        format: "CODE128",
        displayValue: false,
        height: 40,
        margin: 0,
        width: 1.5,
      });
    } catch {
      /* ignore invalid barcode */
    }
  }, [product.sku]);
  return (
    <div className="border border-gray-800 p-1.5 text-center flex flex-col items-center justify-between h-24">
      <div className="text-[10px] font-semibold leading-tight line-clamp-2">{product.name}</div>
      <svg ref={ref} />
      <div className="flex justify-between w-full text-[9px] font-mono">
        <span>{product.sku}</span>
        {showPrice && <span className="font-bold">{inr(product.salePrice)}</span>}
      </div>
    </div>
  );
}
