"use client";

import { useState, useTransition } from "react";
import { parseCSV, toRecords } from "@/lib/csv";
import { useRouter } from "next/navigation";

type Kind = "products" | "customers" | "suppliers";

const TEMPLATES: Record<Kind, { headers: string[]; sample: string[] }> = {
  products: {
    headers: ["sku", "name", "hsncode", "unit", "category", "gstrate", "purchaseprice", "saleprice", "rack", "openingstock", "minstock"],
    sample: ["BB-100", "Brass Bunsen Burner", "9017", "PCS", "Burners", "18", "250", "450", "A-1", "50", "10"],
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

export default function ImportPanel() {
  const [kind, setKind] = useState<Kind>("products");
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [fileName, setFileName] = useState<string>("");
  const [result, setResult] = useState<{ created: number; errors: string[] } | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  const onFile = async (file: File) => {
    setResult(null);
    setFileName(file.name);
    const text = await file.text();
    const parsed = parseCSV(text);
    const records = toRecords(parsed);
    setRows(records);
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

  const commit = () => {
    setResult(null);
    start(async () => {
      const res = await fetch(`/api/import/${kind}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows }),
      });
      const d = await res.json();
      setResult(d);
      if (res.ok) router.refresh();
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
                onClick={() => { setKind(k); setRows([]); setResult(null); setFileName(""); }}
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
      </section>

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
