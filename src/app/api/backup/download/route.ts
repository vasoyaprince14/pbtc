import { NextResponse } from "next/server";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { requireApiUser } from "@/lib/auth";

export async function GET() {
  const guard = await requireApiUser("owner");
  if (guard.error) return guard.error;

  const dbPath = join(process.cwd(), "prisma", "dev.db");
  if (!existsSync(dbPath)) return NextResponse.json({ error: "Database not found" }, { status: 404 });

  const data = readFileSync(dbPath);
  const now = new Date();
  const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}`;
  return new NextResponse(data, {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename="pbtc-live-${stamp}.db"`,
    },
  });
}
