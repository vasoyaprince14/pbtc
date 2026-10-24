import Link from "next/link";
import { prisma } from "@/lib/db";
import { inr, fmtDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function PurchasesPage() {
  const purchases = await prisma.purchase.findMany({
    orderBy: { billDate: "desc" },
    include: { supplier: true },
    take: 200,
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-gray-800">Purchases</h1>
        <Link href="/purchases/new" className="btn-primary">+ New Purchase</Link>
      </div>
      <div className="card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr>
              <th className="th">Bill No</th>
              <th className="th">Date</th>
              <th className="th">Supplier</th>
              <th className="th">Supplier Bill No</th>
              <th className="th text-right">Sub Total</th>
              <th className="th text-right">Tax</th>
              <th className="th text-right">Total</th>
              <th className="th"></th>
            </tr>
          </thead>
          <tbody>
            {purchases.length === 0 && (
              <tr><td className="td text-center text-gray-500 py-8" colSpan={8}>No purchases yet</td></tr>
            )}
            {purchases.map((p) => (
              <tr key={p.id} className="hover:bg-gray-50">
                <td className="td font-mono text-xs">{p.billNo}</td>
                <td className="td text-xs">{fmtDate(p.billDate)}</td>
                <td className="td font-medium">{p.supplier.name}</td>
                <td className="td font-mono text-xs">{p.supplierBillNo || "—"}</td>
                <td className="td text-right">{inr(p.subTotal)}</td>
                <td className="td text-right text-gray-600">{inr(p.cgstTotal + p.sgstTotal + p.igstTotal)}</td>
                <td className="td text-right font-semibold">{inr(p.grandTotal)}</td>
                <td className="td text-right">
                  <Link href={`/purchases/${p.id}`} className="text-brand-600 hover:underline text-xs">View</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
