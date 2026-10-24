"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type Settings = {
  shopName: string;
  gstin: string;
  stateName: string;
  stateCode: string;
  address: string;
  city: string;
  pincode: string;
  phone: string;
  email: string;
  invoicePrefix: string;
  challanPrefix: string;
  bankName: string;
  bankAccount: string;
  bankIfsc: string;
  bankBranch: string;
  termsNote: string;
};

export default function SettingsForm({ settings }: { settings: Settings }) {
  const [form, setForm] = useState<Settings>(settings);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const router = useRouter();

  const set = <K extends keyof Settings>(k: K, v: Settings[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  return (
    <form
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        setMsg(null);
        start(async () => {
          const res = await fetch("/api/settings", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(form),
          });
          if (res.ok) {
            setMsg("Saved.");
            router.refresh();
          } else {
            const d = await res.json().catch(() => ({}));
            setMsg(d.error ?? "Save failed");
          }
        });
      }}
    >
      <section className="card p-5">
        <h2 className="font-semibold text-gray-800 mb-4">Business Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label">Shop Name *</label>
            <input className="input" value={form.shopName} onChange={(e) => set("shopName", e.target.value)} required />
          </div>
          <div>
            <label className="label">GSTIN</label>
            <input className="input font-mono" value={form.gstin} onChange={(e) => set("gstin", e.target.value.toUpperCase())} maxLength={15} placeholder="06XXXXXXXXXXX1ZV" />
          </div>
          <div>
            <label className="label">Phone</label>
            <input className="input" value={form.phone} onChange={(e) => set("phone", e.target.value)} />
          </div>
          <div>
            <label className="label">Email</label>
            <input type="email" className="input" value={form.email} onChange={(e) => set("email", e.target.value)} />
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
            <label className="label">State *</label>
            <input className="input" value={form.stateName} onChange={(e) => set("stateName", e.target.value)} required />
          </div>
          <div>
            <label className="label">State Code (2-digit) *</label>
            <input className="input font-mono" value={form.stateCode} onChange={(e) => set("stateCode", e.target.value)} maxLength={2} required />
          </div>
        </div>
      </section>

      <section className="card p-5">
        <h2 className="font-semibold text-gray-800 mb-4">Document Numbering</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label">Invoice Prefix</label>
            <input className="input" value={form.invoicePrefix} onChange={(e) => set("invoicePrefix", e.target.value)} />
            <div className="text-xs text-gray-500 mt-1">Format: PREFIX/25-26/0001</div>
          </div>
          <div>
            <label className="label">Challan Prefix</label>
            <input className="input" value={form.challanPrefix} onChange={(e) => set("challanPrefix", e.target.value)} />
          </div>
        </div>
      </section>

      <section className="card p-5">
        <h2 className="font-semibold text-gray-800 mb-4">Bank Details (printed on invoice)</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label">Bank Name</label>
            <input className="input" value={form.bankName} onChange={(e) => set("bankName", e.target.value)} />
          </div>
          <div>
            <label className="label">Account Number</label>
            <input className="input" value={form.bankAccount} onChange={(e) => set("bankAccount", e.target.value)} />
          </div>
          <div>
            <label className="label">IFSC Code</label>
            <input className="input font-mono" value={form.bankIfsc} onChange={(e) => set("bankIfsc", e.target.value.toUpperCase())} />
          </div>
          <div>
            <label className="label">Branch</label>
            <input className="input" value={form.bankBranch} onChange={(e) => set("bankBranch", e.target.value)} />
          </div>
        </div>
      </section>

      <section className="card p-5">
        <h2 className="font-semibold text-gray-800 mb-4">Invoice Footer Note</h2>
        <textarea className="input" rows={3} value={form.termsNote} onChange={(e) => set("termsNote", e.target.value)} />
      </section>

      <div className="flex items-center gap-3">
        <button className="btn-primary" disabled={pending}>{pending ? "Saving…" : "Save Settings"}</button>
        {msg && <span className="text-sm text-green-700">{msg}</span>}
      </div>
    </form>
  );
}
