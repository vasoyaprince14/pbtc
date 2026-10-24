"use client";

import { useState, useTransition } from "react";
import { parseCSV, toRecords } from "@/lib/csv";
import { useRouter } from "next/navigation";

type Kind = "products" | "customers" | "suppliers";

const TEMPLATES: Record<Kind, { headers: string[]; sample: string[] }> = {
  products: {
    headers: ["sku", "name", "hsncode", "unit", "category", "gstrate", "purchaseprice", "saleprice", "rack", "openingstock", "minstock", "image"],
    sample: ["BB-100", "Brass Bunsen Burner", "9017", "PCS", "Burners", "18", "250", "450", "A-1", "50", "10", "BB-100.jpg"],
  },
  customers: {
    headers: ["name", "gstin", "statecode", "statename", "address", "city", "pincode", "phone", "email", "creditdays", "openingbalance"],
    sample: ["Modern Science Suppliers", "06ABCDE1234F1Z5", "06", "Haryana", "123 Main St", "Ambala", "134003", "9812345678", "info@modern.com", "30", "0"],
  },
  suppliers: {
    headers: ["name", "gstin", "statecode", "statename", "address", "city", "pincode", "phone", "email", "openingbalance"],
    sample: ["Kumar Brass Works", "06XYZAB9876F1Z1", "06", "Haryana", "Sector 5", "Faridabad", "121006", "9876543210", "", "0"],
  },
};

function templateCSV(kind: Kind): string {
  const t = TEMPLATES[kind];
  return t.headers.join(",") + "\n" + t.sample.join(",") + "\n";
}

const baseName = (s: string) => s.toLowerCase().replace(/\.[^.]+$/, "");

type ImportResult = { created: number; updated?: number; errors: string[]; saved?: { sku: string; id: number }[] };

export default function ImportPanel() {
  const [kind, setKind] = useState<Kind>("products");
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [fileName, setFileName] = useState<string>("");
  const [images, setImages] = useState<File[]>([]);
  const [updateExisting, setUpdateExisting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [imgMsg, setImgMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  const onFile = async (file: File) => {
    setResult(null);
    setImgMsg(null);
    setFileName(file.name);
    const text = await file.text();
    setRows(toRecords(parseCSV(text)));
  };

  const downloadTemplate = () => {
    const csv = templateCSV(kind);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pbtc-${kind}-template.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  /** Finds the picked file matching an `image` cell, by full name or basename. */
  const findImage = (wanted: string): File | undefined => {
    const w = wanted.trim().toLowerCase();
    if (!w) return undefined;
    return (
      images.find((f) => f.name.toLowerCase() === w) ??
      images.find((f) => baseName(f.name) === baseName(w))
    );
  };

  // --- pre-import warnings (products only) ---
  const isProducts = kind === "products";
  const blankGst = isProducts ? rows.map((r, i) => (r.gstrate ? null : i + 2)).filter(Boolean) as number[] : [];
  const wantImages = isProducts ? rows.filter((r) => r.image) : [];
  const missingImages = wantImages.filter((r) => !findImage(r.image));

  const commit = () => {
    setResult(null);
    setImgMsg(null);
    start(async () => {
      const res = await fetch(`/api/import/${kind}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows, mode: updateExisting ? "update" : "create" }),
      });
      const d: ImportResult = await res.json();
      setResult(d);
      if (!res.ok) return;

      // Attach pictures to the rows that imported successfully.
      if (isProducts && images.length > 0 && d.saved?.length) {
        const bySku = new Map(rows.map((r) => [r.sku, r]));
        let ok = 0;
        const failed: string[] = [];
        for (const s of d.saved) {
          const row = bySku.get(s.sku);
          const file = row?.image ? findImage(row.image) : undefined;
          if (!file) continue;
          const fd = new FormData();
          fd.append("file", file);
          fd.append("category", "photo");
          fd.append("notes", "Imported from CSV");
          const up = await fetch(`/api/products/${s.id}/documents`, { method: "POST", body: fd });
          if (up.ok) ok++;
          else failed.push(s.sku);
        }
        setImgMsg(
          `${ok} picture(s) attached` + (failed.length ? ` — failed for: ${failed.join(", ")}` : "")
        );
      }
      router.refresh();
    });
  };

  const preview = rows.slice(0, 5);
  const headers = TEMPLATES[kind].headers;

  return (
    <div className="space-y-4">
      <section className="card p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex gap-2">
            {(Object.keys(TEMPLATES) as Kind[]).map((k) => (
              <button
                key={k}
                className={`btn ${kind === k ? "bg-brand-600 text-white" : "bg-white border border-gray-300"}`}
                onClick={() => { setKind(k); setRows([]); setResult(null); setFileName(""); setImages([]); setImgMsg(null); }}
              >
                {k[0].toUpperCase() + k.slice(1)}
              </button>
            ))}
          </div>
          <button className="btn-secondary ml-auto" onClick={downloadTemplate}>⬇ Download Template CSV</button>
        </div>

        <div className="mt-4">
          <label className="label">Upload {kind} CSV</label>
          <input
            type="file"
            accept=".csv,text/csv"
            className="input"
            onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
          />
          {fileName && <div className="text-xs text-gray-600 mt-1">Loaded: {fileName} ({rows.length} rows)</div>}
        </div>

        {isProducts && (
          <>
            <div className="mt-4">
              <label className="label">Product pictures (optional)</label>
              <input
                type="file"
                multiple
                accept="image/*"
                className="input"
                onChange={(e) => setImages(Array.from(e.target.files ?? []))}
              />
              <p className="text-xs text-gray-500 mt-1">
                Put the file name in the CSV&apos;s <code className="font-mono">image</code> column (e.g.{" "}
                <code className="font-mono">BB-100.jpg</code>), then select those image files here — open your
                images folder and select them all. Files are matched by name.
              </p>
              {images.length > 0 && <div className="text-xs text-gray-600 mt-1">{images.length} image file(s) selected</div>}
            </div>

            <label className="mt-4 flex items-center gap-2 text-sm">
              <input type="checkbox" checked={updateExisting} onChange={(e) => setUpdateExisting(e.target.checked)} />
              <span>
                Update products that already exist (match by SKU).
                <span className="text-gray-500"> Only the columns you fill in are changed; blank cells are left alone.</span>
              </span>
            </label>
          </>
        )}
      </section>

      {rows.length > 0 && (blankGst.length > 0 || missingImages.length > 0) && (
        <section className="card p-4 border-orange-300 bg-orange-50 text-sm space-y-2">
          <div className="font-semibold text-orange-800">⚠️ Check before importing</div>
          {blankGst.length > 0 && (
            <div>
              <strong>{blankGst.length} row(s) have a blank <code className="font-mono">gstrate</code></strong> — these
              will be saved as <strong>18%</strong>, not 0%. If any of these are 12% or 5% items, every invoice for
              them will have the wrong tax. Rows: {blankGst.slice(0, 20).join(", ")}{blankGst.length > 20 ? "…" : ""}
            </div>
          )}
          {missingImages.length > 0 && (
            <div>
              <strong>{missingImages.length} row(s) name a picture you haven&apos;t selected</strong> — those products
              will import without a picture. Missing: {missingImages.slice(0, 10).map((r) => r.image).join(", ")}
              {missingImages.length > 10 ? "…" : ""}
            </div>
          )}
        </section>
      )}

      {rows.length > 0 && (
        <section className="card overflow-hidden">
          <div className="p-3 border-b bg-gray-50 flex justify-between items-center">
            <div className="text-sm font-semibold">Preview (first 5 of {rows.length} rows)</div>
            <button className="btn-primary" onClick={commit} disabled={pending}>
              {pending ? "Importing…" : `Import ${rows.length} rows`}
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr>
                  {headers.map((h) => <th key={h} className="th">{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {preview.map((r, i) => (
                  <tr key={i}>
                    {headers.map((h) => <td key={h} className="td">{r[h] ?? ""}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {result && (
        <section className={`card p-4 ${result.errors.length ? "border-orange-300 bg-orange-50" : "border-green-300 bg-green-50"}`}>
          <div className="font-semibold">Import Result</div>
          <div className="text-sm mt-1">✅ Created: <strong>{result.created}</strong></div>
          {typeof result.updated === "number" && result.updated > 0 && (
            <div className="text-sm">♻️ Updated: <strong>{result.updated}</strong></div>
          )}
          {imgMsg && <div className="text-sm mt-1">🖼️ {imgMsg}</div>}
          {result.errors.length > 0 && (
            <details className="mt-2">
              <summary className="text-sm text-orange-700 cursor-pointer">⚠️ {result.errors.length} error(s) — click to view</summary>
              <ul className="text-xs mt-2 space-y-0.5 list-disc list-inside">
                {result.errors.slice(0, 50).map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            </details>
          )}
        </section>
      )}
    </div>
  );
}
