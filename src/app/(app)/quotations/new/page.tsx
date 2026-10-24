import { prisma } from "@/lib/db";
import { nextQuotationNo } from "@/lib/seq";
import { toDateInput } from "@/lib/format";
import QuotationForm from "../QuotationForm";
import { addDays } from "date-fns";

export const dynamic = "force-dynamic";

export default async function NewQuotationPage() {
  const [customers, products, settings, quotationNo] = await Promise.all([
    prisma.customer.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    prisma.product.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    prisma.shopSettings.findUnique({ where: { id: 1 } }),
    nextQuotationNo(),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">New Quotation</h1>
      <QuotationForm
        customers={customers}
        products={products}
        shopStateCode={settings?.stateCode ?? "06"}
        initial={{
          quotationNo,
          quotationDate: toDateInput(new Date()),
          validUntil: toDateInput(addDays(new Date(), 30)),
          customerId: 0,
          items: [],
          paymentTerms: "50% advance, balance before dispatch",
          deliveryTerms: "Ex-works, delivery in 15-20 days",
          notes: "",
          status: "draft",
        }}
      />
    </div>
  );
}
