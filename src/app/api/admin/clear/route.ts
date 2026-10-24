import { NextRequest, NextResponse } from "next/server";
import { rmSync, existsSync } from "node:fs";
import { join } from "node:path";
import { prisma } from "@/lib/db";
import { requireApiUser } from "@/lib/auth";

/**
 * Permanently deletes all business data — products, parties, and every
 * transaction. Shop settings and user logins are deliberately kept so the
 * owner is not locked out of the app afterwards.
 *
 * Owner role only, and the caller must send { confirm: "CLEAR" } so a stray
 * POST can never wipe the database.
 */
export async function POST(req: NextRequest) {
  const guard = await requireApiUser("owner");
  if (guard.error) return guard.error;

  const body = await req.json().catch(() => ({}));
  if (body?.confirm !== "CLEAR") {
    return NextResponse.json({ error: 'Confirmation failed — expected { confirm: "CLEAR" }' }, { status: 400 });
  }

  // Children before parents — SQLite enforces the foreign keys.
  await prisma.$transaction([
    prisma.jobCardStage.deleteMany(),
    prisma.jobCard.deleteMany(),
    prisma.saleItem.deleteMany(),
    prisma.sale.deleteMany(),
    prisma.salesOrderItem.deleteMany(),
    prisma.salesOrder.deleteMany(),
    prisma.quotationItem.deleteMany(),
    prisma.quotation.deleteMany(),
    prisma.purchaseItem.deleteMany(),
    prisma.purchase.deleteMany(),
    prisma.challanItem.deleteMany(),
    prisma.challan.deleteMany(),
    prisma.payment.deleteMany(),
    prisma.stockMovement.deleteMany(),
    prisma.productDocument.deleteMany(),
    prisma.product.deleteMany(),
    prisma.customer.deleteMany(),
    prisma.supplier.deleteMany(),
  ]);

  // Drop the uploaded files too, otherwise they linger with no DB row.
  const uploadsDir = join(process.cwd(), "uploads", "products");
  if (existsSync(uploadsDir)) {
    try { rmSync(uploadsDir, { recursive: true, force: true }); } catch { /* ignore */ }
  }

  return NextResponse.json({ ok: true, message: "All business data cleared. Shop settings and logins kept." });
}
