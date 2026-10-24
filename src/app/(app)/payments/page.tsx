import Link from "next/link";
import { prisma } from "@/lib/db";
import { inr, fmtDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function PaymentsPage() {
  const payments = await prisma.payment.findMany({
    orderBy: { paidOn: "desc" },
    include: { customer: true, supplier: true },
    take: 200,
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-gray-800">Payments</h1>
        <Link href="/payments/new" className="btn-primary">+ Record Payment</Link>
      </div>
      <div className="card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr>
              <th className="th">Date</th>
              <th className="th">Type</th>
              <th className="th">Party</th>
              <th className="th">Mode</th>
              <th className="th">Ref No</th>
              <th className="th text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {payments.length === 0 && <tr><td className="td text-center text-gray-500 py-8" colSpan={6}>No payments recorded</td></tr>}
            {payments.map((p) => (
              <tr key={p.id}>
                <td className="td text-xs">{fmtDate(p.paidOn)}</td>
                <td className="td">
                  <span className={`badge ${p.type === "RECEIVED" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                    {p.type}
                  </span>
                </td>
                <td className="td font-medium">{p.customer?.name ?? p.supplier?.name ?? "—"}</td>
                <td className="td text-xs">{p.mode}</td>
                <td className="td font-mono text-xs">{p.refNo}</td>
                <td className="td text-right font-medium">{inr(p.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
