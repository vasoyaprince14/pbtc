import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { fmtDate } from "@/lib/format";
import PrintTrigger from "../../../sales/[id]/print/PrintTrigger";

export const dynamic = "force-dynamic";

export default async function ChallanPrintPage({ params }: { params: { id: string } }) {
  const id = Number(params.id);
  if (!Number.isFinite(id)) notFound();
  const [challan, settings] = await Promise.all([
    prisma.challan.findUnique({
      where: { id },
      include: { customer: true, items: { include: { product: true } } },
    }),
    prisma.shopSettings.findUnique({ where: { id: 1 } }),
  ]);
  if (!challan || !settings) notFound();

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
            <div className="text-lg font-bold uppercase text-gray-800">Delivery Challan</div>
            <div className="text-xs text-gray-500 mt-1">Not for tax purposes</div>
          </div>
        </div>

        <div className="grid grid-cols-2 border-b border-gray-800">
          <div className="p-3 border-r border-gray-800">
            <div className="text-xs font-semibold uppercase text-gray-600">Delivered To</div>
            <div className="font-bold mt-1">{challan.customer.name}</div>
            {challan.customer.address && <div className="text-xs whitespace-pre-line">{challan.customer.address}</div>}
            <div className="text-xs">{challan.customer.city} {challan.customer.pincode}</div>
            <div className="text-xs">State: {challan.customer.stateName} ({challan.customer.stateCode})</div>
            {challan.customer.gstin && <div className="text-xs font-mono mt-1">GSTIN: <strong>{challan.customer.gstin}</strong></div>}
            {challan.customer.phone && <div className="text-xs">📞 {challan.customer.phone}</div>}
          </div>
          <div className="p-3 text-xs">
            <div className="grid grid-cols-2 gap-1">
              <div className="text-gray-600">Challan No:</div>
              <div className="font-mono font-semibold">{challan.challanNo}</div>
              <div className="text-gray-600">Date:</div>
              <div>{fmtDate(challan.challanDate)}</div>
              <div className="text-gray-600">Purpose:</div>
              <div className="font-semibold">{challan.purpose}</div>
              <div className="text-gray-600">Vehicle No:</div>
              <div>{challan.vehicleNo || "—"}</div>
              <div className="text-gray-600">Transporter:</div>
              <div>{challan.transporter || "—"}</div>
            </div>
          </div>
        </div>

        <table className="w-full text-xs">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-800 px-2 py-1">#</th>
              <th className="border border-gray-800 px-2 py-1 text-left">Description</th>
              <th className="border border-gray-800 px-2 py-1 text-right">Quantity</th>
              <th className="border border-gray-800 px-2 py-1">Unit</th>
              <th className="border border-gray-800 px-2 py-1 text-left">Remarks</th>
            </tr>
          </thead>
          <tbody>
            {challan.items.map((it, i) => (
              <tr key={it.id}>
                <td className="border border-gray-800 px-2 py-1 text-center">{i + 1}</td>
                <td className="border border-gray-800 px-2 py-1">{it.product.name}</td>
                <td className="border border-gray-800 px-2 py-1 text-right">{it.quantity}</td>
                <td className="border border-gray-800 px-2 py-1 text-center">{it.product.unit}</td>
                <td className="border border-gray-800 px-2 py-1">{it.remarks}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {challan.notes && (
          <div className="border-t border-gray-800 p-3 text-xs">
            <div className="font-semibold">Notes:</div>
            <div className="whitespace-pre-line">{challan.notes}</div>
          </div>
        )}

        <div className="grid grid-cols-2 border-t-2 border-gray-800">
          <div className="p-6 text-center text-xs">
            <div className="mt-8 border-t border-gray-800 pt-1">Receiver's Signature</div>
          </div>
          <div className="p-6 text-center text-xs">
            <div className="mt-8 border-t border-gray-800 pt-1 font-semibold">Authorised Signatory</div>
            <div className="text-gray-600 mt-1">for {settings.shopName}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
