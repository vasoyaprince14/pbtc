import { NextRequest, NextResponse } from "next/server";
import { readFileSync, existsSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { prisma } from "@/lib/db";
import { requireApiUser } from "@/lib/auth";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requireApiUser("staff");
  if (guard.error) return guard.error;

  const id = Number(params.id);
  const doc = await prisma.productDocument.findUnique({ where: { id } });
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const filePath = join(process.cwd(), "uploads", "products", String(doc.productId), doc.filename);
  if (!existsSync(filePath)) return NextResponse.json({ error: "File missing on disk" }, { status: 404 });

  const data = readFileSync(filePath);
  const dispositionName = encodeURIComponent(doc.originalName || doc.filename);
  return new NextResponse(data, {
    headers: {
      "Content-Type": doc.mimeType || "application/octet-stream",
      "Content-Disposition": `inline; filename*=UTF-8''${dispositionName}`,
    },
  });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requireApiUser("manager");
  if (guard.error) return guard.error;

  const id = Number(params.id);
  const doc = await prisma.productDocument.findUnique({ where: { id } });
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const filePath = join(process.cwd(), "uploads", "products", String(doc.productId), doc.filename);
  if (existsSync(filePath)) {
    try { unlinkSync(filePath); } catch { /* ignore */ }
  }
  await prisma.productDocument.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
