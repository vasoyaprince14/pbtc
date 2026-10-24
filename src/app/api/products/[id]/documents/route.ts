import { NextRequest, NextResponse } from "next/server";
import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, extname } from "node:path";
import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/db";
import { requireApiUser } from "@/lib/auth";

const MAX_MB = 10;

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requireApiUser("staff");
  if (guard.error) return guard.error;
  const productId = Number(params.id);
  const docs = await prisma.productDocument.findMany({
    where: { productId },
    orderBy: { uploadedAt: "desc" },
  });
  return NextResponse.json(docs);
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requireApiUser("manager");
  if (guard.error) return guard.error;

  const productId = Number(params.id);
  const form = await req.formData();
  const file = form.get("file") as File | null;
  const category = String(form.get("category") ?? "drawing");
  const notes = String(form.get("notes") ?? "");
  if (!file) return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
  if (file.size > MAX_MB * 1024 * 1024) return NextResponse.json({ error: `File too large (max ${MAX_MB}MB)` }, { status: 400 });

  const dir = join(process.cwd(), "uploads", "products", String(productId));
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

  const ext = extname(file.name).toLowerCase().slice(0, 10);
  const safeExt = /^\.[a-z0-9]{1,10}$/.test(ext) ? ext : ".bin";
  const filename = `${Date.now()}-${randomBytes(4).toString("hex")}${safeExt}`;
  const buf = Buffer.from(await file.arrayBuffer());
  writeFileSync(join(dir, filename), buf);

  const doc = await prisma.productDocument.create({
    data: {
      productId,
      category,
      filename,
      originalName: file.name,
      mimeType: file.type || "application/octet-stream",
      sizeBytes: file.size,
      notes,
    },
  });
  return NextResponse.json(doc);
}
