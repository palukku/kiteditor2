// Node side of the white-label overlay: reads app/ and the project folder
// from disk. The logic itself is in overlay-core.mjs.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createOverlay, escapeForSource } from "./overlay-core.mjs";
import { APP_DIR, IMAGE_SLOTS, COLOR_SLOTS, CONTENT_FILES, textSlots, appFiles } from "./slots.mjs";
import { safeJoin } from "./serve-static.mjs";

export { escapeForSource };

function readOrNull(file) {
  try {
    return file ? fs.readFileSync(file) : null;
  } catch {
    return null;
  }
}

function overlayFor(projectDir) {
  const slots = { image: IMAGE_SLOTS, color: COLOR_SLOTS, text: textSlots(), content: CONTENT_FILES };
  return createOverlay(slots, {
    read: async (rel) => readOrNull(safeJoin(APP_DIR, rel)),
    exists: (rel) => fs.existsSync(path.join(APP_DIR, rel)),
    asset: async (name) => readOrNull(safeJoin(path.join(projectDir, "assets"), name)),
  });
}

export const resolveFile = (project, projectDir, rel) => overlayFor(projectDir).resolveFile(project, rel);

export const extraPaths = (project) => overlayFor("").extraPaths(project);

export async function build(project, projectDir, outDir) {
  fs.rmSync(outDir, { recursive: true, force: true });
  let files = 0;
  for await (const [rel, content] of overlayFor(projectDir).buildFiles(project, appFiles())) {
    const target = path.join(outDir, rel);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, content);
    files++;
  }
  fs.copyFileSync(fileURLToPath(new URL("./serve-static.mjs", import.meta.url)), path.join(outDir, "serve.mjs"));
  return { files: files + 1 };
}
