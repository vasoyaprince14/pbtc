import { prisma } from "@/lib/db";
import { nextChallanNo } from "@/lib/seq";
import { toDateInput } from "@/lib/format";
import ChallanForm from "../ChallanForm";

export const dynamic = "force-dynamic";

export default async function NewChallanPage() {
  const [customers, products, challanNo] = await Promise.all([
    prisma.customer.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    prisma.product.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    nextChallanNo(),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">New Delivery Challan</h1>
      <ChallanForm
        customers={customers}
        products={products}
        initial={{
          challanNo,
          challanDate: toDateInput(new Date()),
          customerId: 0,
          purpose: "Job Work",
          vehicleNo: "",
          transporter: "",
          notes: "",
          items: [],
        }}
      />
    </div>
  );
}
