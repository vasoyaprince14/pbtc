import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { inr, fmtDate, amountInWords } from "@/lib/format";
import PrintTrigger from "../../../sales/[id]/print/PrintTrigger";

export const dynamic = "force-dynamic";

export default async function QuotationPrint({ params }: { params: { id: string } }) {
  const id = Number(params.id);
  if (!Number.isFinite(id)) notFound();
  const [q, settings] = await Promise.all([
    prisma.quotation.findUnique({ where: { id }, include: { customer: true, items: { include: { product: true } } } }),
    prisma.shopSettings.findUnique({ where: { id: 1 } }),
  ]);
  if (!q || !settings) notFound();

  return (
    <div className="min-h-screen bg-white p-6 print:p-0">
      <PrintTrigger />
      <div className="max-w-4xl mx-auto print-page bg-white shadow print:shadow-none border print:border-none border-gray-300">
        <div className="border-b-2 border-gray-800 p-4 flex justify-between items-start">
          <div>
            <div className="text-2xl font-bold text-brand-700">{settings.shopName}</div>
            <div className="text-xs text-gray-700 whitespace-pre-line">{settings.address}</div>
            <div className="text-xs text-gray-700">{settings.city} {settings.pincode ? `- ${settings.pincode}` : ""}, {settings.stateName}</div>
            <div className="text-xs">{settings.phone && <>📞 {settings.phone} </>}{settings.email && <>✉️ {settings.email}</>}</div>
            {settings.gstin && <div className="text-xs font-mono mt-1">GSTIN: <strong>{settings.gstin}</strong></div>}
          </div>
          <div className="text-right">
            <div className="text-lg font-bold uppercase text-gray-800">Quotation</div>
            <div className="text-xs text-gray-500 mt-1">Not a tax invoice</div>
          </div>
        </div>

        <div className="grid grid-cols-2 border-b border-gray-800">
          <div className="p-3 border-r border-gray-800">
            <div className="text-xs font-semibold uppercase text-gray-600">Quotation To</div>
            <div className="font-bold mt-1">{q.customer.name}</div>
            {q.customer.address && <div className="text-xs whitespace-pre-line">{q.customer.address}</div>}
            <div className="text-xs">{q.customer.city} {q.customer.pincode}</div>
            {q.customer.gstin && <div className="text-xs font-mono">GSTIN: {q.customer.gstin}</div>}
            {q.customer.phone && <div className="text-xs">📞 {q.customer.phone}</div>}
          </div>
          <div className="p-3 text-xs">
            <div className="grid grid-cols-2 gap-1">
              <div className="text-gray-600">Quote No:</div><div className="font-mono font-semibold">{q.quotationNo}</div>
              <div className="text-gray-600">Date:</div><div>{fmtDate(q.quotationDate)}</div>
              <div className="text-gray-600">Valid Until:</div><div>{q.validUntil ? fmtDate(q.validUntil) : "—"}</div>
              <div className="text-gray-600">Tax Type:</div><div>{q.isInterState ? "IGST (Inter-state)" : "CGST + SGST"}</div>
            </div>
          </div>
        </div>

        <table className="w-full text-xs">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-800 px-2 py-1">#</th>
              <th className="border border-gray-800 px-2 py-1 text-left">Description</th>
              <th className="border border-gray-800 px-2 py-1">HSN</th>
              <th className="border border-gray-800 px-2 py-1 text-right">Qty</th>
              <th className="border border-gray-800 px-2 py-1">Unit</th>
              <th className="border border-gray-800 px-2 py-1 text-right">Rate</th>
              <th className="border border-gray-800 px-2 py-1 text-right">Taxable</th>
              <th className="border border-gray-800 px-2 py-1 text-right">GST</th>
              <th className="border border-gray-800 px-2 py-1 text-right">Delivery</th>
              <th className="border border-gray-800 px-2 py-1 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {q.items.map((it, i) => (
              <tr key={it.id}>
                <td className="border border-gray-800 px-2 py-1 text-center">{i + 1}</td>
                <td className="border border-gray-800 px-2 py-1">
                  <div>{it.product.name}</div>
                  {it.description && it.description !== it.product.name && <div className="text-[10px] text-gray-600">{it.description}</div>}
                </td>
                <td className="border border-gray-800 px-2 py-1 text-center font-mono">{it.hsnCode}</td>
                <td className="border border-gray-800 px-2 py-1 text-right">{it.quantity}</td>
                <td className="border border-gray-800 px-2 py-1 text-center">{it.product.unit}</td>
                <td className="border border-gray-800 px-2 py-1 text-right">{inr(it.rate)}</td>
                <td className="border border-gray-800 px-2 py-1 text-right">{inr(it.taxable)}</td>
                <td className="border border-gray-800 px-2 py-1 text-right">{inr(it.cgstAmt + it.sgstAmt + it.igstAmt)}</td>
                <td className="border border-gray-800 px-2 py-1 text-right">{it.deliveryDays ? `${it.deliveryDays} days` : "—"}</td>
                <td className="border border-gray-800 px-2 py-1 text-right font-semibold">{inr(it.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="grid grid-cols-2 border-t-2 border-gray-800">
          <div className="p-3 border-r border-gray-800 text-xs">
            {q.paymentTerms && (<><div className="font-semibold">Payment Terms:</div><div className="mb-2 whitespace-pre-line">{q.paymentTerms}</div></>)}
            {q.deliveryTerms && (<><div className="font-semibold">Delivery Terms:</div><div className="mb-2 whitespace-pre-line">{q.deliveryTerms}</div></>)}
            {q.notes && (<><div className="font-semibold">Notes:</div><div className="mb-2 whitespace-pre-line">{q.notes}</div></>)}
            <div className="mt-2 font-semibold">Amount in Words:</div>
            <div className="italic">{amountInWords(q.grandTotal)}</div>
          </div>
          <div className="p-3 text-xs">
            <table className="w-full">
              <tbody>
                <tr><td className="py-0.5">Sub Total (Taxable)</td><td className="text-right py-0.5 font-mono">{inr(q.subTotal)}</td></tr>
                {q.isInterState
                  ? <tr><td className="py-0.5">IGST</td><td className="text-right py-0.5 font-mono">{inr(q.igstTotal)}</td></tr>
                  : (<>
                    <tr><td className="py-0.5">CGST</td><td className="text-right py-0.5 font-mono">{inr(q.cgstTotal)}</td></tr>
                    <tr><td className="py-0.5">SGST</td><td className="text-right py-0.5 font-mono">{inr(q.sgstTotal)}</td></tr>
                  </>)}
                <tr><td className="py-0.5">Round Off</td><td className="text-right py-0.5 font-mono">{inr(q.roundOff)}</td></tr>
                <tr className="border-t-2 border-gray-800"><td className="py-1 font-bold text-sm">Grand Total</td><td className="text-right py-1 font-bold font-mono text-sm">{inr(q.grandTotal)}</td></tr>
              </tbody>
            </table>
            <div className="mt-6 text-center">
              <div className="border-t border-gray-800 pt-1 mt-8 text-xs font-semibold">Authorised Signatory</div>
              <div className="text-xs text-gray-600 mt-1">for {settings.shopName}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
