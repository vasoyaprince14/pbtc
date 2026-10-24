import Link from "next/link";
import { prisma } from "@/lib/db";
import { inr, fmtDate } from "@/lib/format";

export const dynamic = "force-dynamic";

const STATUS_COLORS: Record<string, string> = {
  open: "bg-blue-100 text-blue-800",
  partial: "bg-orange-100 text-orange-800",
  closed: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

export default async function SalesOrdersPage() {
  const orders = await prisma.salesOrder.findMany({
    orderBy: { soDate: "desc" },
    include: {
      customer: true,
      items: { include: { saleItems: true } },
    },
    take: 200,
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-gray-800">Sales Orders</h1>
        <Link href="/sales-orders/new" className="btn-primary">+ New Sales Order</Link>
      </div>
      <div className="card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr>
              <th className="th">SO No</th>
              <th className="th">Date</th>
              <th className="th">Customer</th>
              <th className="th">Cust PO</th>
              <th className="th">Expected</th>
              <th className="th">Status</th>
              <th className="th text-right">Progress</th>
              <th className="th text-right">Total</th>
              <th className="th"></th>
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 && (
              <tr><td className="td text-center text-gray-500 py-8" colSpan={9}>No sales orders yet</td></tr>
            )}
            {orders.map((so) => {
              const totalOrdered = so.items.reduce((a, i) => a + i.orderedQty, 0);
              const totalDelivered = so.items.reduce(
                (a, i) => a + i.saleItems.reduce((x, s) => x + s.quantity, 0), 0
              );
              const pct = totalOrdered > 0 ? Math.round((totalDelivered / totalOrdered) * 100) : 0;
              return (
                <tr key={so.id} className="hover:bg-gray-50">
                  <td className="td font-mono text-xs">{so.soNo}</td>
                  <td className="td text-xs">{fmtDate(so.soDate)}</td>
                  <td className="td font-medium">{so.customer.name}</td>
                  <td className="td text-xs">{so.customerPoNo || "—"}</td>
                  <td className="td text-xs">{so.expectedDelivery ? fmtDate(so.expectedDelivery) : "—"}</td>
                  <td className="td">
                    <span className={`badge ${STATUS_COLORS[so.status] ?? "bg-gray-100"}`}>{so.status}</span>
                  </td>
                  <td className="td text-right">
                    <div className="text-xs">{pct}%</div>
                    <div className="w-16 bg-gray-200 rounded h-1 ml-auto mt-0.5">
                      <div className="bg-brand-500 h-1 rounded" style={{ width: `${pct}%` }} />
                    </div>
                  </td>
                  <td className="td text-right font-semibold">{inr(so.grandTotal)}</td>
                  <td className="td text-right">
                    <Link href={`/sales-orders/${so.id}`} className="text-brand-600 hover:underline text-xs">Open</Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
