import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireApiUser } from "@/lib/auth";
import { calcLineTax, sumTotals } from "@/lib/gst";

const itemSchema = z.object({
  productId: z.number().int().positive(),
  description: z.string().default(""),
  hsnCode: z.string().default(""),
  orderedQty: z.number().positive(),
  rate: z.number().min(0),
  discount: z.number().min(0).default(0),
  gstRate: z.number().min(0).max(100),
  expectedDelivery: z.string().optional(),
});

const schema = z.object({
  soNo: z.string().min(1),
  soDate: z.string().min(1),
  customerId: z.number().int().positive(),
  customerPoNo: z.string().default(""),
  customerPoDate: z.string().optional(),
  expectedDelivery: z.string().optional(),
  items: z.array(itemSchema).min(1),
  paymentTerms: z.string().default(""),
  deliveryTerms: z.string().default(""),
  notes: z.string().default(""),
  isInterState: z.boolean(),
});

export async function GET(req: NextRequest) {
  const guard = await requireApiUser("staff");
  if (guard.error) return guard.error;
  const url = new URL(req.url);
  const customerIdStr = url.searchParams.get("customerId");
  const statusStr = url.searchParams.get("status");
  const where: any = {};
  if (customerIdStr) where.customerId = Number(customerIdStr);
  if (statusStr) where.status = { in: statusStr.split(",") };
  const orders = await prisma.salesOrder.findMany({
    where,
    orderBy: { soDate: "desc" },
    take: 100,
    select: { id: true, soNo: true, soDate: true, status: true, grandTotal: true },
  });
  return NextResponse.json(orders);
}

export async function POST(req: NextRequest) {
  const guard = await requireApiUser("staff");
  if (guard.error) return guard.error;

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  const data = parsed.data;

  const products = await prisma.product.findMany({ where: { id: { in: data.items.map((i) => i.productId) } } });
  const productMap = new Map(products.map((p) => [p.id, p]));

  const lineTaxes = data.items.map((it) => calcLineTax({
    quantity: it.orderedQty, rate: it.rate, discount: it.discount, gstRate: it.gstRate,
  }, data.isInterState));
  const totals = sumTotals(lineTaxes);

  try {
    const so = await prisma.salesOrder.create({
      data: {
        soNo: data.soNo,
        soDate: new Date(data.soDate),
        customerId: data.customerId,
        customerPoNo: data.customerPoNo,
        customerPoDate: data.customerPoDate ? new Date(data.customerPoDate) : null,
        expectedDelivery: data.expectedDelivery ? new Date(data.expectedDelivery) : null,
        isInterState: data.isInterState,
        subTotal: totals.subTotal,
        cgstTotal: totals.cgstTotal,
        sgstTotal: totals.sgstTotal,
        igstTotal: totals.igstTotal,
        grandTotal: totals.grandTotal,
        paymentTerms: data.paymentTerms,
        deliveryTerms: data.deliveryTerms,
        notes: data.notes,
        items: {
          create: data.items.map((it, i) => {
            const t = lineTaxes[i];
            const prod = productMap.get(it.productId);
            return {
              productId: it.productId,
              description: it.description || prod?.name || "",
              hsnCode: it.hsnCode || prod?.hsnCode || "",
              orderedQty: it.orderedQty,
              rate: it.rate,
              discount: it.discount,
              gstRate: it.gstRate,
              cgstAmt: t.cgstAmt,
              sgstAmt: t.sgstAmt,
              igstAmt: t.igstAmt,
              taxable: t.taxable,
              total: t.total,
              expectedDelivery: it.expectedDelivery ? new Date(it.expectedDelivery) : null,
            };
          }),
        },
      },
    });
    return NextResponse.json(so);
  } catch (e: any) {
    if (e?.code === "P2002") return NextResponse.json({ error: "SO number already exists" }, { status: 400 });
    return NextResponse.json({ error: e?.message ?? "Failed" }, { status: 500 });
  }
}
