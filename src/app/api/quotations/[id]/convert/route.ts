import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiUser } from "@/lib/auth";
import { nextSalesOrderNo } from "@/lib/seq";
import { addDays } from "date-fns";

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requireApiUser("staff");
  if (guard.error) return guard.error;

  const id = Number(params.id);
  const q = await prisma.quotation.findUnique({
    where: { id },
    include: { items: true },
  });
  if (!q) return NextResponse.json({ error: "Quotation not found" }, { status: 404 });
  if (q.convertedSalesOrderId) {
    return NextResponse.json({ id: q.convertedSalesOrderId, alreadyConverted: true });
  }

  const soNo = await nextSalesOrderNo();
  const maxDelivery = Math.max(0, ...q.items.map((i) => i.deliveryDays ?? 0));

  const so = await prisma.$transaction(async (tx) => {
    const created = await tx.salesOrder.create({
      data: {
        soNo,
        soDate: new Date(),
        customerId: q.customerId,
        isInterState: q.isInterState,
        subTotal: q.subTotal,
        cgstTotal: q.cgstTotal,
        sgstTotal: q.sgstTotal,
        igstTotal: q.igstTotal,
        grandTotal: q.grandTotal,
        expectedDelivery: maxDelivery > 0 ? addDays(new Date(), maxDelivery) : null,
        paymentTerms: q.paymentTerms,
        deliveryTerms: q.deliveryTerms,
        notes: q.notes,
        fromQuotationId: q.id,
        items: {
          create: q.items.map((it) => ({
            productId: it.productId,
            description: it.description,
            hsnCode: it.hsnCode,
            orderedQty: it.quantity,
            rate: it.rate,
            discount: it.discount,
            gstRate: it.gstRate,
            cgstAmt: it.cgstAmt,
            sgstAmt: it.sgstAmt,
            igstAmt: it.igstAmt,
            taxable: it.taxable,
            total: it.total,
            expectedDelivery: it.deliveryDays ? addDays(new Date(), it.deliveryDays) : null,
          })),
        },
      },
    });
    await tx.quotation.update({
      where: { id: q.id },
      data: { status: "converted", convertedSalesOrderId: created.id },
    });
    return created;
  });

  return NextResponse.json({ id: so.id, soNo: so.soNo });
}
