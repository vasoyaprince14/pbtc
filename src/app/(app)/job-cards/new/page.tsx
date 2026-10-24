import { prisma } from "@/lib/db";
import { nextJobCardNo } from "@/lib/seq";
import { toDateInput } from "@/lib/format";
import JobCardForm from "../JobCardForm";
import { addDays } from "date-fns";

export const dynamic = "force-dynamic";

export default async function NewJobCardPage({
  searchParams,
}: {
  searchParams?: { soId?: string };
}) {
  const soId = searchParams?.soId ? Number(searchParams.soId) : null;

  const [products, salesOrders, cardNo] = await Promise.all([
    prisma.product.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    prisma.salesOrder.findMany({
      where: { status: { in: ["open", "partial"] } },
      orderBy: { soDate: "desc" },
      include: { customer: true, items: { include: { product: true, saleItems: true } } },
      take: 100,
    }),
    nextJobCardNo(),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">New Job Card</h1>
      <JobCardForm
        products={products}
        salesOrders={salesOrders.map((so) => ({
          id: so.id,
          soNo: so.soNo,
          customerName: so.customer.name,
          items: so.items.map((i) => {
            const delivered = i.saleItems.reduce((a, s) => a + s.quantity, 0);
            return {
              id: i.id, productId: i.productId, productName: i.product.name,
              orderedQty: i.orderedQty, remainingQty: Math.max(0, i.orderedQty - delivered),
            };
          }),
        }))}
        initial={{
          cardNo,
          productId: 0,
          salesOrderId: soId ?? null,
          quantity: 1,
          operator: "",
          machine: "",
          startedAt: toDateInput(new Date()),
          targetDate: toDateInput(addDays(new Date(), 7)),
          notes: "",
        }}
      />
    </div>
  );
}
