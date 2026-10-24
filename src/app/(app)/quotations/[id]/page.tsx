import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { inr, fmtDate } from "@/lib/format";
import QuotationActions from "./QuotationActions";

export const dynamic = "force-dynamic";

export default async function QuotationDetail({ params }: { params: { id: string } }) {
  const id = Number(params.id);
  if (!Number.isFinite(id)) notFound();
  const q = await prisma.quotation.findUnique({
    where: { id },
    include: { customer: true, items: { include: { product: true } } },
  });
  if (!q) notFound();

  const totalTax = q.cgstTotal + q.sgstTotal + q.igstTotal;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-gray-800">
          Quotation {q.quotationNo}
          <span className={`ml-3 badge ${
            q.status === "accepted" ? "bg-green-100 text-green-800" :
            q.status === "converted" ? "bg-brand-100 text-brand-800" :
            q.status === "rejected" ? "bg-red-100 text-red-800" :
            q.status === "sent" ? "bg-blue-100 text-blue-800" :
            "bg-gray-100 text-gray-700"
          }`}>{q.status}</span>
        </h1>
        <div className="flex gap-2">
          <Link href={`/quotations/${q.id}/print`} target="_blank" className="btn-primary">🖨️ Print / PDF</Link>
          <Link href="/quotations" className="btn-secondary">Back</Link>
        </div>
      </div>

      <QuotationActions quotation={{
        id: q.id, status: q.status, convertedSalesOrderId: q.convertedSalesOrderId,
      }} />

      <div className="card p-5 mb-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
        <div>
          <div className="text-xs uppercase text-gray-500">Customer</div>
          <div className="font-semibold">{q.customer.name}</div>
          {q.customer.gstin && <div className="text-xs font-mono">{q.customer.gstin}</div>}
          <div className="text-xs">{q.customer.stateName}</div>
        </div>
        <div>
          <div className="text-xs uppercase text-gray-500">Date</div>
          <div>{fmtDate(q.quotationDate)}</div>
          <div className="text-xs text-gray-600 mt-1">Valid until: {q.validUntil ? fmtDate(q.validUntil) : "—"}</div>
        </div>
        <div>
          <div className="text-xs uppercase text-gray-500">Grand Total</div>
          <div className="text-lg font-bold">{inr(q.grandTotal)}</div>
          <div className="text-xs text-gray-600">Tax: {inr(totalTax)}</div>
        </div>
      </div>

      <div className="card overflow-hidden mb-4">
        <table className="w-full">
          <thead>
            <tr>
              <th className="th">#</th>
              <th className="th">Product</th>
              <th className="th">HSN</th>
              <th className="th text-right">Qty</th>
              <th className="th text-right">Rate</th>
              <th className="th text-right">Delivery</th>
              <th className="th text-right">Taxable</th>
              <th className="th text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {q.items.map((it, i) => (
              <tr key={it.id}>
                <td className="td">{i + 1}</td>
                <td className="td">
                  <div className="font-medium">{it.product.name}</div>
                  {it.description && it.description !== it.product.name && (
                    <div className="text-xs text-gray-600">{it.description}</div>
                  )}
                </td>
                <td className="td text-xs font-mono">{it.hsnCode}</td>
                <td className="td text-right">{it.quantity} {it.product.unit}</td>
                <td className="td text-right">{inr(it.rate)}</td>
                <td className="td text-right text-xs">{it.deliveryDays ? `${it.deliveryDays} days` : "—"}</td>
                <td className="td text-right">{inr(it.taxable)}</td>
                <td className="td text-right font-medium">{inr(it.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card p-4 text-sm space-y-2">
          {q.paymentTerms && (<div><span className="font-semibold">Payment Terms:</span> <span className="text-gray-700">{q.paymentTerms}</span></div>)}
          {q.deliveryTerms && (<div><span className="font-semibold">Delivery Terms:</span> <span className="text-gray-700">{q.deliveryTerms}</span></div>)}
          {q.notes && (<div><span className="font-semibold">Notes:</span> <span className="text-gray-700 whitespace-pre-line">{q.notes}</span></div>)}
        </div>
        <div className="card p-4 text-sm">
          <div className="flex justify-between py-1"><span>Sub Total</span><span className="font-mono">{inr(q.subTotal)}</span></div>
          {q.isInterState
            ? <div className="flex justify-between py-1"><span>IGST</span><span className="font-mono">{inr(q.igstTotal)}</span></div>
            : (<>
              <div className="flex justify-between py-1"><span>CGST</span><span className="font-mono">{inr(q.cgstTotal)}</span></div>
              <div className="flex justify-between py-1"><span>SGST</span><span className="font-mono">{inr(q.sgstTotal)}</span></div>
            </>)}
          <div className="flex justify-between py-1 text-xs text-gray-500"><span>Round Off</span><span className="font-mono">{inr(q.roundOff)}</span></div>
          <div className="flex justify-between py-2 mt-1 border-t font-bold"><span>Grand Total</span><span className="font-mono">{inr(q.grandTotal)}</span></div>
        </div>
      </div>
    </div>
  );
}
