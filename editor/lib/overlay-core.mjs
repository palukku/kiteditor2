// The white-label overlay: for one app file, returns the re-branded
// content, or null when the app file is used unchanged. Preview and build
// both go through resolveFile, so the preview always equals the build.
//
// Pure (no Node, no DOM): runs in the local server (overlay.mjs) and in the
// browser (ui/src/browser-backend-service.js). File access comes in as io:
//   io.read(rel)   → Promise<Uint8Array | null>   an app file
//   io.exists(rel) → boolean                      does the app file exist
//   io.asset(name) → Promise<Uint8Array | null>   an uploaded project file

import { compileProject, introOf } from "./compile.mjs";

const NOVELS = "assets/json/novels.json";
const IMAGE_PATHS = "assets/json/image-paths.json";
const BACKGROUND = /^assets\/Images\/Background\/(.+)_BG\.png$/;
const FALLBACK_BACKGROUND = "assets/Images/Background/Einstieg_BG.png";
const COLOR = /^#[0-9a-fA-F]{6}$/;
const NOVEL_NAME = /^[A-Za-z0-9_-]+$/;

const backgroundPath = (name) => `assets/Images/Background/${name}_BG.png`;
const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const escapeHtml = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Makes text safe inside a JS string or template literal.
export function escapeForSource(text) {
  return String(text).replace(/[\\"'`$<>&\u0000-\u001f\u2028\u2029]/g, (c) => "\\u" + c.charCodeAt(0).toString(16).padStart(4, "0"));
}

// slots: { image, color, text, content } as defined in slots.mjs
export function createOverlay(slots, io) {
  // The name each project novel has inside the app (file-name-safe ones only).
  function appNames(project) {
    const intro = introOf(project);
    return (project.novels ?? [])
      .map((novel) => ({ novel, name: novel === intro ? "Einstieg" : novel.name }))
      .filter((entry) => NOVEL_NAME.test(entry.name ?? ""));
  }

  // Files that exist only through the overlay (backgrounds of new novels).
  function extraPaths(project) {
    return appNames(project)
      .map(({ name }) => backgroundPath(name))
      .filter((rel) => !io.exists(rel));
  }

  function transformText(project, rel, source) {
    let text = source;
    for (const slot of slots.text) {
      const override = project.texts?.[slot.key];
      if (slot.file !== rel || !override) continue;
      text = text.replaceAll(slot.default, escapeForSource(slot.html ? escapeHtml(override) : override));
    }
    for (const slot of slots.color) {
      const override = project.colors?.[slot.key];
      if (!COLOR.test(override ?? "")) continue;
      text = text.replace(new RegExp(escapeRegExp(slot.default), "gi"), override.toLowerCase());
    }
    if (rel === "index.html") {
      text = text.replace("<head>", `<head>\n    <title>${escapeHtml(String(project.appName ?? ""))}</title>`);
    }
    return text === source ? null : text;
  }

  async function resolveFile(project, rel) {
    if (rel === NOVELS) return JSON.stringify(compileProject(project));

    if (slots.content.some((c) => c.path === rel)) {
      return project.content?.[rel] === undefined ? null : JSON.stringify(project.content[rel]);
    }

    if (rel === IMAGE_PATHS) {
      const extra = extraPaths(project);
      const original = extra.length ? await io.read(rel) : null;
      return original ? JSON.stringify([...JSON.parse(new TextDecoder().decode(original)), ...extra]) : null;
    }

    const slot = slots.image.find((s) => s.path === rel);
    if (slot) return project.images?.[slot.key] ? io.asset(project.images[slot.key]) : null;

    const background = rel.match(BACKGROUND);
    if (background) {
      const entry = appNames(project).find((e) => e.name === background[1]);
      if (!entry) return null;
      const custom = entry.novel.background ? await io.asset(entry.novel.background) : null;
      return custom ?? (io.exists(rel) ? null : io.read(FALLBACK_BACKGROUND));
    }

    if (/\.(js|css|html)$/.test(rel)) {
      const source = await io.read(rel);
      return source ? transformText(project, rel, new TextDecoder().decode(source)) : null;
    }
    return null;
  }

  // Every file of a finished build: rel → content
  async function* buildFiles(project, appFiles) {
    for (const rel of new Set([...appFiles, ...extraPaths(project)])) {
      yield [rel, (await resolveFile(project, rel)) ?? (await io.read(rel))];
    }
  }

  return { resolveFile, extraPaths, buildFiles };
}
