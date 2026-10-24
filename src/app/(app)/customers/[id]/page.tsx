import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import PartyForm from "../PartyForm";

export const dynamic = "force-dynamic";

export default async function EditCustomerPage({ params }: { params: { id: string } }) {
  const id = Number(params.id);
  if (!Number.isFinite(id)) notFound();
  const c = await prisma.customer.findUnique({ where: { id } });
  if (!c) notFound();
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Edit Customer</h1>
      <PartyForm kind="customers" party={c} />
    </div>
  );
}
