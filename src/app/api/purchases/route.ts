import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { calcLineTax, sumTotals } from "@/lib/gst";

const itemSchema = z.object({
  productId: z.number().int().positive(),
  hsnCode: z.string().default(""),
  quantity: z.number().positive(),
  rate: z.number().min(0),
  discount: z.number().min(0).default(0),
  gstRate: z.number().min(0).max(100),
});

const schema = z.object({
  billNo: z.string().min(1),
  supplierBillNo: z.string().default(""),
  billDate: z.string().min(1),
  supplierId: z.number().int().positive(),
  items: z.array(itemSchema).min(1),
  notes: z.string().default(""),
  paidAmount: z.number().default(0),
  isInterState: z.boolean(),
});

async function auth() {
  const s = await getSession();
  if (!s.userId) throw new Error("Unauthorized");
}

export async function POST(req: NextRequest) {
  try { await auth(); } catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;

  const products = await prisma.product.findMany({ where: { id: { in: data.items.map((i) => i.productId) } } });
  const productMap = new Map(products.map((p) => [p.id, p]));

  const lineTaxes = data.items.map((it) => calcLineTax(it, data.isInterState));
  const totals = sumTotals(lineTaxes);

  try {
    const purchase = await prisma.$transaction(async (tx) => {
      const created = await tx.purchase.create({
        data: {
          billNo: data.billNo,
          supplierBillNo: data.supplierBillNo,
          billDate: new Date(data.billDate),
          supplierId: data.supplierId,
          subTotal: totals.subTotal,
          cgstTotal: totals.cgstTotal,
          sgstTotal: totals.sgstTotal,
          igstTotal: totals.igstTotal,
          roundOff: totals.roundOff,
          grandTotal: totals.grandTotal,
          paidAmount: data.paidAmount,
          notes: data.notes,
          items: {
            create: data.items.map((it, i) => {
              const t = lineTaxes[i];
              const prod = productMap.get(it.productId);
              return {
                productId: it.productId,
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
              };
            }),
          },
        },
      });

      for (const it of data.items) {
        await tx.stockMovement.create({
          data: {
            productId: it.productId,
            type: "IN",
            quantity: Math.abs(it.quantity),
            refType: "PURCHASE",
            refId: created.id,
            refNo: data.billNo,
            costPrice: it.rate,
            movedAt: new Date(data.billDate),
          },
        });
        await tx.product.update({
          where: { id: it.productId },
          data: { purchasePrice: it.rate },
        });
      }
      return created;
    });
    return NextResponse.json(purchase);
  } catch (e: any) {
    if (e?.code === "P2002") return NextResponse.json({ error: "Bill number already exists" }, { status: 400 });
    return NextResponse.json({ error: e?.message ?? "Failed" }, { status: 500 });
  }
}
