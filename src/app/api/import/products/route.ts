import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiUser } from "@/lib/auth";

const REQ = ["sku", "name"];

function num(v: string | undefined, def = 0): number {
  const n = Number(v ?? "");
  return Number.isFinite(n) ? n : def;
}

export async function POST(req: NextRequest) {
  const guard = await requireApiUser("manager");
  if (guard.error) return guard.error;

  const body = await req.json();
  const rows: Record<string, string>[] = body.rows ?? [];
  const errors: string[] = [];
  let created = 0;

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const rn = i + 2;
    const missing = REQ.filter((k) => !r[k]);
    if (missing.length) { errors.push(`Row ${rn}: missing ${missing.join(", ")}`); continue; }
    try {
      await prisma.product.create({
        data: {
          sku: r.sku,
          name: r.name,
          hsnCode: r.hsncode ?? "",
          unit: r.unit || "PCS",
          category: r.category ?? "",
          gstRate: num(r.gstrate, 18),
          purchasePrice: num(r.purchaseprice),
          salePrice: num(r.saleprice),
          rack: r.rack ?? "",
          openingStock: num(r.openingstock),
          minStock: num(r.minstock),
        },
      });
      created++;
    } catch (e: any) {
      if (e?.code === "P2002") errors.push(`Row ${rn}: SKU "${r.sku}" already exists`);
      else errors.push(`Row ${rn}: ${e?.message ?? "failed"}`);
    }
  }
  return NextResponse.json({ created, errors });
}
