import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireApiUser } from "@/lib/auth";
import { calcLineTax, sumTotals } from "@/lib/gst";

const itemSchema = z.object({
  productId: z.number().int().positive(),
  description: z.string().default(""),
  hsnCode: z.string().default(""),
  quantity: z.number().positive(),
  rate: z.number().min(0),
  discount: z.number().min(0).default(0),
  gstRate: z.number().min(0).max(100),
  deliveryDays: z.number().int().default(0),
});

const schema = z.object({
  quotationNo: z.string().min(1),
  quotationDate: z.string().min(1),
  validUntil: z.string().optional(),
  customerId: z.number().int().positive(),
  items: z.array(itemSchema).min(1),
  paymentTerms: z.string().default(""),
  deliveryTerms: z.string().default(""),
  notes: z.string().default(""),
  status: z.enum(["draft", "sent", "accepted", "rejected", "expired", "converted"]).default("draft"),
  isInterState: z.boolean(),
});

export async function POST(req: NextRequest) {
  const guard = await requireApiUser("staff");
  if (guard.error) return guard.error;

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  const data = parsed.data;

  const products = await prisma.product.findMany({ where: { id: { in: data.items.map((i) => i.productId) } } });
  const productMap = new Map(products.map((p) => [p.id, p]));

  const lineTaxes = data.items.map((it) => calcLineTax(it, data.isInterState));
  const totals = sumTotals(lineTaxes);

  try {
    const q = await prisma.quotation.create({
      data: {
        quotationNo: data.quotationNo,
        quotationDate: new Date(data.quotationDate),
        validUntil: data.validUntil ? new Date(data.validUntil) : null,
        customerId: data.customerId,
        status: data.status,
        isInterState: data.isInterState,
        subTotal: totals.subTotal,
        cgstTotal: totals.cgstTotal,
        sgstTotal: totals.sgstTotal,
        igstTotal: totals.igstTotal,
        roundOff: totals.roundOff,
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
              quantity: it.quantity,
              rate: it.rate,
              discount: it.discount,
              gstRate: it.gstRate,
              cgstAmt: t.cgstAmt,
              sgstAmt: t.sgstAmt,
              igstAmt: t.igstAmt,
              taxable: t.taxable,
              total: t.total,
              deliveryDays: it.deliveryDays,
            };
          }),
        },
      },
    });
    return NextResponse.json(q);
  } catch (e: any) {
    if (e?.code === "P2002") return NextResponse.json({ error: "Quotation number already exists" }, { status: 400 });
    return NextResponse.json({ error: e?.message ?? "Failed" }, { status: 500 });
  }
}
