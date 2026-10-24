import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { inr, fmtDate, amountInWords } from "@/lib/format";
import PrintTrigger from "./PrintTrigger";

export const dynamic = "force-dynamic";

export default async function InvoicePrintPage({ params }: { params: { id: string } }) {
  const id = Number(params.id);
  if (!Number.isFinite(id)) notFound();

  const [sale, settings] = await Promise.all([
    prisma.sale.findUnique({
      where: { id },
      include: { customer: true, items: { include: { product: true } } },
    }),
    prisma.shopSettings.findUnique({ where: { id: 1 } }),
  ]);
  if (!sale || !settings) notFound();

  const totalTax = sale.cgstTotal + sale.sgstTotal + sale.igstTotal;

  const hsnGroups = new Map<string, { taxable: number; cgst: number; sgst: number; igst: number; rate: number }>();
  for (const it of sale.items) {
    const key = `${it.hsnCode || "-"}|${it.gstRate}`;
    const g = hsnGroups.get(key) ?? { taxable: 0, cgst: 0, sgst: 0, igst: 0, rate: it.gstRate };
    g.taxable += it.taxable;
    g.cgst += it.cgstAmt;
    g.sgst += it.sgstAmt;
    g.igst += it.igstAmt;
    hsnGroups.set(key, g);
  }

  return (
    <div className="min-h-screen bg-white p-6 print:p-0">
      <PrintTrigger />
      <div className="max-w-4xl mx-auto print-page bg-white shadow print:shadow-none border print:border-none border-gray-300">
        <div className="border-b-2 border-gray-800 p-4 flex justify-between items-start">
          <div>
            <div className="text-2xl font-bold text-brand-700">{settings.shopName}</div>
            <div className="text-xs text-gray-700 whitespace-pre-line">{settings.address}</div>
            <div className="text-xs text-gray-700">{settings.city} {settings.pincode ? `- ${settings.pincode}` : ""}, {settings.stateName}</div>
            <div className="text-xs text-gray-700">
              {settings.phone && <>📞 {settings.phone} </>}
              {settings.email && <>✉️ {settings.email}</>}
            </div>
            {settings.gstin && <div className="text-xs font-mono mt-1">GSTIN: <strong>{settings.gstin}</strong></div>}
          </div>
          <div className="text-right">
            <div className="text-lg font-bold uppercase text-gray-800">Tax Invoice</div>
            <div className="text-xs text-gray-500 mt-1">Original for Recipient</div>
          </div>
        </div>

        <div className="grid grid-cols-2 border-b border-gray-800">
          <div className="p-3 border-r border-gray-800">
            <div className="text-xs font-semibold uppercase text-gray-600">Bill To</div>
            <div className="font-bold mt-1">{sale.customer.name}</div>
            {sale.customer.address && <div className="text-xs whitespace-pre-line">{sale.customer.address}</div>}
            <div className="text-xs">{sale.customer.city} {sale.customer.pincode}</div>
            <div className="text-xs">State: {sale.customer.stateName} ({sale.customer.stateCode})</div>
            {sale.customer.gstin && <div className="text-xs font-mono mt-1">GSTIN: <strong>{sale.customer.gstin}</strong></div>}
            {sale.customer.phone && <div className="text-xs">📞 {sale.customer.phone}</div>}
          </div>
          <div className="p-3 text-xs">
            <div className="grid grid-cols-2 gap-1">
              <div className="text-gray-600">Invoice No:</div>
              <div className="font-mono font-semibold">{sale.invoiceNo}</div>
              <div className="text-gray-600">Date:</div>
              <div>{fmtDate(sale.invoiceDate)}</div>
              <div className="text-gray-600">Place of Supply:</div>
              <div>{sale.customer.stateName || settings.stateName} ({sale.customer.stateCode || settings.stateCode})</div>
              <div className="text-gray-600">Vehicle No:</div>
              <div>{sale.vehicleNo || "—"}</div>
              <div className="text-gray-600">Transporter:</div>
              <div>{sale.transporter || "—"}</div>
              {sale.transporterGstin && (<><div className="text-gray-600">Transporter GSTIN:</div><div className="font-mono">{sale.transporterGstin}</div></>)}
              {sale.distanceKm != null && (<><div className="text-gray-600">Distance:</div><div>{sale.distanceKm} km</div></>)}
              {sale.ewayBillNo && (<><div className="text-gray-600">E-way Bill:</div><div className="font-mono font-semibold">{sale.ewayBillNo}</div></>)}
            </div>
            {sale.dispatchAddress && (
              <div className="mt-2 pt-2 border-t border-gray-200">
                <div className="text-gray-600">Dispatch To:</div>
                <div className="whitespace-pre-line">{sale.dispatchAddress}</div>
              </div>
            )}
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
              {sale.isInterState ? (
                <>
                  <th className="border border-gray-800 px-2 py-1 text-right">IGST %</th>
                  <th className="border border-gray-800 px-2 py-1 text-right">IGST ₹</th>
                </>
              ) : (
                <>
                  <th className="border border-gray-800 px-2 py-1 text-right">CGST %</th>
                  <th className="border border-gray-800 px-2 py-1 text-right">CGST ₹</th>
                  <th className="border border-gray-800 px-2 py-1 text-right">SGST %</th>
                  <th className="border border-gray-800 px-2 py-1 text-right">SGST ₹</th>
                </>
              )}
              <th className="border border-gray-800 px-2 py-1 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {sale.items.map((it, i) => (
              <tr key={it.id}>
                <td className="border border-gray-800 px-2 py-1 text-center">{i + 1}</td>
                <td className="border border-gray-800 px-2 py-1">{it.product.name}</td>
                <td className="border border-gray-800 px-2 py-1 text-center font-mono">{it.hsnCode}</td>
                <td className="border border-gray-800 px-2 py-1 text-right">{it.quantity}</td>
                <td className="border border-gray-800 px-2 py-1 text-center">{it.product.unit}</td>
                <td className="border border-gray-800 px-2 py-1 text-right">{inr(it.rate)}</td>
                <td className="border border-gray-800 px-2 py-1 text-right">{inr(it.taxable)}</td>
                {sale.isInterState ? (
                  <>
                    <td className="border border-gray-800 px-2 py-1 text-right">{it.gstRate}%</td>
                    <td className="border border-gray-800 px-2 py-1 text-right">{inr(it.igstAmt)}</td>
                  </>
                ) : (
                  <>
                    <td className="border border-gray-800 px-2 py-1 text-right">{it.gstRate / 2}%</td>
                    <td className="border border-gray-800 px-2 py-1 text-right">{inr(it.cgstAmt)}</td>
                    <td className="border border-gray-800 px-2 py-1 text-right">{it.gstRate / 2}%</td>
                    <td className="border border-gray-800 px-2 py-1 text-right">{inr(it.sgstAmt)}</td>
                  </>
                )}
                <td className="border border-gray-800 px-2 py-1 text-right font-semibold">{inr(it.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="grid grid-cols-2 border-t-2 border-gray-800">
          <div className="p-3 border-r border-gray-800 text-xs">
            <div className="font-semibold mb-2">HSN / Tax Summary</div>
            <table className="w-full">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-600 px-1 py-0.5">HSN</th>
                  <th className="border border-gray-600 px-1 py-0.5 text-right">Taxable</th>
                  {sale.isInterState
                    ? <th className="border border-gray-600 px-1 py-0.5 text-right">IGST</th>
                    : (<><th className="border border-gray-600 px-1 py-0.5 text-right">CGST</th>
                         <th className="border border-gray-600 px-1 py-0.5 text-right">SGST</th></>)}
                </tr>
              </thead>
              <tbody>
                {Array.from(hsnGroups.entries()).map(([k, g]) => {
                  const [hsn] = k.split("|");
                  return (
                    <tr key={k}>
                      <td className="border border-gray-600 px-1 py-0.5 font-mono">{hsn}</td>
                      <td className="border border-gray-600 px-1 py-0.5 text-right">{inr(g.taxable)}</td>
                      {sale.isInterState
                        ? <td className="border border-gray-600 px-1 py-0.5 text-right">{inr(g.igst)}</td>
                        : (<><td className="border border-gray-600 px-1 py-0.5 text-right">{inr(g.cgst)}</td>
                            <td className="border border-gray-600 px-1 py-0.5 text-right">{inr(g.sgst)}</td></>)}
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <div className="mt-3 font-semibold">Amount in Words:</div>
            <div className="italic">{amountInWords(sale.grandTotal)}</div>

            {settings.bankName && (
              <div className="mt-3">
                <div className="font-semibold">Bank Details:</div>
                <div>{settings.bankName}</div>
                <div>A/c: <span className="font-mono">{settings.bankAccount}</span></div>
                <div>IFSC: <span className="font-mono">{settings.bankIfsc}</span></div>
                <div>{settings.bankBranch}</div>
              </div>
            )}
          </div>
          <div className="p-3 text-xs">
            <table className="w-full">
              <tbody>
                <tr><td className="py-0.5">Sub Total (Taxable)</td><td className="text-right py-0.5 font-mono">{inr(sale.subTotal)}</td></tr>
                {sale.isInterState ? (
                  <tr><td className="py-0.5">IGST</td><td className="text-right py-0.5 font-mono">{inr(sale.igstTotal)}</td></tr>
                ) : (<>
                  <tr><td className="py-0.5">CGST</td><td className="text-right py-0.5 font-mono">{inr(sale.cgstTotal)}</td></tr>
                  <tr><td className="py-0.5">SGST</td><td className="text-right py-0.5 font-mono">{inr(sale.sgstTotal)}</td></tr>
                </>)}
                <tr><td className="py-0.5">Round Off</td><td className="text-right py-0.5 font-mono">{inr(sale.roundOff)}</td></tr>
                <tr className="border-t-2 border-gray-800"><td className="py-1 font-bold text-sm">Grand Total</td><td className="text-right py-1 font-bold font-mono text-sm">{inr(sale.grandTotal)}</td></tr>
                <tr><td className="py-0.5">Total Tax</td><td className="text-right py-0.5 font-mono">{inr(totalTax)}</td></tr>
                <tr><td className="py-0.5">Paid</td><td className="text-right py-0.5 font-mono">{inr(sale.paidAmount)}</td></tr>
                <tr className="border-t"><td className="py-0.5 font-semibold">Balance Due</td><td className="text-right py-0.5 font-mono font-semibold">{inr(sale.grandTotal - sale.paidAmount)}</td></tr>
              </tbody>
            </table>

            <div className="mt-6 text-center">
              <div className="border-t border-gray-800 pt-1 mt-8 text-xs font-semibold">Authorised Signatory</div>
              <div className="text-xs text-gray-600 mt-1">for {settings.shopName}</div>
            </div>
          </div>
        </div>

        {settings.termsNote && (
          <div className="border-t border-gray-800 p-3 text-xs">
            <div className="font-semibold">Terms & Conditions:</div>
            <div className="whitespace-pre-line">{settings.termsNote}</div>
          </div>
        )}
      </div>
    </div>
  );
}
