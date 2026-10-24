import { prisma } from "@/lib/db";
import { inr, fmtDate, toDateInput, num } from "@/lib/format";
import { startOfMonth, endOfMonth, startOfDay, endOfDay } from "date-fns";

export const dynamic = "force-dynamic";

export default async function ItemSalesReportPage({
  searchParams,
}: {
  searchParams?: { from?: string; to?: string };
}) {
  const today = new Date();
  const fromStr = searchParams?.from ?? toDateInput(startOfMonth(today));
  const toStr = searchParams?.to ?? toDateInput(endOfMonth(today));
  const from = startOfDay(new Date(fromStr));
  const to = endOfDay(new Date(toStr));

  const items = await prisma.saleItem.findMany({
    where: { sale: { invoiceDate: { gte: from, lte: to } } },
    include: { product: true },
  });

  const agg = new Map<number, { name: string; sku: string; unit: string; qty: number; revenue: number; cogs: number }>();
  for (const it of items) {
    const g = agg.get(it.productId) ?? {
      name: it.product.name, sku: it.product.sku, unit: it.product.unit,
      qty: 0, revenue: 0, cogs: 0,
    };
    g.qty += it.quantity;
    g.revenue += it.taxable;
    g.cogs += it.costPrice * it.quantity;
    agg.set(it.productId, g);
  }
  const rows = Array.from(agg.entries())
    .map(([id, g]) => ({ id, ...g, profit: g.revenue - g.cogs }))
    .sort((a, b) => b.revenue - a.revenue);

  const totalQty = rows.reduce((a, r) => a + r.qty, 0);
  const totalRev = rows.reduce((a, r) => a + r.revenue, 0);
  const totalProfit = rows.reduce((a, r) => a + r.profit, 0);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-4">Item Sales Report</h1>
      <form className="card p-4 mb-4 flex flex-wrap gap-3 items-end">
        <div><label className="label">From</label><input type="date" name="from" defaultValue={fromStr} className="input" /></div>
        <div><label className="label">To</label><input type="date" name="to" defaultValue={toStr} className="input" /></div>
        <button className="btn-primary">Apply</button>
        <div className="text-xs text-gray-600 ml-auto">{fmtDate(from)} — {fmtDate(to)}</div>
      </form>
      <div className="card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr>
              <th className="th">SKU</th>
              <th className="th">Item</th>
              <th className="th text-right">Qty Sold</th>
              <th className="th text-right">Revenue</th>
              <th className="th text-right">COGS</th>
              <th className="th text-right">Profit</th>
              <th className="th text-right">Margin %</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && <tr><td className="td text-center text-gray-500 py-8" colSpan={7}>No sales in this period</td></tr>}
            {rows.map((r) => {
              const margin = r.revenue > 0 ? (r.profit / r.revenue) * 100 : 0;
              return (
                <tr key={r.id}>
                  <td className="td font-mono text-xs">{r.sku}</td>
                  <td className="td font-medium">{r.name}</td>
                  <td className="td text-right">{num(r.qty, 0)} {r.unit}</td>
                  <td className="td text-right">{inr(r.revenue)}</td>
                  <td className="td text-right text-xs">{inr(r.cogs)}</td>
                  <td className={`td text-right font-medium ${r.profit >= 0 ? "text-green-700" : "text-red-700"}`}>{inr(r.profit)}</td>
                  <td className="td text-right text-xs">{margin.toFixed(1)}%</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-gray-100 font-semibold">
              <td className="td" colSpan={2}>Total</td>
              <td className="td text-right">{num(totalQty, 0)}</td>
              <td className="td text-right">{inr(totalRev)}</td>
              <td className="td"></td>
              <td className="td text-right">{inr(totalProfit)}</td>
              <td className="td"></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
