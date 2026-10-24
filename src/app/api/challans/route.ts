import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

const itemSchema = z.object({
  productId: z.number().int().positive(),
  quantity: z.number().positive(),
  remarks: z.string().default(""),
});

const schema = z.object({
  challanNo: z.string().min(1),
  challanDate: z.string().min(1),
  customerId: z.number().int().positive(),
  purpose: z.string().default("Job Work"),
  vehicleNo: z.string().default(""),
  transporter: z.string().default(""),
  notes: z.string().default(""),
  items: z.array(itemSchema).min(1),
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
  const data = parsed.data;

  try {
    const challan = await prisma.challan.create({
      data: {
        challanNo: data.challanNo,
        challanDate: new Date(data.challanDate),
        customerId: data.customerId,
        purpose: data.purpose,
        vehicleNo: data.vehicleNo,
        transporter: data.transporter,
        notes: data.notes,
        items: {
          create: data.items.map((it) => ({
            productId: it.productId,
            quantity: it.quantity,
            remarks: it.remarks,
          })),
        },
      },
    });
    return NextResponse.json(challan);
  } catch (e: any) {
    if (e?.code === "P2002") return NextResponse.json({ error: "Challan number already exists" }, { status: 400 });
    return NextResponse.json({ error: e?.message ?? "Failed" }, { status: 500 });
  }
}
