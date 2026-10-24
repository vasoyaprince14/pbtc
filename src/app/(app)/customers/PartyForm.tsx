"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { INDIAN_STATES, stateCodeFromGstin, stateNameFromCode } from "@/lib/states";

export type Party = {
  id?: number;
  name: string;
  gstin: string;
  stateName: string;
  stateCode: string;
  address: string;
  city: string;
  pincode: string;
  phone: string;
  email: string;
  creditDays?: number;
  openingBalance: number;
  isActive: boolean;
};

const DEFAULTS: Party = {
  name: "",
  gstin: "",
  stateName: "",
  stateCode: "",
  address: "",
  city: "",
  pincode: "",
  phone: "",
  email: "",
  creditDays: 0,
  openingBalance: 0,
  isActive: true,
};

export default function PartyForm({
  kind,
  party,
}: {
  kind: "customers" | "suppliers";
  party?: Party;
}) {
  const [form, setForm] = useState<Party>(party ?? DEFAULTS);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  const isEdit = !!party?.id;

  const set = <K extends keyof Party>(k: K, v: Party[K]) => setForm((f) => ({ ...f, [k]: v }));

  const onGstinChange = (val: string) => {
    const v = val.toUpperCase();
    const code = stateCodeFromGstin(v);
    setForm((f) => ({
      ...f,
      gstin: v,
      stateCode: code || f.stateCode,
      stateName: code ? stateNameFromCode(code) || f.stateName : f.stateName,
    }));
  };

  const onStateCodeChange = (code: string) => {
    setForm((f) => ({ ...f, stateCode: code, stateName: stateNameFromCode(code) || f.stateName }));
  };

  return (
    <form
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        setMsg(null);
        start(async () => {
          const url = isEdit ? `/api/${kind}/${party!.id}` : `/api/${kind}`;
          const method = isEdit ? "PUT" : "POST";
          const res = await fetch(url, {
            method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(form),
          });
          if (res.ok) {
            router.push(`/${kind}`);
            router.refresh();
          } else {
            const d = await res.json().catch(() => ({}));
            setMsg(d.error ?? "Save failed");
          }
        });
      }}
    >
      <section className="card p-5">
        <h2 className="font-semibold text-gray-800 mb-4">Basic Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="label">Name *</label>
            <input className="input" required value={form.name} onChange={(e) => set("name", e.target.value)} />
          </div>
          <div>
            <label className="label">GSTIN</label>
            <input className="input font-mono" value={form.gstin} onChange={(e) => onGstinChange(e.target.value)} maxLength={15} placeholder="Auto-fills state from first 2 digits" />
          </div>
          <div>
            <label className="label">Phone</label>
            <input className="input" value={form.phone} onChange={(e) => set("phone", e.target.value)} />
          </div>
          <div>
            <label className="label">Email</label>
            <input type="email" className="input" value={form.email} onChange={(e) => set("email", e.target.value)} />
          </div>
          {kind === "customers" && (
            <div>
              <label className="label">Credit Days</label>
              <input type="number" className="input" value={form.creditDays ?? 0} onChange={(e) => set("creditDays", Number(e.target.value))} />
            </div>
          )}
          <div>
            <label className="label">Opening Balance (₹)</label>
            <input type="number" step="0.01" className="input" value={form.openingBalance} onChange={(e) => set("openingBalance", Number(e.target.value))} />
            <div className="text-xs text-gray-500 mt-1">Positive = they owe you; Negative = advance received</div>
          </div>
        </div>
      </section>

      <section className="card p-5">
        <h2 className="font-semibold text-gray-800 mb-4">Address</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="label">Address</label>
            <textarea className="input" rows={2} value={form.address} onChange={(e) => set("address", e.target.value)} />
          </div>
          <div>
            <label className="label">City</label>
            <input className="input" value={form.city} onChange={(e) => set("city", e.target.value)} />
          </div>
          <div>
            <label className="label">PIN Code</label>
            <input className="input" value={form.pincode} onChange={(e) => set("pincode", e.target.value)} />
          </div>
          <div>
            <label className="label">State</label>
            <select className="input" value={form.stateCode} onChange={(e) => onStateCodeChange(e.target.value)}>
              <option value="">-- Select State --</option>
              {INDIAN_STATES.map((s) => (
                <option key={s.code} value={s.code}>{s.code} — {s.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">State Code</label>
            <input className="input font-mono" value={form.stateCode} maxLength={2} onChange={(e) => onStateCodeChange(e.target.value)} />
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
