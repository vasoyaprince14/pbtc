import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiUser } from "@/lib/auth";

const REQ = ["sku", "name"];

function num(v: string | undefined, def = 0): number {
  const n = Number(v ?? "");
  return Number.isFinite(n) ? n : def;
}

const has = (v: string | undefined) => v !== undefined && v !== "";

export async function POST(req: NextRequest) {
  const guard = await requireApiUser("manager");
  if (guard.error) return guard.error;

  const body = await req.json();
  const rows: Record<string, string>[] = body.rows ?? [];
  // "update" lets an existing SKU be edited instead of rejected.
  const mode: "create" | "update" = body.mode === "update" ? "update" : "create";

  const errors: string[] = [];
  let created = 0;
  let updated = 0;
  // sku -> id, so the client can attach pictures to the rows it just imported.
  const saved: { sku: string; id: number }[] = [];

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const rn = i + 2;
    const missing = REQ.filter((k) => !r[k]);
    if (missing.length) { errors.push(`Row ${rn}: missing ${missing.join(", ")}`); continue; }

    try {
      const existing = await prisma.product.findUnique({ where: { sku: r.sku }, select: { id: true } });

      if (existing) {
        if (mode !== "update") {
          errors.push(`Row ${rn}: SKU "${r.sku}" already exists`);
          continue;
        }
        // Only overwrite columns the CSV actually filled in — otherwise a
        // sparse update row would blank out prices and stock levels.
        const patch: Record<string, unknown> = { name: r.name };
        if (has(r.hsncode)) patch.hsnCode = r.hsncode;
        if (has(r.unit)) patch.unit = r.unit;
        if (has(r.category)) patch.category = r.category;
        if (has(r.gstrate)) patch.gstRate = num(r.gstrate, 18);
        if (has(r.purchaseprice)) patch.purchasePrice = num(r.purchaseprice);
        if (has(r.saleprice)) patch.salePrice = num(r.saleprice);
        if (has(r.rack)) patch.rack = r.rack;
        if (has(r.openingstock)) patch.openingStock = num(r.openingstock);
        if (has(r.minstock)) patch.minStock = num(r.minstock);

        const rec = await prisma.product.update({ where: { id: existing.id }, data: patch, select: { id: true, sku: true } });
        updated++;
        saved.push({ sku: rec.sku, id: rec.id });
        continue;
      }

      const rec = await prisma.product.create({
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
        select: { id: true, sku: true },
      });
      created++;
      saved.push({ sku: rec.sku, id: rec.id });
    } catch (e: any) {
      if (e?.code === "P2002") errors.push(`Row ${rn}: SKU "${r.sku}" already exists`);
      else errors.push(`Row ${rn}: ${e?.message ?? "failed"}`);
    }
  }
  return NextResponse.json({ created, updated, errors, saved });
}
