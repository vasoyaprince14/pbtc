import { readdirSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";
import { requireOwner } from "@/lib/auth";
import { fmtDate } from "@/lib/format";
import BackupControls from "./BackupControls";
import DangerZone from "./DangerZone";

export const dynamic = "force-dynamic";

function fmtSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export default async function BackupPage() {
  await requireOwner();
  const backupDir = join(process.cwd(), "backups");
  let backups: { name: string; size: number; mtime: Date }[] = [];
  if (existsSync(backupDir)) {
    backups = readdirSync(backupDir)
      .filter((f) => f.startsWith("pbtc-") && f.endsWith(".db"))
      .map((f) => {
        const st = statSync(join(backupDir, f));
        return { name: f, size: st.size, mtime: st.mtime };
      })
      .sort((a, b) => b.mtime.getTime() - a.mtime.getTime());
  }

  const dbStat = existsSync(join(process.cwd(), "prisma", "dev.db"))
    ? statSync(join(process.cwd(), "prisma", "dev.db"))
    : null;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-4">Backup &amp; Restore</h1>

      <div className="card p-5 mb-4">
        <h2 className="font-semibold mb-3">Current Database</h2>
        <div className="text-sm text-gray-700 space-y-1">
          <div>File: <code className="text-xs font-mono">prisma/dev.db</code></div>
          {dbStat && (
            <>
              <div>Size: <span className="font-medium">{fmtSize(dbStat.size)}</span></div>
              <div>Last modified: <span className="font-medium">{fmtDate(dbStat.mtime)} {dbStat.mtime.toLocaleTimeString()}</span></div>
            </>
          )}
        </div>
        <BackupControls />
      </div>

      <div className="card overflow-hidden mb-4">
        <div className="p-3 border-b bg-gray-50 font-semibold">Past Backups ({backups.length})</div>
        <table className="w-full">
          <thead>
            <tr>
              <th className="th">File</th>
              <th className="th">Created</th>
              <th className="th text-right">Size</th>
              <th className="th"></th>
            </tr>
          </thead>
          <tbody>
            {backups.length === 0 && (
              <tr><td className="td text-center text-gray-500 py-6" colSpan={4}>No backups yet — click "Create Backup Now" above</td></tr>
            )}
            {backups.map((b) => (
              <tr key={b.name}>
                <td className="td font-mono text-xs">{b.name}</td>
                <td className="td text-xs">{fmtDate(b.mtime)} {b.mtime.toLocaleTimeString()}</td>
                <td className="td text-right text-xs">{fmtSize(b.size)}</td>
                <td className="td text-right">
                  <a href={`/api/backup/file?name=${encodeURIComponent(b.name)}`} className="text-brand-600 hover:underline text-xs">Download</a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card p-5 text-sm space-y-2">
        <h2 className="font-semibold">Daily Automatic Backup (macOS)</h2>
        <p className="text-gray-700">To auto-backup every day at 8pm, run these commands in Terminal:</p>
        <pre className="bg-gray-100 p-3 rounded text-xs overflow-x-auto">{`# One-time setup: create a launchd job
cat > ~/Library/LaunchAgents/com.pbtc.backup.plist <<'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>com.pbtc.backup</string>
  <key>ProgramArguments</key>
  <array>
    <string>/usr/local/bin/node</string>
    <string>${process.cwd()}/scripts/backup.mjs</string>
  </array>
  <key>StartCalendarInterval</key>
  <dict><key>Hour</key><integer>20</integer><key>Minute</key><integer>0</integer></dict>
</dict>
</plist>
EOF

launchctl load ~/Library/LaunchAgents/com.pbtc.backup.plist`}</pre>
        <p className="text-gray-700 text-xs">Or run <code className="font-mono">node scripts/backup.mjs</code> whenever you want a manual backup — old backups are auto-pruned to the last 30.</p>
      </div>

      <div className="mt-4">
        <DangerZone />
      </div>
    </div>
  );
}
