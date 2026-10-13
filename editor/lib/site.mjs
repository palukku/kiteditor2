// Writes the browser-only editor: a static folder that runs on any static
// host (GitHub Pages) without the Node server. The browser then does what
// server.mjs does locally (see ui/src/browser-backend-service.js).

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { APP_DIR, appFiles, loadMeta } from "./slots.mjs";

const EDITOR_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
// Modules the browser backend imports; all free of Node imports except serve-static (shipped inside built zips)
const SHARED_LIBS = ["compile.mjs", "overlay-core.mjs", "zip.mjs", "serve-static.mjs"];

export function buildSite(outDir) {
  fs.rmSync(outDir, { recursive: true, force: true });
  fs.cpSync(path.join(EDITOR_DIR, "ui"), outDir, { recursive: true });
  fs.cpSync(APP_DIR, path.join(outDir, "app"), { recursive: true });
  fs.mkdirSync(path.join(outDir, "lib"));
  for (const lib of SHARED_LIBS) fs.copyFileSync(path.join(EDITOR_DIR, "lib", lib), path.join(outDir, "lib", lib));
  fs.copyFileSync(path.join(EDITOR_DIR, "default-project.json"), path.join(outDir, "default-project.json"));
  fs.writeFileSync(path.join(outDir, "meta.json"), JSON.stringify({ ...loadMeta(), appFiles: appFiles() }));
  return { files: fs.readdirSync(outDir, { recursive: true, withFileTypes: true }).filter((e) => e.isFile()).length };
}
