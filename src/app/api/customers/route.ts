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
  creditDays: z.number().default(0),
  openingBalance: z.number().default(0),
  isActive: z.boolean().default(true),
});

async function auth() {
  const s = await getSession();
  if (!s.userId) throw new Error("Unauthorized");
}

export async function GET(req: NextRequest) {
  try { await auth(); } catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }
  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim() ?? "";
  const customers = await prisma.customer.findMany({
    where: q ? { OR: [{ name: { contains: q } }, { gstin: { contains: q } }] } : {},
    orderBy: { name: "asc" },
    take: 50,
  });
  return NextResponse.json(customers);
}

export async function POST(req: NextRequest) {
  try { await auth(); } catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  const c = await prisma.customer.create({ data: parsed.data });
  return NextResponse.json(c);
}
