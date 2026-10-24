import { prisma } from "@/lib/db";
import { inr, fmtDate, toDateInput } from "@/lib/format";
import { startOfMonth, endOfMonth, startOfDay, endOfDay } from "date-fns";

export const dynamic = "force-dynamic";

export default async function GstReportPage({
  searchParams,
}: {
  searchParams?: { from?: string; to?: string };
}) {
  const today = new Date();
  const fromStr = searchParams?.from ?? toDateInput(startOfMonth(today));
  const toStr = searchParams?.to ?? toDateInput(endOfMonth(today));
  const from = startOfDay(new Date(fromStr));
  const to = endOfDay(new Date(toStr));

  const [saleItems, purchaseItems, sales, purchases] = await Promise.all([
    prisma.saleItem.findMany({
      where: { sale: { invoiceDate: { gte: from, lte: to } } },
      include: { sale: true, product: true },
    }),
    prisma.purchaseItem.findMany({
      where: { purchase: { billDate: { gte: from, lte: to } } },
      include: { purchase: true, product: true },
    }),
    prisma.sale.aggregate({
      where: { invoiceDate: { gte: from, lte: to } },
      _sum: { subTotal: true, cgstTotal: true, sgstTotal: true, igstTotal: true, grandTotal: true },
    }),
    prisma.purchase.aggregate({
      where: { billDate: { gte: from, lte: to } },
      _sum: { subTotal: true, cgstTotal: true, sgstTotal: true, igstTotal: true, grandTotal: true },
    }),
  ]);

  const salesHsn = new Map<string, { hsn: string; rate: number; taxable: number; cgst: number; sgst: number; igst: number }>();
  for (const it of saleItems) {
    const key = `${it.hsnCode || "-"}|${it.gstRate}`;
    const g = salesHsn.get(key) ?? { hsn: it.hsnCode || "-", rate: it.gstRate, taxable: 0, cgst: 0, sgst: 0, igst: 0 };
    g.taxable += it.taxable;
    g.cgst += it.cgstAmt;
    g.sgst += it.sgstAmt;
    g.igst += it.igstAmt;
    salesHsn.set(key, g);
  }
  const purchaseHsn = new Map<string, { hsn: string; rate: number; taxable: number; cgst: number; sgst: number; igst: number }>();
  for (const it of purchaseItems) {
    const key = `${it.hsnCode || "-"}|${it.gstRate}`;
    const g = purchaseHsn.get(key) ?? { hsn: it.hsnCode || "-", rate: it.gstRate, taxable: 0, cgst: 0, sgst: 0, igst: 0 };
    g.taxable += it.taxable;
    g.cgst += it.cgstAmt;
    g.sgst += it.sgstAmt;
    g.igst += it.igstAmt;
    purchaseHsn.set(key, g);
  }

  const outputTax = (sales._sum.cgstTotal ?? 0) + (sales._sum.sgstTotal ?? 0) + (sales._sum.igstTotal ?? 0);
  const inputTax = (purchases._sum.cgstTotal ?? 0) + (purchases._sum.sgstTotal ?? 0) + (purchases._sum.igstTotal ?? 0);
  const netPayable = outputTax - inputTax;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-4">GST Summary Report</h1>

      <form className="card p-4 mb-4 flex flex-wrap gap-3 items-end">
        <div>
          <label className="label">From</label>
          <input type="date" name="from" defaultValue={fromStr} className="input" />
        </div>
        <div>
          <label className="label">To</label>
          <input type="date" name="to" defaultValue={toStr} className="input" />
        </div>
        <button className="btn-primary">Apply</button>
        <div className="text-xs text-gray-600 ml-auto">{fmtDate(from)} — {fmtDate(to)}</div>
      </form>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div className="card p-4 bg-green-50 border-green-200 border">
          <div className="text-xs uppercase text-green-800 font-semibold">Output Tax (Sales)</div>
          <div className="text-2xl font-bold text-green-900">{inr(outputTax)}</div>
          <div className="text-xs text-green-700 mt-1">Collected from customers</div>
        </div>
        <div className="card p-4 bg-blue-50 border-blue-200 border">
          <div className="text-xs uppercase text-blue-800 font-semibold">Input Tax (Purchases)</div>
          <div className="text-2xl font-bold text-blue-900">{inr(inputTax)}</div>
          <div className="text-xs text-blue-700 mt-1">Paid to suppliers (ITC)</div>
        </div>
        <div className={`card p-4 border ${netPayable >= 0 ? "bg-brand-50 border-brand-200" : "bg-purple-50 border-purple-200"}`}>
          <div className="text-xs uppercase font-semibold">Net GST {netPayable >= 0 ? "Payable" : "Credit"}</div>
          <div className="text-2xl font-bold">{inr(Math.abs(netPayable))}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <HsnTable title="Sales — HSN Wise (Output Tax)" rows={Array.from(salesHsn.values())} />
        <HsnTable title="Purchases — HSN Wise (Input Tax)" rows={Array.from(purchaseHsn.values())} />
      </div>

      <div className="card mt-4 p-4">
        <h2 className="font-semibold mb-2">Totals</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <div className="font-semibold mb-1">Sales</div>
            <Row label="Taxable" value={inr(sales._sum.subTotal ?? 0)} />
            <Row label="CGST" value={inr(sales._sum.cgstTotal ?? 0)} />
            <Row label="SGST" value={inr(sales._sum.sgstTotal ?? 0)} />
            <Row label="IGST" value={inr(sales._sum.igstTotal ?? 0)} />
            <Row label="Grand Total" value={inr(sales._sum.grandTotal ?? 0)} bold />
          </div>
          <div>
            <div className="font-semibold mb-1">Purchases</div>
            <Row label="Taxable" value={inr(purchases._sum.subTotal ?? 0)} />
            <Row label="CGST" value={inr(purchases._sum.cgstTotal ?? 0)} />
            <Row label="SGST" value={inr(purchases._sum.sgstTotal ?? 0)} />
            <Row label="IGST" value={inr(purchases._sum.igstTotal ?? 0)} />
            <Row label="Grand Total" value={inr(purchases._sum.grandTotal ?? 0)} bold />
          </div>
        </div>
      </div>
    </div>
  );
}

function HsnTable({ title, rows }: { title: string; rows: { hsn: string; rate: number; taxable: number; cgst: number; sgst: number; igst: number }[] }) {
  return (
    <div className="card overflow-hidden">
      <div className="p-3 border-b border-gray-200 bg-gray-50 font-semibold text-sm">{title}</div>
      <table className="w-full">
        <thead>
          <tr>
            <th className="th">HSN</th>
            <th className="th text-right">Rate</th>
            <th className="th text-right">Taxable</th>
            <th className="th text-right">CGST</th>
            <th className="th text-right">SGST</th>
            <th className="th text-right">IGST</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr><td className="td text-center text-gray-500 py-6" colSpan={6}>No data</td></tr>
          )}
          {rows.map((r, i) => (
            <tr key={i}>
              <td className="td font-mono text-xs">{r.hsn}</td>
              <td className="td text-right">{r.rate}%</td>
              <td className="td text-right">{inr(r.taxable)}</td>
              <td className="td text-right">{inr(r.cgst)}</td>
              <td className="td text-right">{inr(r.sgst)}</td>
              <td className="td text-right">{inr(r.igst)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between py-0.5 ${bold ? "font-bold border-t mt-1 pt-1" : ""}`}>
      <span>{label}</span>
      <span className="font-mono">{value}</span>
    </div>
  );
}
