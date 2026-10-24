import { NextResponse } from "next/server";
import { copyFileSync, existsSync, mkdirSync, readdirSync, statSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { requireApiUser } from "@/lib/auth";

export async function POST() {
  const guard = await requireApiUser("owner");
  if (guard.error) return guard.error;

  const cwd = process.cwd();
  const dbPath = join(cwd, "prisma", "dev.db");
  const backupDir = join(cwd, "backups");

  if (!existsSync(dbPath)) return NextResponse.json({ error: "Database file not found" }, { status: 500 });
  if (!existsSync(backupDir)) mkdirSync(backupDir, { recursive: true });

  const now = new Date();
  const stamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}-${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}`;
  const name = `pbtc-${stamp}.db`;
  copyFileSync(dbPath, join(backupDir, name));

  const files = readdirSync(backupDir)
    .filter((f) => f.startsWith("pbtc-") && f.endsWith(".db"))
    .map((f) => ({ f, t: statSync(join(backupDir, f)).mtimeMs }))
    .sort((a, b) => b.t - a.t);
  for (const { f } of files.slice(30)) unlinkSync(join(backupDir, f));

  return NextResponse.json({ ok: true, name });
}
