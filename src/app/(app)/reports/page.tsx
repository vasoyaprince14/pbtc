import Link from "next/link";

const reports = [
  { href: "/reports/pnl", title: "Daily P&L", desc: "Sales, cost of goods, gross profit for a date range." },
  { href: "/reports/stock", title: "Stock Report", desc: "Current stock, valuation, low-stock alerts, rack-wise view." },
  { href: "/reports/gst", title: "GST Summary", desc: "CGST / SGST / IGST collected and paid, HSN-wise." },
  { href: "/reports/customer-outstanding", title: "Customer Outstanding", desc: "Who owes you how much." },
  { href: "/reports/supplier-outstanding", title: "Supplier Outstanding", desc: "Whom you owe how much." },
  { href: "/reports/item-sales", title: "Item Sales Report", desc: "Product-wise sales volume and profit." },
];

export default function ReportsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Reports</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {reports.map((r) => (
          <Link key={r.href} href={r.href} className="card p-5 hover:border-brand-400 hover:shadow-md transition-all">
            <div className="font-semibold text-gray-800">{r.title}</div>
            <div className="text-xs text-gray-600 mt-1">{r.desc}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
