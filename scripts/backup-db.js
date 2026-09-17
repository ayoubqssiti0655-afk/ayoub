/**
 * Automatic DB backup before any seed/reset.
 * Keeps the last 10 copies in prisma/backups/.
 */
const fs = require("fs");
const path = require("path");

const src = path.join(__dirname, "..", "prisma", "dev.db");
const backupDir = path.join(__dirname, "..", "prisma", "backups");

try {
  if (!fs.existsSync(src)) {
    console.log("[backup] no dev.db yet — skipping");
    process.exit(0);
  }
  fs.mkdirSync(backupDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const dest = path.join(backupDir, `dev-${stamp}.db`);
  fs.copyFileSync(src, dest);
  console.log(`[backup] saved → prisma/backups/dev-${stamp}.db`);

  // keep only the 10 most recent backups
  const files = fs
    .readdirSync(backupDir)
    .filter((f) => f.endsWith(".db"))
    .sort()
    .reverse();
  for (const old of files.slice(10)) {
    fs.unlinkSync(path.join(backupDir, old));
  }
} catch (e) {
  console.error("[backup] failed (continuing anyway):", e.message);
}
