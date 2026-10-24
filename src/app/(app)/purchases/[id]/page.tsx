import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { inr, fmtDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function PurchaseDetail({ params }: { params: { id: string } }) {
  const id = Number(params.id);
  if (!Number.isFinite(id)) notFound();
  const purchase = await prisma.purchase.findUnique({
    where: { id },
    include: { supplier: true, items: { include: { product: true } } },
  });
  if (!purchase) notFound();

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-gray-800">Purchase {purchase.billNo}</h1>
        <Link href="/purchases" className="btn-secondary">Back</Link>
      </div>
      <div className="card p-5 mb-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
        <div>
          <div className="text-xs uppercase text-gray-500">Supplier</div>
          <div className="font-semibold">{purchase.supplier.name}</div>
          {purchase.supplier.gstin && <div className="text-xs font-mono">GSTIN: {purchase.supplier.gstin}</div>}
        </div>
        <div>
          <div className="text-xs uppercase text-gray-500">Bill Date</div>
          <div className="font-semibold">{fmtDate(purchase.billDate)}</div>
          <div className="text-xs text-gray-600 mt-2">Supplier Bill: {purchase.supplierBillNo || "—"}</div>
        </div>
        <div>
          <div className="text-xs uppercase text-gray-500">Grand Total</div>
          <div className="text-lg font-bold">{inr(purchase.grandTotal)}</div>
          <div className="text-xs text-gray-600">Paid: {inr(purchase.paidAmount)}</div>
        </div>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr>
              <th className="th">#</th>
              <th className="th">Product</th>
              <th className="th">HSN</th>
              <th className="th text-right">Qty</th>
              <th className="th text-right">Rate</th>
              <th className="th text-right">Taxable</th>
              <th className="th text-right">GST</th>
              <th className="th text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {purchase.items.map((it, i) => (
              <tr key={it.id}>
                <td className="td">{i + 1}</td>
                <td className="td">{it.product.name}</td>
                <td className="td text-xs font-mono">{it.hsnCode}</td>
                <td className="td text-right">{it.quantity} {it.product.unit}</td>
                <td className="td text-right">{inr(it.rate)}</td>
                <td className="td text-right">{inr(it.taxable)}</td>
                <td className="td text-right text-xs">{inr(it.cgstAmt + it.sgstAmt + it.igstAmt)} ({it.gstRate}%)</td>
                <td className="td text-right font-medium">{inr(it.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
