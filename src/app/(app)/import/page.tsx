import { requireUser, hasRole } from "@/lib/auth";
import { redirect } from "next/navigation";
import ImportPanel from "./ImportPanel";

export const dynamic = "force-dynamic";

export default async function ImportPage() {
  const s = await requireUser();
  if (!hasRole(s.role, "manager")) redirect("/dashboard");

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-2">CSV Import</h1>
      <p className="text-sm text-gray-600 mb-4">Bulk-add products, customers or suppliers from a CSV file (e.g. exported from Excel).</p>
      <ImportPanel />
    </div>
  );
}
