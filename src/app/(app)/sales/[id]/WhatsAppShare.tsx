"use client";

import { inr, fmtDate } from "@/lib/format";

export default function WhatsAppShare({
  invoiceNo, invoiceDate, customerName, customerPhone, grandTotal, balanceDue, shopName,
}: {
  invoiceNo: string;
  invoiceDate: string | Date;
  customerName: string;
  customerPhone: string;
  grandTotal: number;
  balanceDue: number;
  shopName: string;
}) {
  const clean = (customerPhone || "").replace(/[^\d]/g, "");
  const phone = clean.length === 10 ? `91${clean}` : clean;

  const lines = [
    `Hello ${customerName},`,
    ``,
    `Your invoice from *${shopName}*:`,
    `Invoice No: *${invoiceNo}*`,
    `Date: ${fmtDate(invoiceDate)}`,
    `Total: *${inr(grandTotal)}*`,
    balanceDue > 0.01 ? `Balance Due: ${inr(balanceDue)}` : `Fully Paid ✅`,
    ``,
    `PDF copy will be shared shortly. Thank you for your business!`,
  ].join("\n");

  const url = phone
    ? `https://wa.me/${phone}?text=${encodeURIComponent(lines)}`
    : `https://wa.me/?text=${encodeURIComponent(lines)}`;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="btn bg-green-600 text-white hover:bg-green-700"
      title={phone ? `Send to ${customerPhone}` : "Customer phone not set — pick contact in WhatsApp"}
    >
      💬 Share on WhatsApp
    </a>
  );
}
