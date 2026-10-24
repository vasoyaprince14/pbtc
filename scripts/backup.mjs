#!/usr/bin/env node
// Copies prisma/dev.db to backups/pbtc-YYYY-MM-DD-HHmm.db
// Run manually: `node scripts/backup.mjs`
// Or via cron / launchd for daily automation.

import { copyFileSync, existsSync, mkdirSync, readdirSync, statSync, unlinkSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, "..");
const dbPath = join(projectRoot, "prisma", "dev.db");
const backupDir = join(projectRoot, "backups");

if (!existsSync(dbPath)) {
  console.error(`No database file at ${dbPath}`);
  process.exit(1);
}
if (!existsSync(backupDir)) mkdirSync(backupDir, { recursive: true });

const now = new Date();
const stamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}-${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}`;
const target = join(backupDir, `pbtc-${stamp}.db`);
copyFileSync(dbPath, target);
console.log(`Backup saved: ${target}`);

// Keep only last 30 backups
const files = readdirSync(backupDir)
  .filter((f) => f.startsWith("pbtc-") && f.endsWith(".db"))
  .map((f) => ({ f, t: statSync(join(backupDir, f)).mtimeMs }))
  .sort((a, b) => b.t - a.t);

const KEEP = 30;
for (const { f } of files.slice(KEEP)) {
  unlinkSync(join(backupDir, f));
  console.log(`Deleted old backup: ${f}`);
}
