import { NextRequest, NextResponse } from "next/server";
import { readFileSync, existsSync } from "node:fs";
import { join, basename } from "node:path";
import { requireApiUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const guard = await requireApiUser("owner");
  if (guard.error) return guard.error;

  const url = new URL(req.url);
  const raw = url.searchParams.get("name") ?? "";
  const safe = basename(raw);
  if (!safe.startsWith("pbtc-") || !safe.endsWith(".db")) {
    return NextResponse.json({ error: "Invalid file name" }, { status: 400 });
  }
  const filePath = join(process.cwd(), "backups", safe);
  if (!existsSync(filePath)) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const data = readFileSync(filePath);
  return new NextResponse(data, {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename="${safe}"`,
    },
  });
}
