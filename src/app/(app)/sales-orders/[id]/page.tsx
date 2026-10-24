import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { inr, fmtDate, num } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function SalesOrderDetail({ params }: { params: { id: string } }) {
  const id = Number(params.id);
  if (!Number.isFinite(id)) notFound();
  const so = await prisma.salesOrder.findUnique({
    where: { id },
    include: {
      customer: true,
      items: { include: { product: true, saleItems: true } },
      sales: { orderBy: { invoiceDate: "asc" } },
      jobCards: { orderBy: { createdAt: "desc" }, include: { product: true } },
    },
  });
  if (!so) notFound();

  const totalOrdered = so.items.reduce((a, i) => a + i.orderedQty, 0);
  const totalDelivered = so.items.reduce((a, i) => a + i.saleItems.reduce((x, s) => x + s.quantity, 0), 0);
  const overallPct = totalOrdered > 0 ? Math.round((totalDelivered / totalOrdered) * 100) : 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-gray-800">
          SO {so.soNo}
          <span className={`ml-3 badge ${
            so.status === "closed" ? "bg-green-100 text-green-800" :
            so.status === "partial" ? "bg-orange-100 text-orange-800" :
            so.status === "cancelled" ? "bg-red-100 text-red-800" :
            "bg-blue-100 text-blue-800"
          }`}>{so.status}</span>
        </h1>
        <div className="flex gap-2">
          <Link href={`/sales/new?soId=${so.id}`} className="btn-primary">🚚 Create Dispatch</Link>
          <Link href={`/job-cards/new?soId=${so.id}`} className="btn-secondary">🔧 New Job Card</Link>
          <Link href="/sales-orders" className="btn-secondary">Back</Link>
        </div>
      </div>

      <div className="card p-5 mb-4 grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
        <div>
          <div className="text-xs uppercase text-gray-500">Customer</div>
          <div className="font-semibold">{so.customer.name}</div>
          {so.customer.gstin && <div className="text-xs font-mono">{so.customer.gstin}</div>}
        </div>
        <div>
          <div className="text-xs uppercase text-gray-500">SO Date</div>
          <div>{fmtDate(so.soDate)}</div>
          <div className="text-xs text-gray-500 mt-1">Expected: {so.expectedDelivery ? fmtDate(so.expectedDelivery) : "—"}</div>
        </div>
        <div>
          <div className="text-xs uppercase text-gray-500">Customer PO</div>
          <div className="font-mono">{so.customerPoNo || "—"}</div>
          <div className="text-xs text-gray-500">{so.customerPoDate ? fmtDate(so.customerPoDate) : ""}</div>
        </div>
        <div>
          <div className="text-xs uppercase text-gray-500">Overall Progress</div>
          <div className="text-2xl font-bold">{overallPct}%</div>
          <div className="w-full bg-gray-200 rounded h-2 mt-1">
            <div className="bg-brand-500 h-2 rounded" style={{ width: `${overallPct}%` }} />
          </div>
        </div>
      </div>

      <div className="card overflow-hidden mb-4">
        <div className="p-3 border-b bg-gray-50 font-semibold text-sm">Line Items &amp; Dispatch Progress</div>
        <table className="w-full">
          <thead>
            <tr>
              <th className="th">#</th>
              <th className="th">Product</th>
              <th className="th text-right">Ordered</th>
              <th className="th text-right">Delivered</th>
              <th className="th text-right">Remaining</th>
              <th className="th">Progress</th>
              <th className="th text-right">Rate</th>
              <th className="th text-right">Line Total</th>
            </tr>
          </thead>
          <tbody>
            {so.items.map((it, i) => {
              const delivered = it.saleItems.reduce((a, s) => a + s.quantity, 0);
              const remaining = Math.max(0, it.orderedQty - delivered);
              const pct = it.orderedQty > 0 ? Math.round((delivered / it.orderedQty) * 100) : 0;
              return (
                <tr key={it.id}>
                  <td className="td">{i + 1}</td>
                  <td className="td">
                    <div className="font-medium">{it.product.name}</div>
                    {it.description && it.description !== it.product.name && (
                      <div className="text-xs text-gray-500">{it.description}</div>
                    )}
                  </td>
                  <td className="td text-right">{num(it.orderedQty, 0)} {it.product.unit}</td>
                  <td className="td text-right text-green-700">{num(delivered, 0)}</td>
                  <td className={`td text-right font-semibold ${remaining > 0 ? "text-orange-700" : "text-gray-400"}`}>{num(remaining, 0)}</td>
                  <td className="td">
                    <div className="text-xs">{pct}%</div>
                    <div className="w-24 bg-gray-200 rounded h-1.5 mt-0.5">
                      <div className={`h-1.5 rounded ${pct >= 100 ? "bg-green-500" : "bg-brand-500"}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                    </div>
                  </td>
                  <td className="td text-right">{inr(it.rate)}</td>
                  <td className="td text-right font-medium">{inr(it.total)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card overflow-hidden">
          <div className="p-3 border-b bg-gray-50 font-semibold text-sm flex justify-between">
            <span>Linked Dispatches / Invoices ({so.sales.length})</span>
          </div>
          {so.sales.length === 0 ? (
            <div className="p-4 text-center text-gray-500 text-sm">No dispatches yet</div>
          ) : (
            <table className="w-full">
              <thead>
                <tr>
                  <th className="th">Invoice</th>
                  <th className="th">Date</th>
                  <th className="th text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {so.sales.map((s) => (
                  <tr key={s.id}>
                    <td className="td font-mono text-xs"><Link href={`/sales/${s.id}`} className="text-brand-600 hover:underline">{s.invoiceNo}</Link></td>
                    <td className="td text-xs">{fmtDate(s.invoiceDate)}</td>
                    <td className="td text-right">{inr(s.grandTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="card overflow-hidden">
          <div className="p-3 border-b bg-gray-50 font-semibold text-sm flex justify-between">
            <span>Job Cards ({so.jobCards.length})</span>
          </div>
          {so.jobCards.length === 0 ? (
            <div className="p-4 text-center text-gray-500 text-sm">No job cards created</div>
          ) : (
            <table className="w-full">
              <thead>
                <tr>
                  <th className="th">Card No</th>
                  <th className="th">Product</th>
                  <th className="th text-right">Qty</th>
                  <th className="th">Stage</th>
                </tr>
              </thead>
              <tbody>
                {so.jobCards.map((jc) => (
                  <tr key={jc.id}>
                    <td className="td font-mono text-xs"><Link href={`/job-cards/${jc.id}`} className="text-brand-600 hover:underline">{jc.cardNo}</Link></td>
                    <td className="td text-xs">{jc.product.name}</td>
                    <td className="td text-right text-xs">{jc.quantity}</td>
                    <td className="td text-xs"><span className="badge bg-gray-100 text-gray-700">{jc.currentStage}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="card p-4 mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
        <div className="space-y-2">
          {so.paymentTerms && <div><span className="font-semibold">Payment:</span> {so.paymentTerms}</div>}
          {so.deliveryTerms && <div><span className="font-semibold">Delivery:</span> {so.deliveryTerms}</div>}
          {so.notes && <div><span className="font-semibold">Notes:</span> <span className="whitespace-pre-line">{so.notes}</span></div>}
        </div>
        <div>
          <div className="flex justify-between py-0.5"><span>Sub Total</span><span className="font-mono">{inr(so.subTotal)}</span></div>
          {so.isInterState
            ? <div className="flex justify-between py-0.5"><span>IGST</span><span className="font-mono">{inr(so.igstTotal)}</span></div>
            : (<>
              <div className="flex justify-between py-0.5"><span>CGST</span><span className="font-mono">{inr(so.cgstTotal)}</span></div>
              <div className="flex justify-between py-0.5"><span>SGST</span><span className="font-mono">{inr(so.sgstTotal)}</span></div>
            </>)}
          <div className="flex justify-between py-1 mt-1 border-t font-bold"><span>Grand Total</span><span className="font-mono">{inr(so.grandTotal)}</span></div>
        </div>
      </div>
    </div>
  );
}
