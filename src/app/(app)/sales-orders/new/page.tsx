import { prisma } from "@/lib/db";
import { nextSalesOrderNo } from "@/lib/seq";
import { toDateInput } from "@/lib/format";
import SalesOrderForm from "../SalesOrderForm";
import { addDays } from "date-fns";

export const dynamic = "force-dynamic";

export default async function NewSalesOrderPage() {
  const [customers, products, settings, soNo] = await Promise.all([
    prisma.customer.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    prisma.product.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    prisma.shopSettings.findUnique({ where: { id: 1 } }),
    nextSalesOrderNo(),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">New Sales Order</h1>
      <SalesOrderForm
        customers={customers}
        products={products}
        shopStateCode={settings?.stateCode ?? "06"}
        initial={{
          soNo,
          soDate: toDateInput(new Date()),
          customerId: 0,
          customerPoNo: "",
          customerPoDate: "",
          expectedDelivery: toDateInput(addDays(new Date(), 20)),
          items: [],
          paymentTerms: "50% advance, balance before dispatch",
          deliveryTerms: "Ex-works",
          notes: "",
        }}
      />
    </div>
  );
}
