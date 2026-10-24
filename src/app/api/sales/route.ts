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
  invoiceNo: z.string().min(1),
  invoiceDate: z.string().min(1),
  customerId: z.number().int().positive(),
  items: z.array(itemSchema).min(1),
  discount: z.number().default(0),
  vehicleNo: z.string().default(""),
  transporter: z.string().default(""),
  transporterGstin: z.string().default(""),
  distanceKm: z.number().nullable().optional(),
  ewayBillNo: z.string().default(""),
  dispatchAddress: z.string().default(""),
  salesOrderId: z.number().int().positive().nullable().optional(),
  notes: z.string().default(""),
  paidAmount: z.number().default(0),
  isInterState: z.boolean(),
  itemSalesOrderItemIds: z.array(z.number().int().positive().nullable()).optional(),
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

  const productIds = data.items.map((i) => i.productId);
  const products = await prisma.product.findMany({ where: { id: { in: productIds } } });
  const productMap = new Map(products.map((p) => [p.id, p]));

  const lineTaxes = data.items.map((it) => calcLineTax(it, data.isInterState));
  const totals = sumTotals(lineTaxes);

  try {
    const sale = await prisma.$transaction(async (tx) => {
      const created = await tx.sale.create({
        data: {
          invoiceNo: data.invoiceNo,
          invoiceDate: new Date(data.invoiceDate),
          customerId: data.customerId,
          salesOrderId: data.salesOrderId ?? null,
          isInterState: data.isInterState,
          subTotal: totals.subTotal,
          discount: data.discount,
          cgstTotal: totals.cgstTotal,
          sgstTotal: totals.sgstTotal,
          igstTotal: totals.igstTotal,
          roundOff: totals.roundOff,
          grandTotal: totals.grandTotal,
          paidAmount: data.paidAmount,
          vehicleNo: data.vehicleNo,
          transporter: data.transporter,
          transporterGstin: data.transporterGstin,
          distanceKm: data.distanceKm ?? null,
          ewayBillNo: data.ewayBillNo,
          dispatchAddress: data.dispatchAddress,
          notes: data.notes,
          items: {
            create: data.items.map((it, i) => {
              const t = lineTaxes[i];
              const prod = productMap.get(it.productId);
              const soItemId = data.itemSalesOrderItemIds?.[i] ?? null;
              return {
                productId: it.productId,
                salesOrderItemId: soItemId,
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
                costPrice: prod?.purchasePrice ?? 0,
              };
            }),
          },
        },
      });

      for (const it of data.items) {
        await tx.stockMovement.create({
          data: {
            productId: it.productId,
            type: "OUT",
            quantity: -Math.abs(it.quantity),
            refType: "SALE",
            refId: created.id,
            refNo: data.invoiceNo,
            costPrice: productMap.get(it.productId)?.purchasePrice ?? 0,
            movedAt: new Date(data.invoiceDate),
          },
        });
      }

      if (data.salesOrderId) {
        const so = await tx.salesOrder.findUnique({
          where: { id: data.salesOrderId },
          include: { items: { include: { saleItems: true } } },
        });
        if (so) {
          const allDone = so.items.every((soi) => {
            const shipped = soi.saleItems.reduce((a, s) => a + s.quantity, 0);
            return shipped >= soi.orderedQty - 0.0001;
          });
          if (allDone) {
            await tx.salesOrder.update({ where: { id: so.id }, data: { status: "closed" } });
          } else if (so.status === "open") {
            await tx.salesOrder.update({ where: { id: so.id }, data: { status: "partial" } });
          }
        }
      }

      return created;
    });
    return NextResponse.json(sale);
  } catch (e: any) {
    if (e?.code === "P2002") return NextResponse.json({ error: "Invoice number already exists" }, { status: 400 });
    return NextResponse.json({ error: e?.message ?? "Failed" }, { status: 500 });
  }
}
