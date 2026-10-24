import { prisma } from "@/lib/db";
import { nextPurchaseBillNo } from "@/lib/seq";
import { toDateInput } from "@/lib/format";
import PurchaseForm from "../PurchaseForm";

export const dynamic = "force-dynamic";

export default async function NewPurchasePage() {
  const [suppliers, products, settings, billNo] = await Promise.all([
    prisma.supplier.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    prisma.product.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    prisma.shopSettings.findUnique({ where: { id: 1 } }),
    nextPurchaseBillNo(),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">New Purchase</h1>
      <PurchaseForm
        suppliers={suppliers}
        products={products}
        shopStateCode={settings?.stateCode ?? "06"}
        initial={{
          billNo,
          supplierBillNo: "",
          billDate: toDateInput(new Date()),
          supplierId: 0,
          items: [],
          discount: 0,
          notes: "",
          paidAmount: 0,
        }}
      />
    </div>
  );
}
