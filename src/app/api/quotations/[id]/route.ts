import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireApiUser } from "@/lib/auth";

const schema = z.object({
  status: z.enum(["draft", "sent", "accepted", "rejected", "expired", "converted"]).optional(),
  notes: z.string().optional(),
  paymentTerms: z.string().optional(),
  deliveryTerms: z.string().optional(),
  validUntil: z.string().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requireApiUser("staff");
  if (guard.error) return guard.error;
  const id = Number(params.id);
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  const q = await prisma.quotation.update({
    where: { id },
    data: {
      ...parsed.data,
      validUntil: parsed.data.validUntil ? new Date(parsed.data.validUntil) : undefined,
    },
  });
  return NextResponse.json(q);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requireApiUser("manager");
  if (guard.error) return guard.error;
  const id = Number(params.id);
  await prisma.quotation.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
