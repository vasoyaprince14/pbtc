import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireOwner } from "@/lib/auth";
import UserForm from "../UserForm";

export const dynamic = "force-dynamic";

export default async function EditUserPage({ params }: { params: { id: string } }) {
  await requireOwner();
  const id = Number(params.id);
  if (!Number.isFinite(id)) notFound();
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) notFound();
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Edit User</h1>
      <UserForm user={user} />
    </div>
  );
}
