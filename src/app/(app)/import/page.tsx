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

      <details className="card p-4 mt-4 text-sm">
        <summary className="font-semibold cursor-pointer">Which columns are required? (click to open)</summary>

        <p className="mt-3 text-gray-700">
          Column names are matched loosely — <code className="font-mono">HSN Code</code>,{" "}
          <code className="font-mono">hsn_code</code> and <code className="font-mono">hsncode</code> all work.
          Column order does not matter, and any column you leave out is simply skipped.
        </p>

        <h3 className="font-semibold mt-4 mb-1">Products</h3>
        <p className="text-gray-700 mb-2">
          Required: <code className="font-mono">sku</code>, <code className="font-mono">name</code>. Everything else is optional:
        </p>
        <table className="w-full text-xs">
          <thead>
            <tr><th className="th">Column</th><th className="th">If left blank</th></tr>
          </thead>
          <tbody>
            {[
              ["hsncode", "empty"],
              ["unit", "PCS"],
              ["category", "empty"],
              ["gstrate", "18 — not 0. Set 12 or 5 explicitly for those items."],
              ["purchaseprice", "0"],
              ["saleprice", "0"],
              ["rack", "empty"],
              ["openingstock", "0 (sets the opening balance; no stock-ledger entry is created)"],
              ["minstock", "0 (no low-stock alert)"],
              ["image", "no picture — see the picture upload box above"],
            ].map(([c, d]) => (
              <tr key={c}><td className="td font-mono">{c}</td><td className="td">{d}</td></tr>
            ))}
          </tbody>
        </table>

        <h3 className="font-semibold mt-4 mb-1">Customers &amp; Suppliers</h3>
        <p className="text-gray-700">
          Only <code className="font-mono">name</code> is required. <code className="font-mono">gstin</code>,{" "}
          <code className="font-mono">address</code>, <code className="font-mono">city</code>,{" "}
          <code className="font-mono">pincode</code>, <code className="font-mono">phone</code>,{" "}
          <code className="font-mono">email</code>, <code className="font-mono">openingbalance</code> (and{" "}
          <code className="font-mono">creditdays</code> for customers) are all optional.
        </p>
        <p className="text-gray-700 mt-2">
          <strong>Tip:</strong> if you fill in <code className="font-mono">gstin</code>, you can leave{" "}
          <code className="font-mono">statecode</code> and <code className="font-mono">statename</code> blank — the
          state is read from the first two digits of the GSTIN. Get this right: the state code is what decides
          CGST+SGST versus IGST on every invoice.
        </p>
      </details>
    </div>
  );
}
