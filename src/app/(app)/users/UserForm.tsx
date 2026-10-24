"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type User = { id?: number; username: string; name: string; role: string };

export default function UserForm({ user }: { user?: User }) {
  const isEdit = !!user?.id;
  const [username, setUsername] = useState(user?.username ?? "");
  const [name, setName] = useState(user?.name ?? "");
  const [role, setRole] = useState(user?.role ?? "staff");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  const submit = () => {
    setMsg(null);
    if (!isEdit && password.length < 6) { setMsg("Password must be at least 6 characters"); return; }
    start(async () => {
      const url = isEdit ? `/api/users/${user!.id}` : "/api/users";
      const method = isEdit ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.toLowerCase(), name, role, password: password || undefined }),
      });
      if (res.ok) {
        router.push("/users");
        router.refresh();
      } else {
        const d = await res.json().catch(() => ({}));
        setMsg(d.error ?? "Save failed");
      }
    });
  };

  return (
    <div className="card p-5 max-w-lg space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="label">Username *</label>
          <input className="input font-mono" value={username} onChange={(e) => setUsername(e.target.value)} required disabled={isEdit} />
          {isEdit && <div className="text-xs text-gray-500 mt-1">Cannot be changed</div>}
        </div>
        <div>
          <label className="label">Full Name *</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div>
          <label className="label">Role *</label>
          <select className="input" value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="staff">Staff — create sales/challans, view masters</option>
            <option value="manager">Manager — everything except user mgmt & settings</option>
            <option value="owner">Owner — full access</option>
          </select>
        </div>
        <div>
          <label className="label">{isEdit ? "New Password (leave blank to keep)" : "Password *"}</label>
          <input type="password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} minLength={isEdit ? 0 : 6} />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button className="btn-primary" onClick={submit} disabled={pending}>{pending ? "Saving…" : (isEdit ? "Update" : "Create User")}</button>
        <button className="btn-secondary" onClick={() => router.back()}>Cancel</button>
        {msg && <span className="text-sm text-red-600">{msg}</span>}
      </div>
    </div>
  );
}
