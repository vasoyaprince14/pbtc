import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireApiUser } from "@/lib/auth";

const schema = z.object({
  shopName: z.string().min(1),
  gstin: z.string().max(15).default(""),
  stateName: z.string().default(""),
  stateCode: z.string().max(2).default(""),
  address: z.string().default(""),
  city: z.string().default(""),
  pincode: z.string().default(""),
  phone: z.string().default(""),
  email: z.string().default(""),
  invoicePrefix: z.string().default("INV"),
  challanPrefix: z.string().default("DC"),
  bankName: z.string().default(""),
  bankAccount: z.string().default(""),
  bankIfsc: z.string().default(""),
  bankBranch: z.string().default(""),
  termsNote: z.string().default(""),
});

export async function POST(req: NextRequest) {
  const guard = await requireApiUser("owner");
  if (guard.error) return guard.error;

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }
  const updated = await prisma.shopSettings.upsert({
    where: { id: 1 },
    update: parsed.data,
    create: { id: 1, ...parsed.data },
  });
  return NextResponse.json({ ok: true, settings: updated });
}
