import Link from "next/link";
import { prisma } from "@/lib/db";
import { inr, fmtDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function SalesPage() {
  const sales = await prisma.sale.findMany({
    orderBy: { invoiceDate: "desc" },
    include: { customer: true },
    take: 200,
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-gray-800">Sales / Invoices</h1>
        <Link href="/sales/new" className="btn-primary">+ New Invoice</Link>
      </div>
      <div className="card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr>
              <th className="th">Invoice No</th>
              <th className="th">Date</th>
              <th className="th">Customer</th>
              <th className="th">GST</th>
              <th className="th text-right">Sub Total</th>
              <th className="th text-right">Tax</th>
              <th className="th text-right">Total</th>
              <th className="th"></th>
            </tr>
          </thead>
          <tbody>
            {sales.length === 0 && (
              <tr><td className="td text-center text-gray-500 py-8" colSpan={8}>No sales yet</td></tr>
            )}
            {sales.map((s) => (
              <tr key={s.id} className="hover:bg-gray-50">
                <td className="td font-mono text-xs">{s.invoiceNo}</td>
                <td className="td text-xs">{fmtDate(s.invoiceDate)}</td>
                <td className="td font-medium">{s.customer.name}</td>
                <td className="td text-xs">
                  {s.isInterState ? <span className="badge bg-blue-100 text-blue-800">IGST</span> : <span className="badge bg-green-100 text-green-800">CGST+SGST</span>}
                </td>
                <td className="td text-right">{inr(s.subTotal)}</td>
                <td className="td text-right text-gray-600">{inr(s.cgstTotal + s.sgstTotal + s.igstTotal)}</td>
                <td className="td text-right font-semibold">{inr(s.grandTotal)}</td>
                <td className="td text-right">
                  <Link href={`/sales/${s.id}`} className="text-brand-600 hover:underline text-xs mr-3">View</Link>
                  <Link href={`/sales/${s.id}/print`} className="text-brand-600 hover:underline text-xs" target="_blank">Print</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
