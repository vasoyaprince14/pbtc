import { prisma } from "@/lib/db";
import BarcodePanel from "./BarcodePanel";

export const dynamic = "force-dynamic";

export default async function BarcodesPage() {
  const products = await prisma.product.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, sku: true, name: true, salePrice: true, unit: true, category: true },
  });
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-2">Barcode Labels</h1>
      <p className="text-sm text-gray-600 mb-4">Pick products &amp; quantities, then print — labels come out on A4 (usually ~40 per sheet).</p>
      <BarcodePanel products={products} />
    </div>
  );
}
