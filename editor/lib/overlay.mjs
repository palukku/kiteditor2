// The white-label overlay: for one app file, returns the re-branded
// content, or null when the app file is used unchanged. Preview and build
// both go through resolveFile, so the preview always equals the build.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { compileProject, introOf } from "./compile.mjs";
import { APP_DIR, IMAGE_SLOTS, COLOR_SLOTS, CONTENT_FILES, textSlots } from "./slots.mjs";
import { safeJoin } from "./serve-static.mjs";

const NOVELS = "assets/json/novels.json";
const IMAGE_PATHS = "assets/json/image-paths.json";
const BACKGROUND = /^assets\/Images\/Background\/(.+)_BG\.png$/;
const FALLBACK_BACKGROUND = "assets/Images/Background/Einstieg_BG.png";
const COLOR = /^#[0-9a-fA-F]{6}$/;

const appFile = (rel) => path.join(APP_DIR, rel);
const backgroundPath = (name) => `assets/Images/Background/${name}_BG.png`;
const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const escapeHtml = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Makes text safe inside a JS string or template literal.
export function escapeForSource(text) {
  return String(text).replace(/[\\"'`$<>&\u0000-\u001f\u2028\u2029]/g, (c) => "\\u" + c.charCodeAt(0).toString(16).padStart(4, "0"));
}

function readAsset(projectDir, name) {
  const file = name && safeJoin(path.join(projectDir, "assets"), name);
  try {
    return file ? fs.readFileSync(file) : null;
  } catch {
    return null;
  }
}

// The name each project novel has inside the app.
function appNames(project) {
  const intro = introOf(project);
  return (project.novels ?? []).map((novel) => ({ novel, name: novel === intro ? "Einstieg" : novel.name }));
}

// Files that exist only through the overlay (backgrounds of new novels).
export function extraPaths(project) {
  return appNames(project)
    .map(({ name }) => backgroundPath(name))
    .filter((rel) => safeJoin(APP_DIR, rel) && !fs.existsSync(appFile(rel)));
}

function transformText(project, rel, source) {
  let text = source;
  for (const slot of textSlots()) {
    const override = project.texts?.[slot.key];
    if (slot.file !== rel || !override) continue;
    text = text.replaceAll(slot.default, escapeForSource(slot.html ? escapeHtml(override) : override));
  }
  for (const slot of COLOR_SLOTS) {
    const override = project.colors?.[slot.key];
    if (!COLOR.test(override ?? "")) continue;
    text = text.replace(new RegExp(escapeRegExp(slot.default), "gi"), override.toLowerCase());
  }
  if (rel === "index.html") {
    text = text.replace("<head>", `<head>\n    <title>${escapeHtml(String(project.appName ?? ""))}</title>`);
  }
  return text === source ? null : text;
}

export function resolveFile(project, projectDir, rel) {
  if (rel === NOVELS) return JSON.stringify(compileProject(project));

  if (CONTENT_FILES.some((c) => c.path === rel)) {
    return project.content?.[rel] === undefined ? null : JSON.stringify(project.content[rel]);
  }

  if (rel === IMAGE_PATHS) {
    const extra = extraPaths(project);
    return extra.length ? JSON.stringify([...JSON.parse(fs.readFileSync(appFile(rel), "utf8")), ...extra]) : null;
  }

  const slot = IMAGE_SLOTS.find((s) => s.path === rel);
  if (slot) return readAsset(projectDir, project.images?.[slot.key]);

  const background = rel.match(BACKGROUND);
  if (background) {
    const entry = appNames(project).find((e) => e.name === background[1]);
    if (!entry) return null;
    return readAsset(projectDir, entry.novel.background) ?? (fs.existsSync(appFile(rel)) ? null : fs.readFileSync(appFile(FALLBACK_BACKGROUND)));
  }

  if (/\.(js|css|html)$/.test(rel)) {
    try {
      return transformText(project, rel, fs.readFileSync(appFile(rel), "utf8"));
    } catch {
      return null;
    }
  }
  return null;
}

export function build(project, projectDir, outDir) {
  fs.rmSync(outDir, { recursive: true, force: true });
  const appFiles = fs
    .readdirSync(APP_DIR, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => path.relative(APP_DIR, path.join(entry.parentPath, entry.name)).split(path.sep).join("/"));
  const rels = [...new Set([...appFiles, ...extraPaths(project)])];

  for (const rel of rels) {
    const target = path.join(outDir, rel);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    const content = resolveFile(project, projectDir, rel);
    if (content == null) fs.copyFileSync(appFile(rel), target);
    else fs.writeFileSync(target, content);
  }
  fs.copyFileSync(fileURLToPath(new URL("./serve-static.mjs", import.meta.url)), path.join(outDir, "serve.mjs"));
  return { files: rels.length + 1 };
}
