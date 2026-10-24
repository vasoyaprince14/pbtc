"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type Doc = {
  id: number;
  category: string;
  filename: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  notes: string;
  uploadedAt: string | Date;
};

const CATEGORIES = ["drawing", "specification", "certificate", "photo", "other"];

const isImg = (d: Doc) => (d.mimeType ?? "").startsWith("image/");

function fmtSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export default function ProductDocuments({ productId, initial }: { productId: number; initial: Doc[] }) {
  const [docs, setDocs] = useState<Doc[]>(initial);
  const [file, setFile] = useState<File | null>(null);
  const [category, setCategory] = useState("drawing");
  const [notes, setNotes] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  const upload = () => {
    if (!file) { setMsg("Choose a file first"); return; }
    setMsg(null);
    start(async () => {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("category", category);
      fd.append("notes", notes);
      const res = await fetch(`/api/products/${productId}/documents`, { method: "POST", body: fd });
      if (res.ok) {
        const d = await res.json();
        setDocs((prev) => [d, ...prev]);
        setFile(null);
        setNotes("");
        setMsg("Uploaded.");
        router.refresh();
      } else {
        const d = await res.json().catch(() => ({}));
        setMsg(d.error ?? "Upload failed");
      }
    });
  };

  const remove = (id: number) => {
    if (!confirm("Delete this document?")) return;
    start(async () => {
      const res = await fetch(`/api/documents/${id}`, { method: "DELETE" });
      if (res.ok) setDocs((prev) => prev.filter((d) => d.id !== id));
      else setMsg("Delete failed");
    });
  };

  // Oldest image first, matching getProductImageMap() — so the "main" picture
  // shown in the products list is the same one highlighted here.
  const images = [...docs]
    .filter(isImg)
    .sort((a, b) => new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime());

  return (
    <section className="card p-5">
      <h2 className="font-semibold text-gray-800 mb-4">Pictures &amp; Documents</h2>

      {images.length > 0 && (
        <div className="mb-5">
          <div className="flex flex-wrap gap-3">
            {images.map((d, i) => (
              <a
                key={d.id}
                href={`/api/documents/${d.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="relative block"
                title={d.originalName}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/documents/${d.id}`}
                  alt={d.originalName}
                  className={`rounded border object-cover bg-white ${i === 0 ? "h-40 w-40 border-brand-400" : "h-24 w-24 border-gray-200"}`}
                  loading="lazy"
                />
                {i === 0 && (
                  <span className="absolute bottom-1 left-1 badge bg-brand-600 text-white text-[10px]">Main</span>
                )}
              </a>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-2">
            The first picture uploaded is used as the main image in the products list.
          </p>
        </div>
      )}

      <div className="border border-dashed border-gray-300 rounded p-4 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
          <div className="md:col-span-2">
            <label className="label">Picture or file (JPG, PNG, PDF, DXF — max 10MB)</label>
            <input
              type="file"
              className="input"
              accept=".pdf,.dxf,.dwg,.step,.stp,.png,.jpg,.jpeg,.webp"
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                setFile(f);
                // Picking an image almost always means a product photo — save
                // the user a second click, but leave it editable.
                if (f && f.type.startsWith("image/")) setCategory("photo");
              }}
            />
          </div>
          <div>
            <label className="label">Category</label>
            <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <button type="button" className="btn-primary w-full" onClick={upload} disabled={pending || !file}>
              {pending ? "Uploading…" : "Upload"}
            </button>
          </div>
        </div>
        <div className="mt-3">
          <label className="label">Notes (optional)</label>
          <input className="input" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Revision, description…" />
        </div>
        {msg && <div className="text-sm mt-2 text-brand-700">{msg}</div>}
      </div>

      {docs.length === 0 ? (
        <div className="text-sm text-gray-500 text-center py-4">No pictures or documents uploaded yet</div>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="th">File</th>
              <th className="th">Category</th>
              <th className="th">Notes</th>
              <th className="th text-right">Size</th>
              <th className="th"></th>
            </tr>
          </thead>
          <tbody>
            {docs.map((d) => (
              <tr key={d.id}>
                <td className="td">
                  <a href={`/api/documents/${d.id}`} target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:underline flex items-center gap-2">
                    {isImg(d) && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={`/api/documents/${d.id}`}
                        alt=""
                        className="h-8 w-8 rounded object-cover border border-gray-200 shrink-0"
                        loading="lazy"
                      />
                    )}
                    {d.originalName}
                  </a>
                </td>
                <td className="td text-xs">
                  <span className="badge bg-gray-100 text-gray-700">{d.category}</span>
                </td>
                <td className="td text-xs">{d.notes || "—"}</td>
                <td className="td text-right text-xs">{fmtSize(d.sizeBytes)}</td>
                <td className="td text-right">
                  <button className="text-red-600 text-xs hover:underline" onClick={() => remove(d.id)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
