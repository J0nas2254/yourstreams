// Windows-kompatibler Wrapper: baut den statischen Export für Capacitor.
// API-Routen (app/api) sind serverseitig und können nicht statisch
// exportiert werden (Export landet per distDir in out-next/). Sie werden
// für den Export-Build kurzzeitig beiseite gelegt und danach wiederhergestellt.
// WICHTIG: Der Export-Build schreibt Build-Metadaten (BUILD_ID,
// required-server-files.json, export-marker.json) auch nach .next und würde
// damit `next start` vergiften (API-Routen liefern dann 500er/Redirects).
// Diese Dateien werden deshalb vorher gesichert und danach wiederhergestellt.
import { spawn } from "node:child_process";
import { renameSync, existsSync, copyFileSync, rmSync } from "node:fs";

const API_DIR = "app/api";
const HIDDEN = "app/__api_server_hidden";

const META_FILES = [
  ".next/BUILD_ID",
  ".next/required-server-files.json",
  ".next/export-marker.json"
];
const BACKUP_SUFFIX = ".server-build-backup";

function backup() {
  for (const f of META_FILES) {
    if (existsSync(f)) copyFileSync(f, f + BACKUP_SUFFIX);
  }
}

function restore() {
  for (const f of META_FILES) {
    const bak = f + BACKUP_SUFFIX;
    if (existsSync(bak)) {
      copyFileSync(bak, f);
      rmSync(bak);
    } else if (f.endsWith("export-marker.json") && existsSync(f)) {
      // Vom Export angelegt, vorher nicht vorhanden -> entfernen
      rmSync(f);
    }
  }
}

let moved = false;
if (existsSync(API_DIR)) {
  renameSync(API_DIR, HIDDEN);
  moved = true;
}
backup();

const child = spawn("npx next build", {
  stdio: "inherit",
  shell: true,
  env: { ...process.env, CAPACITOR_BUILD: "1" }
});

function done(code) {
  if (moved && existsSync(HIDDEN)) renameSync(HIDDEN, API_DIR);
  restore();
  process.exit(code ?? 1);
}
child.on("exit", done);
child.on("error", () => done(1));
