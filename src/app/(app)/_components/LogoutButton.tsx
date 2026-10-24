"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

export default function LogoutButton() {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <button
      className="text-brand-400 hover:text-brand-300 disabled:opacity-50"
      disabled={pending}
      onClick={() =>
        start(async () => {
          await fetch("/api/logout", { method: "POST" });
          router.push("/login");
          router.refresh();
        })
      }
    >
      {pending ? "Logging out…" : "Logout"}
    </button>
  );
}
