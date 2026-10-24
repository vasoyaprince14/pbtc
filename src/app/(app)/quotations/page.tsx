import Link from "next/link";
import { prisma } from "@/lib/db";
import { inr, fmtDate } from "@/lib/format";

export const dynamic = "force-dynamic";

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-800",
  sent: "bg-blue-100 text-blue-800",
  accepted: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  converted: "bg-brand-100 text-brand-800",
  expired: "bg-orange-100 text-orange-800",
};

export default async function QuotationsPage() {
  const quotations = await prisma.quotation.findMany({
    orderBy: { quotationDate: "desc" },
    include: { customer: true },
    take: 200,
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-gray-800">Quotations</h1>
        <Link href="/quotations/new" className="btn-primary">+ New Quotation</Link>
      </div>
      <div className="card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr>
              <th className="th">Quote No</th>
              <th className="th">Date</th>
              <th className="th">Customer</th>
              <th className="th">Valid Until</th>
              <th className="th">Status</th>
              <th className="th text-right">Total</th>
              <th className="th"></th>
            </tr>
          </thead>
          <tbody>
            {quotations.length === 0 && (
              <tr><td className="td text-center text-gray-500 py-8" colSpan={7}>No quotations yet</td></tr>
            )}
            {quotations.map((q) => (
              <tr key={q.id} className="hover:bg-gray-50">
                <td className="td font-mono text-xs">{q.quotationNo}</td>
                <td className="td text-xs">{fmtDate(q.quotationDate)}</td>
                <td className="td font-medium">{q.customer.name}</td>
                <td className="td text-xs">{q.validUntil ? fmtDate(q.validUntil) : "—"}</td>
                <td className="td">
                  <span className={`badge ${STATUS_COLORS[q.status] ?? "bg-gray-100"}`}>{q.status}</span>
                </td>
                <td className="td text-right font-semibold">{inr(q.grandTotal)}</td>
                <td className="td text-right">
                  <Link href={`/quotations/${q.id}`} className="text-brand-600 hover:underline text-xs">Open</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
