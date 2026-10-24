import { prisma } from "@/lib/db";
import { getStockMap } from "@/lib/stock";
import { inr, num } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function StockReportPage() {
  const products = await prisma.product.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });
  const stockMap = await getStockMap(products.map((p) => p.id));

  let totalValue = 0;
  const rows = products.map((p) => {
    const stock = stockMap[p.id] ?? 0;
    const value = stock * p.purchasePrice;
    totalValue += value;
    return {
      ...p,
      stock,
      value,
      low: p.minStock > 0 && stock < p.minStock,
    };
  });

  const totalItems = rows.reduce((a, r) => a + (r.stock > 0 ? 1 : 0), 0);
  const lowStock = rows.filter((r) => r.low).length;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-4">Stock Report</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div className="card p-4">
          <div className="text-xs uppercase text-gray-500">Total Stock Value</div>
          <div className="text-2xl font-bold">{inr(totalValue)}</div>
          <div className="text-xs text-gray-500">at cost price</div>
        </div>
        <div className="card p-4">
          <div className="text-xs uppercase text-gray-500">Products in Stock</div>
          <div className="text-2xl font-bold">{totalItems}</div>
          <div className="text-xs text-gray-500">of {products.length} active</div>
        </div>
        <div className="card p-4">
          <div className="text-xs uppercase text-gray-500">Low Stock Alerts</div>
          <div className="text-2xl font-bold text-red-600">{lowStock}</div>
        </div>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr>
              <th className="th">SKU</th>
              <th className="th">Name</th>
              <th className="th">Category</th>
              <th className="th">Rack</th>
              <th className="th text-right">In Stock</th>
              <th className="th text-right">Min</th>
              <th className="th text-right">Cost</th>
              <th className="th text-right">Value</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className={r.low ? "bg-red-50" : ""}>
                <td className="td font-mono text-xs">{r.sku}</td>
                <td className="td font-medium">{r.name}</td>
                <td className="td text-xs">{r.category || "—"}</td>
                <td className="td text-xs">{r.rack || "—"}</td>
                <td className={`td text-right ${r.low ? "text-red-700 font-semibold" : ""}`}>
                  {num(r.stock, 0)} {r.unit}
                </td>
                <td className="td text-right text-xs text-gray-500">{r.minStock ? num(r.minStock, 0) : "—"}</td>
                <td className="td text-right">{inr(r.purchasePrice)}</td>
                <td className="td text-right font-medium">{inr(r.value)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-gray-100 font-semibold">
              <td className="td" colSpan={7}>Total Stock Value</td>
              <td className="td text-right">{inr(totalValue)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
