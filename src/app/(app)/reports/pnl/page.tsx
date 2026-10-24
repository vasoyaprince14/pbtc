import { prisma } from "@/lib/db";
import { inr, fmtDate, toDateInput } from "@/lib/format";
import { startOfDay, endOfDay } from "date-fns";

export const dynamic = "force-dynamic";

export default async function PnLReportPage({
  searchParams,
}: {
  searchParams?: { from?: string; to?: string };
}) {
  const today = new Date();
  const fromStr = searchParams?.from ?? toDateInput(today);
  const toStr = searchParams?.to ?? toDateInput(today);
  const from = startOfDay(new Date(fromStr));
  const to = endOfDay(new Date(toStr));

  const [sales, purchases] = await Promise.all([
    prisma.sale.findMany({
      where: { invoiceDate: { gte: from, lte: to } },
      include: { items: true, customer: true },
      orderBy: { invoiceDate: "asc" },
    }),
    prisma.purchase.aggregate({
      where: { billDate: { gte: from, lte: to } },
      _sum: { grandTotal: true, subTotal: true },
    }),
  ]);

  let totalSaleGrand = 0;
  let totalTaxable = 0;
  let totalTax = 0;
  let totalCOGS = 0;
  for (const s of sales) {
    totalSaleGrand += s.grandTotal;
    totalTaxable += s.subTotal;
    totalTax += s.cgstTotal + s.sgstTotal + s.igstTotal;
    for (const it of s.items) totalCOGS += (it.costPrice ?? 0) * it.quantity;
  }
  const grossProfit = totalTaxable - totalCOGS;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-4">Profit &amp; Loss Report</h1>

      <form className="card p-4 mb-4 flex flex-wrap gap-3 items-end no-print">
        <div>
          <label className="label">From</label>
          <input type="date" name="from" defaultValue={fromStr} className="input" />
        </div>
        <div>
          <label className="label">To</label>
          <input type="date" name="to" defaultValue={toStr} className="input" />
        </div>
        <button className="btn-primary">Apply</button>
        <button type="button" className="btn-secondary" onClick={undefined}>Print</button>
        <div className="text-xs text-gray-600 ml-auto">{fmtDate(from)} — {fmtDate(to)}</div>
      </form>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <StatCard label="Sales (incl. tax)" value={inr(totalSaleGrand)} tone="green" />
        <StatCard label="Cost of Goods Sold" value={inr(totalCOGS)} tone="red" />
        <StatCard label="Gross Profit" value={inr(grossProfit)} tone={grossProfit >= 0 ? "green" : "red"} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <StatCard label="Taxable Sales" value={inr(totalTaxable)} tone="blue" />
        <StatCard label="Tax Collected" value={inr(totalTax)} tone="purple" />
      </div>

      <div className="card overflow-hidden">
        <div className="p-3 border-b border-gray-200 bg-gray-50 font-semibold">Invoice-wise Breakdown</div>
        <table className="w-full">
          <thead>
            <tr>
              <th className="th">Date</th>
              <th className="th">Invoice</th>
              <th className="th">Customer</th>
              <th className="th text-right">Taxable</th>
              <th className="th text-right">Tax</th>
              <th className="th text-right">COGS</th>
              <th className="th text-right">Profit</th>
              <th className="th text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {sales.length === 0 && (
              <tr><td className="td text-center text-gray-500 py-8" colSpan={8}>No sales in this period</td></tr>
            )}
            {sales.map((s) => {
              const cogs = s.items.reduce((a, it) => a + (it.costPrice ?? 0) * it.quantity, 0);
              const profit = s.subTotal - cogs;
              return (
                <tr key={s.id}>
                  <td className="td text-xs">{fmtDate(s.invoiceDate)}</td>
                  <td className="td font-mono text-xs">{s.invoiceNo}</td>
                  <td className="td">{s.customer.name}</td>
                  <td className="td text-right">{inr(s.subTotal)}</td>
                  <td className="td text-right text-xs text-gray-600">{inr(s.cgstTotal + s.sgstTotal + s.igstTotal)}</td>
                  <td className="td text-right text-xs">{inr(cogs)}</td>
                  <td className={`td text-right font-medium ${profit >= 0 ? "text-green-700" : "text-red-700"}`}>{inr(profit)}</td>
                  <td className="td text-right font-medium">{inr(s.grandTotal)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="text-xs text-gray-500 mt-3">
        Purchases in this period: {inr(purchases._sum.grandTotal ?? 0)} (for reference only, doesn't affect P&L which uses COGS)
      </div>
    </div>
  );
}

function StatCard({ label, value, tone }: { label: string; value: string; tone: "green" | "red" | "blue" | "purple" }) {
  const tones = {
    green: "bg-green-50 text-green-800 border-green-200",
    red: "bg-red-50 text-red-800 border-red-200",
    blue: "bg-blue-50 text-blue-800 border-blue-200",
    purple: "bg-purple-50 text-purple-800 border-purple-200",
  };
  return (
    <div className={`card border p-4 ${tones[tone]}`}>
      <div className="text-xs uppercase font-semibold opacity-80">{label}</div>
      <div className="text-2xl font-bold mt-1">{value}</div>
    </div>
  );
}
