import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

const updateSchema = z.object({
  sku: z.string().min(1),
  name: z.string().min(1),
  hsnCode: z.string().default(""),
  unit: z.string().default("PCS"),
  category: z.string().default(""),
  gstRate: z.number().min(0).max(100),
  purchasePrice: z.number().min(0),
  salePrice: z.number().min(0),
  rack: z.string().default(""),
  minStock: z.number().default(0),
  isActive: z.boolean().default(true),
});

async function auth() {
  const s = await getSession();
  if (!s.userId) throw new Error("Unauthorized");
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await auth();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const id = Number(params.id);
  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  try {
    const p = await prisma.product.update({ where: { id }, data: parsed.data });
    return NextResponse.json(p);
  } catch (e: any) {
    if (e?.code === "P2002") return NextResponse.json({ error: "SKU already exists" }, { status: 400 });
    return NextResponse.json({ error: e?.message ?? "Failed" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await auth();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const id = Number(params.id);
  await prisma.product.update({ where: { id }, data: { isActive: false } });
  return NextResponse.json({ ok: true });
}
