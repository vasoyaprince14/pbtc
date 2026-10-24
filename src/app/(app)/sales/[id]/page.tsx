import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { inr, fmtDate } from "@/lib/format";
import WhatsAppShare from "./WhatsAppShare";

export const dynamic = "force-dynamic";

export default async function SaleDetail({ params }: { params: { id: string } }) {
  const id = Number(params.id);
  if (!Number.isFinite(id)) notFound();
  const [sale, settings] = await Promise.all([
    prisma.sale.findUnique({
      where: { id },
      include: {
        customer: true,
        items: { include: { product: true } },
      },
    }),
    prisma.shopSettings.findUnique({ where: { id: 1 } }),
  ]);
  if (!sale) notFound();

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-gray-800">Invoice {sale.invoiceNo}</h1>
        <div className="flex gap-2">
          <Link href={`/sales/${sale.id}/print`} target="_blank" className="btn-primary">🖨️ Print / PDF</Link>
          <WhatsAppShare
            invoiceNo={sale.invoiceNo}
            invoiceDate={sale.invoiceDate}
            customerName={sale.customer.name}
            customerPhone={sale.customer.phone}
            grandTotal={sale.grandTotal}
            balanceDue={sale.grandTotal - sale.paidAmount}
            shopName={settings?.shopName ?? "PBTC"}
          />
          <Link href="/sales" className="btn-secondary">Back</Link>
        </div>
      </div>
      <div className="card p-5 mb-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
        <div>
          <div className="text-xs uppercase text-gray-500">Customer</div>
          <div className="font-semibold">{sale.customer.name}</div>
          <div className="text-xs text-gray-600">{sale.customer.address}</div>
          <div className="text-xs text-gray-600">{sale.customer.city} {sale.customer.pincode}</div>
          {sale.customer.gstin && <div className="text-xs font-mono">GSTIN: {sale.customer.gstin}</div>}
        </div>
        <div>
          <div className="text-xs uppercase text-gray-500">Date</div>
          <div className="font-semibold">{fmtDate(sale.invoiceDate)}</div>
          <div className="text-xs text-gray-600 mt-2">Vehicle: {sale.vehicleNo || "—"}</div>
          <div className="text-xs text-gray-600">Transporter: {sale.transporter || "—"}</div>
        </div>
        <div>
          <div className="text-xs uppercase text-gray-500">Tax Type</div>
          <div className="font-semibold">{sale.isInterState ? "IGST" : "CGST + SGST"}</div>
        </div>
      </div>

      <div className="card overflow-hidden mb-4">
        <table className="w-full">
          <thead>
            <tr>
              <th className="th">#</th>
              <th className="th">Product</th>
              <th className="th">HSN</th>
              <th className="th text-right">Qty</th>
              <th className="th text-right">Rate</th>
              <th className="th text-right">Taxable</th>
              <th className="th text-right">GST</th>
              <th className="th text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {sale.items.map((it, i) => (
              <tr key={it.id}>
                <td className="td">{i + 1}</td>
                <td className="td">{it.product.name}</td>
                <td className="td text-xs font-mono">{it.hsnCode}</td>
                <td className="td text-right">{it.quantity} {it.product.unit}</td>
                <td className="td text-right">{inr(it.rate)}</td>
                <td className="td text-right">{inr(it.taxable)}</td>
                <td className="td text-right text-xs">{inr(it.cgstAmt + it.sgstAmt + it.igstAmt)} ({it.gstRate}%)</td>
                <td className="td text-right font-medium">{inr(it.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card p-4 max-w-md ml-auto text-sm">
        <Row label="Sub Total" value={inr(sale.subTotal)} />
        {sale.isInterState ? (
          <Row label="IGST" value={inr(sale.igstTotal)} />
        ) : (
          <>
            <Row label="CGST" value={inr(sale.cgstTotal)} />
            <Row label="SGST" value={inr(sale.sgstTotal)} />
          </>
        )}
        <Row label="Round Off" value={inr(sale.roundOff)} muted />
        <div className="border-t pt-2 mt-2">
          <Row label="Grand Total" value={inr(sale.grandTotal)} bold />
        </div>
        <Row label="Paid" value={inr(sale.paidAmount)} />
        <Row label="Balance" value={inr(sale.grandTotal - sale.paidAmount)} />
      </div>
    </div>
  );
}

function Row({ label, value, bold, muted }: { label: string; value: string; bold?: boolean; muted?: boolean }) {
  return (
    <div className={`flex justify-between py-1 ${bold ? "font-bold text-base" : ""} ${muted ? "text-gray-500 text-xs" : ""}`}>
      <span>{label}</span>
      <span className="font-mono">{value}</span>
    </div>
  );
}
