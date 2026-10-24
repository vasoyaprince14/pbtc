import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireApiUser } from "@/lib/auth";

const schema = z.object({
  cardNo: z.string().min(1),
  productId: z.number().int().positive(),
  salesOrderId: z.number().int().positive().nullable().optional(),
  quantity: z.number().positive(),
  operator: z.string().default(""),
  machine: z.string().default(""),
  startedAt: z.string().optional(),
  targetDate: z.string().optional(),
  notes: z.string().default(""),
});

export async function POST(req: NextRequest) {
  const guard = await requireApiUser("staff");
  if (guard.error) return guard.error;

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  const d = parsed.data;

  try {
    const jc = await prisma.$transaction(async (tx) => {
      const created = await tx.jobCard.create({
        data: {
          cardNo: d.cardNo,
          productId: d.productId,
          salesOrderId: d.salesOrderId ?? null,
          quantity: d.quantity,
          operator: d.operator,
          machine: d.machine,
          startedAt: d.startedAt ? new Date(d.startedAt) : null,
          targetDate: d.targetDate ? new Date(d.targetDate) : null,
          notes: d.notes,
          currentStage: "received",
        },
      });
      await tx.jobCardStage.create({
        data: { jobCardId: created.id, stage: "received", note: "Job card created" },
      });
      return created;
    });
    return NextResponse.json(jc);
  } catch (e: any) {
    if (e?.code === "P2002") return NextResponse.json({ error: "Card number already exists" }, { status: 400 });
    return NextResponse.json({ error: e?.message ?? "Failed" }, { status: 500 });
  }
}
