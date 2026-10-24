import { prisma } from "@/lib/db";
import { inr } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function CustomerOutstandingPage() {
  const customers = await prisma.customer.findMany({
    where: { isActive: true },
    include: {
      sales: { select: { grandTotal: true, paidAmount: true } },
      payments: { where: { type: "RECEIVED" }, select: { amount: true } },
    },
    orderBy: { name: "asc" },
  });

  const rows = customers.map((c) => {
    const totalSales = c.sales.reduce((a, s) => a + s.grandTotal, 0);
    const receivedInInvoices = c.sales.reduce((a, s) => a + s.paidAmount, 0);
    const separatePayments = c.payments.reduce((a, p) => a + p.amount, 0);
    const outstanding = c.openingBalance + totalSales - receivedInInvoices - separatePayments;
    return { ...c, totalSales, receivedInInvoices, separatePayments, outstanding };
  }).filter((r) => Math.abs(r.outstanding) > 0.01);

  const totalOut = rows.reduce((a, r) => a + r.outstanding, 0);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-4">Customer Outstanding</h1>
      <div className="card p-4 mb-4 bg-brand-50 border-brand-200 border">
        <div className="text-xs uppercase text-brand-800 font-semibold">Total Outstanding (Receivable)</div>
        <div className="text-3xl font-bold text-brand-900">{inr(totalOut)}</div>
      </div>
      <div className="card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr>
              <th className="th">Customer</th>
              <th className="th">City</th>
              <th className="th text-right">Opening</th>
              <th className="th text-right">Sales</th>
              <th className="th text-right">Received</th>
              <th className="th text-right">Outstanding</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && <tr><td className="td text-center text-gray-500 py-8" colSpan={6}>No outstanding balances</td></tr>}
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="td font-medium">{r.name}</td>
                <td className="td text-xs">{r.city}</td>
                <td className="td text-right">{inr(r.openingBalance)}</td>
                <td className="td text-right">{inr(r.totalSales)}</td>
                <td className="td text-right">{inr(r.receivedInInvoices + r.separatePayments)}</td>
                <td className="td text-right font-bold text-red-700">{inr(r.outstanding)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
