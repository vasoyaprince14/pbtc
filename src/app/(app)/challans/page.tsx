import Link from "next/link";
import { prisma } from "@/lib/db";
import { fmtDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function ChallansPage() {
  const challans = await prisma.challan.findMany({
    orderBy: { challanDate: "desc" },
    include: { customer: true, items: true },
    take: 200,
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-gray-800">Delivery Challans</h1>
        <Link href="/challans/new" className="btn-primary">+ New Challan</Link>
      </div>
      <div className="card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr>
              <th className="th">Challan No</th>
              <th className="th">Date</th>
              <th className="th">Customer</th>
              <th className="th">Purpose</th>
              <th className="th text-right">Items</th>
              <th className="th"></th>
            </tr>
          </thead>
          <tbody>
            {challans.length === 0 && (
              <tr><td className="td text-center text-gray-500 py-8" colSpan={6}>No challans yet</td></tr>
            )}
            {challans.map((c) => (
              <tr key={c.id} className="hover:bg-gray-50">
                <td className="td font-mono text-xs">{c.challanNo}</td>
                <td className="td text-xs">{fmtDate(c.challanDate)}</td>
                <td className="td font-medium">{c.customer.name}</td>
                <td className="td text-xs">{c.purpose}</td>
                <td className="td text-right">{c.items.length}</td>
                <td className="td text-right">
                  <Link href={`/challans/${c.id}/print`} target="_blank" className="text-brand-600 hover:underline text-xs">Print</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
