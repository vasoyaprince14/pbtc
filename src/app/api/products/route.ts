import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

const productSchema = z.object({
  sku: z.string().min(1),
  name: z.string().min(1),
  hsnCode: z.string().default(""),
  unit: z.string().default("PCS"),
  category: z.string().default(""),
  gstRate: z.number().min(0).max(100),
  purchasePrice: z.number().min(0),
  salePrice: z.number().min(0),
  rack: z.string().default(""),
  openingStock: z.number().default(0),
  minStock: z.number().default(0),
  isActive: z.boolean().default(true),
});

async function auth() {
  const s = await getSession();
  if (!s.userId) throw new Error("Unauthorized");
}

export async function GET(req: NextRequest) {
  await auth();
  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim() ?? "";
  const products = await prisma.product.findMany({
    where: q
      ? { OR: [{ name: { contains: q } }, { sku: { contains: q } }, { hsnCode: { contains: q } }] }
      : {},
    orderBy: { name: "asc" },
    take: 50,
  });
  return NextResponse.json(products);
}

export async function POST(req: NextRequest) {
  try {
    await auth();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json();
  const parsed = productSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }
  try {
    const p = await prisma.product.create({ data: parsed.data });
    return NextResponse.json(p);
  } catch (e: any) {
    if (e?.code === "P2002") {
      return NextResponse.json({ error: "SKU already exists" }, { status: 400 });
    }
    return NextResponse.json({ error: e?.message ?? "Failed" }, { status: 500 });
  }
}
