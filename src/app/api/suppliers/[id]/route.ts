import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

const schema = z.object({
  name: z.string().min(1),
  gstin: z.string().default(""),
  stateName: z.string().default(""),
  stateCode: z.string().default(""),
  address: z.string().default(""),
  city: z.string().default(""),
  pincode: z.string().default(""),
  phone: z.string().default(""),
  email: z.string().default(""),
  openingBalance: z.number().default(0),
  isActive: z.boolean().default(true),
});

async function auth() {
  const s = await getSession();
  if (!s.userId) throw new Error("Unauthorized");
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try { await auth(); } catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }
  const id = Number(params.id);
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  const c = await prisma.supplier.update({ where: { id }, data: parsed.data });
  return NextResponse.json(c);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try { await auth(); } catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }
  const id = Number(params.id);
  await prisma.supplier.update({ where: { id }, data: { isActive: false } });
  return NextResponse.json({ ok: true });
}
