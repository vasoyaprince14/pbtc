import { prisma } from "@/lib/db";
import { toDateInput } from "@/lib/format";
import PaymentForm from "./PaymentForm";

export const dynamic = "force-dynamic";

export default async function NewPaymentPage() {
  const [customers, suppliers] = await Promise.all([
    prisma.customer.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    prisma.supplier.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
  ]);
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Record Payment</h1>
      <PaymentForm customers={customers} suppliers={suppliers} defaultDate={toDateInput(new Date())} />
    </div>
  );
}
