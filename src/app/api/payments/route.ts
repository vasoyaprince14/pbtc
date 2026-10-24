import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

const schema = z.object({
  type: z.enum(["RECEIVED", "PAID"]),
  paidOn: z.string().min(1),
  amount: z.number().positive(),
  mode: z.string().default("Cash"),
  refNo: z.string().default(""),
  notes: z.string().default(""),
  customerId: z.number().int().positive().nullable().optional(),
  supplierId: z.number().int().positive().nullable().optional(),
});

async function auth() {
  const s = await getSession();
  if (!s.userId) throw new Error("Unauthorized");
}

export async function POST(req: NextRequest) {
  try { await auth(); } catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  const d = parsed.data;
  if (d.type === "RECEIVED" && !d.customerId) return NextResponse.json({ error: "Customer required" }, { status: 400 });
  if (d.type === "PAID" && !d.supplierId) return NextResponse.json({ error: "Supplier required" }, { status: 400 });

  const p = await prisma.payment.create({
    data: {
      type: d.type,
      paidOn: new Date(d.paidOn),
      amount: d.amount,
      mode: d.mode,
      refNo: d.refNo,
      notes: d.notes,
      customerId: d.customerId ?? null,
      supplierId: d.supplierId ?? null,
    },
  });
  return NextResponse.json(p);
}
