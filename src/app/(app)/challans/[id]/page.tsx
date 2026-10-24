import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { fmtDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function ChallanDetail({ params }: { params: { id: string } }) {
  const id = Number(params.id);
  if (!Number.isFinite(id)) notFound();
  const challan = await prisma.challan.findUnique({
    where: { id },
    include: { customer: true, items: { include: { product: true } } },
  });
  if (!challan) notFound();

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-gray-800">Challan {challan.challanNo}</h1>
        <div className="flex gap-2">
          <Link href={`/challans/${challan.id}/print`} target="_blank" className="btn-primary">🖨️ Print / PDF</Link>
          <Link href="/challans" className="btn-secondary">Back</Link>
        </div>
      </div>
      <div className="card p-5 mb-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
        <div>
          <div className="text-xs uppercase text-gray-500">Customer</div>
          <div className="font-semibold">{challan.customer.name}</div>
        </div>
        <div>
          <div className="text-xs uppercase text-gray-500">Date</div>
          <div>{fmtDate(challan.challanDate)}</div>
        </div>
        <div>
          <div className="text-xs uppercase text-gray-500">Purpose</div>
          <div>{challan.purpose}</div>
        </div>
      </div>
      <div className="card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr>
              <th className="th">#</th>
              <th className="th">Product</th>
              <th className="th text-right">Qty</th>
              <th className="th">Unit</th>
              <th className="th">Remarks</th>
            </tr>
          </thead>
          <tbody>
            {challan.items.map((it, i) => (
              <tr key={it.id}>
                <td className="td">{i + 1}</td>
                <td className="td">{it.product.name}</td>
                <td className="td text-right">{it.quantity}</td>
                <td className="td">{it.product.unit}</td>
                <td className="td text-xs">{it.remarks}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
