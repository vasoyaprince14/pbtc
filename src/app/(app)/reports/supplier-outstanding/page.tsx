import { prisma } from "@/lib/db";
import { inr } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function SupplierOutstandingPage() {
  const suppliers = await prisma.supplier.findMany({
    where: { isActive: true },
    include: {
      purchases: { select: { grandTotal: true, paidAmount: true } },
      payments: { where: { type: "PAID" }, select: { amount: true } },
    },
    orderBy: { name: "asc" },
  });

  const rows = suppliers.map((s) => {
    const totalPurchases = s.purchases.reduce((a, p) => a + p.grandTotal, 0);
    const paidInBills = s.purchases.reduce((a, p) => a + p.paidAmount, 0);
    const separatePayments = s.payments.reduce((a, p) => a + p.amount, 0);
    const outstanding = s.openingBalance + totalPurchases - paidInBills - separatePayments;
    return { ...s, totalPurchases, paidInBills, separatePayments, outstanding };
  }).filter((r) => Math.abs(r.outstanding) > 0.01);

  const totalOut = rows.reduce((a, r) => a + r.outstanding, 0);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-4">Supplier Outstanding</h1>
      <div className="card p-4 mb-4 bg-red-50 border-red-200 border">
        <div className="text-xs uppercase text-red-800 font-semibold">Total Outstanding (Payable)</div>
        <div className="text-3xl font-bold text-red-900">{inr(totalOut)}</div>
      </div>
      <div className="card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr>
              <th className="th">Supplier</th>
              <th className="th">City</th>
              <th className="th text-right">Opening</th>
              <th className="th text-right">Purchases</th>
              <th className="th text-right">Paid</th>
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
                <td className="td text-right">{inr(r.totalPurchases)}</td>
                <td className="td text-right">{inr(r.paidInBills + r.separatePayments)}</td>
                <td className="td text-right font-bold text-red-700">{inr(r.outstanding)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
