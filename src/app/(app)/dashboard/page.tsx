import Link from "next/link";
import { prisma } from "@/lib/db";
import { inr, fmtDate } from "@/lib/format";
import { getStockMap } from "@/lib/stock";
import { startOfDay, endOfDay, startOfMonth, endOfMonth } from "date-fns";

export const dynamic = "force-dynamic";

async function getData() {
  const today = new Date();
  const dayStart = startOfDay(today);
  const dayEnd = endOfDay(today);
  const monthStart = startOfMonth(today);
  const monthEnd = endOfMonth(today);

  const [todaySales, todayPurchases, monthSales, productCount, customerCount, recent] = await Promise.all([
    prisma.sale.aggregate({
      where: { invoiceDate: { gte: dayStart, lte: dayEnd } },
      _sum: { grandTotal: true },
      _count: { _all: true },
    }),
    prisma.purchase.aggregate({
      where: { billDate: { gte: dayStart, lte: dayEnd } },
      _sum: { grandTotal: true },
      _count: { _all: true },
    }),
    prisma.sale.aggregate({
      where: { invoiceDate: { gte: monthStart, lte: monthEnd } },
      _sum: { grandTotal: true },
    }),
    prisma.product.count({ where: { isActive: true } }),
    prisma.customer.count({ where: { isActive: true } }),
    prisma.sale.findMany({
      orderBy: { invoiceDate: "desc" },
      take: 5,
      include: { customer: true },
    }),
  ]);

  const products = await prisma.product.findMany({
    where: { isActive: true, minStock: { gt: 0 } },
    select: { id: true, name: true, unit: true, minStock: true },
  });
  const stockMap = await getStockMap(products.map((p) => p.id));
  const lowStock = products
    .map((p) => ({ ...p, stock: stockMap[p.id] ?? 0 }))
    .filter((p) => p.stock < p.minStock)
    .slice(0, 6);

  return {
    todaySales,
    todayPurchases,
    monthSales,
    productCount,
    customerCount,
    recent,
    lowStock,
  };
}

export default async function DashboardPage() {
  const d = await getData();

  const stats = [
    { label: "Today's Sales", value: inr(d.todaySales._sum.grandTotal ?? 0), sub: `${d.todaySales._count._all} invoice(s)`, color: "bg-green-50 text-green-700 border-green-200" },
    { label: "Today's Purchases", value: inr(d.todayPurchases._sum.grandTotal ?? 0), sub: `${d.todayPurchases._count._all} bill(s)`, color: "bg-blue-50 text-blue-700 border-blue-200" },
    { label: "This Month Sales", value: inr(d.monthSales._sum.grandTotal ?? 0), sub: "MTD", color: "bg-brand-50 text-brand-700 border-brand-200" },
    { label: "Active Products", value: String(d.productCount), sub: `${d.customerCount} customers`, color: "bg-purple-50 text-purple-700 border-purple-200" },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
        <div className="text-sm text-gray-500">{fmtDate(new Date())}</div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stats.map((s) => (
          <div key={s.label} className={`card border p-4 ${s.color}`}>
            <div className="text-xs font-semibold uppercase">{s.label}</div>
            <div className="text-2xl font-bold mt-1">{s.value}</div>
            <div className="text-xs mt-1 opacity-75">{s.sub}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card">
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="font-semibold text-gray-800">Recent Sales</h2>
            <Link href="/sales" className="text-xs text-brand-600 hover:underline">View all →</Link>
          </div>
          {d.recent.length === 0 ? (
            <div className="p-6 text-center text-sm text-gray-500">
              No sales yet. <Link href="/sales/new" className="text-brand-600 hover:underline">Create first invoice</Link>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr>
                  <th className="th">Invoice</th>
                  <th className="th">Customer</th>
                  <th className="th">Date</th>
                  <th className="th text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {d.recent.map((s) => (
                  <tr key={s.id}>
                    <td className="td font-mono text-xs">{s.invoiceNo}</td>
                    <td className="td">{s.customer.name}</td>
                    <td className="td">{fmtDate(s.invoiceDate)}</td>
                    <td className="td text-right font-medium">{inr(s.grandTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="card">
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="font-semibold text-gray-800">Low Stock Alert</h2>
            <Link href="/reports/stock" className="text-xs text-brand-600 hover:underline">Full report →</Link>
          </div>
          {d.lowStock.length === 0 ? (
            <div className="p-6 text-center text-sm text-gray-500">All stock levels healthy</div>
          ) : (
            <table className="w-full">
              <thead>
                <tr>
                  <th className="th">Product</th>
                  <th className="th text-right">In Stock</th>
                  <th className="th text-right">Min</th>
                </tr>
              </thead>
              <tbody>
                {d.lowStock.map((p) => (
                  <tr key={p.id}>
                    <td className="td">{p.name}</td>
                    <td className="td text-right text-red-600 font-medium">
                      {p.stock} {p.unit}
                    </td>
                    <td className="td text-right text-gray-500">{p.minStock}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link href="/sales/new" className="btn-primary">+ New Invoice</Link>
        <Link href="/purchases/new" className="btn-secondary">+ New Purchase</Link>
        <Link href="/challans/new" className="btn-secondary">+ New Challan</Link>
        <Link href="/products/new" className="btn-secondary">+ Add Product</Link>
        <Link href="/customers/new" className="btn-secondary">+ Add Customer</Link>
      </div>
    </div>
  );
}
