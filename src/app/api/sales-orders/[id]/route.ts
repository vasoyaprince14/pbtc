import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireApiUser } from "@/lib/auth";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requireApiUser("staff");
  if (guard.error) return guard.error;
  const id = Number(params.id);
  const so = await prisma.salesOrder.findUnique({
    where: { id },
    include: {
      customer: true,
      items: { include: { product: true, saleItems: true } },
      sales: { orderBy: { invoiceDate: "asc" }, include: { customer: true } },
    },
  });
  if (!so) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const withProgress = {
    ...so,
    items: so.items.map((i) => {
      const delivered = i.saleItems.reduce((a, s) => a + s.quantity, 0);
      return {
        ...i,
        deliveredQty: delivered,
        remainingQty: Math.max(0, i.orderedQty - delivered),
      };
    }),
  };
  return NextResponse.json(withProgress);
}

const patchSchema = z.object({
  status: z.enum(["open", "partial", "closed", "cancelled"]).optional(),
  notes: z.string().optional(),
  expectedDelivery: z.string().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requireApiUser("manager");
  if (guard.error) return guard.error;
  const id = Number(params.id);
  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  const so = await prisma.salesOrder.update({
    where: { id },
    data: {
      ...parsed.data,
      expectedDelivery: parsed.data.expectedDelivery ? new Date(parsed.data.expectedDelivery) : undefined,
    },
  });
  return NextResponse.json(so);
}
