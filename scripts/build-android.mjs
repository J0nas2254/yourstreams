/**
 * Android-Build für Capacitor:
 * - versteckt app/api während des statischen Exports (statischer Export kann keine API-Routen)
 * - baut mit STATIC_EXPORT=1 nach out-next/
 * - stellt app/api danach wieder her
 * Danach läuft automatisch `postbuild:android` (next build) und stellt den Server-Build (.next) wieder her.
 */
import { execSync } from "node:child_process";
import { existsSync, renameSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const apiDir = join(root, "app", "api");
const backupDir = join(root, ".tmp-api-backup");

try {
  if (existsSync(apiDir)) {
    console.log("[build:android] verstecke app/api für statischen Export …");
    renameSync(apiDir, backupDir);
  }
  console.log("[build:android] next build (STATIC_EXPORT=1) …");
  execSync("npx next build", {
    stdio: "inherit",
    env: { ...process.env, STATIC_EXPORT: "1" },
  });
  console.log("[build:android] fertig → out-next/. Danach: npx cap sync android");
} finally {
  if (existsSync(backupDir) && !existsSync(apiDir)) {
    console.log("[build:android] stelle app/api wieder her …");
    renameSync(backupDir, apiDir);
  }
}
