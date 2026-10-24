import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiUser } from "@/lib/auth";
import { stateCodeFromGstin, stateNameFromCode } from "@/lib/states";

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
    if (!r.name) { errors.push(`Row ${rn}: missing name`); continue; }
    try {
      const gstin = (r.gstin ?? "").toUpperCase();
      const codeFromGstin = stateCodeFromGstin(gstin);
      const stateCode = r.statecode || codeFromGstin || "";
      const stateName = r.statename || stateNameFromCode(stateCode);
      await prisma.supplier.create({
        data: {
          name: r.name,
          gstin,
          stateCode,
          stateName,
          address: r.address ?? "",
          city: r.city ?? "",
          pincode: r.pincode ?? "",
          phone: r.phone ?? "",
          email: r.email ?? "",
          openingBalance: num(r.openingbalance),
        },
      });
      created++;
    } catch (e: any) {
      errors.push(`Row ${rn}: ${e?.message ?? "failed"}`);
    }
  }
  return NextResponse.json({ created, errors });
}
