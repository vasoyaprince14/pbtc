import Link from "next/link";
import { prisma } from "@/lib/db";
import { getStockMap } from "@/lib/stock";
import { inr, num } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function ProductsPage({
  searchParams,
}: {
  searchParams?: { q?: string };
}) {
  const q = searchParams?.q?.trim() ?? "";
  const where = q
    ? {
        OR: [
          { name: { contains: q } },
          { sku: { contains: q } },
          { category: { contains: q } },
          { hsnCode: { contains: q } },
        ],
      }
    : {};

  const products = await prisma.product.findMany({
    where,
    orderBy: { name: "asc" },
    take: 500,
  });
  const stockMap = await getStockMap(products.map((p) => p.id));

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-gray-800">Products</h1>
        <div className="flex gap-2">
          <Link href="/products/barcodes" className="btn-secondary">🏷️ Print Barcodes</Link>
          <Link href="/products/new" className="btn-primary">+ Add Product</Link>
        </div>
      </div>

      <form className="mb-4">
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="Search by name, SKU, HSN or category…"
          className="input max-w-md"
        />
      </form>

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr>
              <th className="th">SKU</th>
              <th className="th">Name</th>
              <th className="th">HSN</th>
              <th className="th">Rack</th>
              <th className="th text-right">Stock</th>
              <th className="th text-right">Sale ₹</th>
              <th className="th text-right">GST %</th>
              <th className="th"></th>
            </tr>
          </thead>
          <tbody>
            {products.length === 0 && (
              <tr><td className="td text-center text-gray-500 py-8" colSpan={8}>No products yet</td></tr>
            )}
            {products.map((p) => {
              const stock = stockMap[p.id] ?? 0;
              const low = p.minStock > 0 && stock < p.minStock;
              return (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="td font-mono text-xs">{p.sku}</td>
                  <td className="td font-medium">{p.name}</td>
                  <td className="td text-xs text-gray-600">{p.hsnCode || "—"}</td>
                  <td className="td text-xs">{p.rack || "—"}</td>
                  <td className={`td text-right ${low ? "text-red-600 font-semibold" : ""}`}>
                    {num(stock, 0)} {p.unit}
                  </td>
                  <td className="td text-right">{inr(p.salePrice)}</td>
                  <td className="td text-right">{p.gstRate}%</td>
                  <td className="td text-right">
                    <Link href={`/products/${p.id}`} className="text-brand-600 hover:underline text-xs">Edit</Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="text-xs text-gray-500 mt-2">Showing {products.length} product(s)</div>
    </div>
  );
}
