import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { importKite, NOVELS_JSON } from "../lib/import-kite.mjs";
import { APP_DIR, IMAGE_SLOTS, COLOR_SLOTS, CONTENT_FILES, textSlots } from "../lib/slots.mjs";
import { resolveFile, extraPaths, build, escapeForSource } from "../lib/overlay.mjs";
import { safeJoin } from "../lib/serve-static.mjs";
import { assertWalkEquivalent } from "./helpers.mjs";

const kite = JSON.parse(fs.readFileSync(NOVELS_JSON, "utf8"));
const fresh = () => importKite(kite);
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), "kiteditor-"));
const app = (rel) => fs.readFileSync(path.join(APP_DIR, rel));
const START = "src/scenes/start-scene/start-scene.js";

test("every text slot default exists in its file", async () => {
  const slots = textSlots();
  for (const key of ["start.button", "consent.tos", "consent.privacy", "links.title", "archive.title", "bookmarks.title", "knowledge.title", "knowledge.intro", "feedback.disclaimer", "feedback.loading", "feedback.error"]) {
    assert.ok(slots.some((s) => s.key === key), `slot ${key} is missing`);
  }
  for (const slot of slots) {
    assert.ok(slot.default.length > 3, slot.key);
    assert.ok(app(slot.file).toString().includes(slot.default), slot.key);
  }
  assert.equal(new Set(slots.map((s) => s.key)).size, slots.length);
});

test("every image slot path and content file exists in app/", async () => {
  for (const slot of IMAGE_SLOTS) assert.ok(fs.existsSync(path.join(APP_DIR, slot.path)), slot.path);
  for (const file of CONTENT_FILES) assert.ok(fs.existsSync(path.join(APP_DIR, file.path)), file.path);
});

test("every color slot default occurs in the app", async () => {
  const css = app("tailwind.css").toString().toLowerCase();
  for (const slot of COLOR_SLOTS) assert.ok(css.includes(slot.default), slot.key);
});

test("unchanged project: novels are equivalent, other files untouched", async () => {
  const dir = tmp();
  const compiled = JSON.parse(await resolveFile(fresh(), dir, "assets/json/novels.json"));
  kite.visualNovels.forEach((v, i) => assertWalkEquivalent(v, compiled.visualNovels[i]));
  for (const rel of ["tailwind.css", START, "assets/json/image-paths.json", "assets/json/knowledge.json", IMAGE_SLOTS[0].path, "assets/Images/Background/Bank_BG.png", "assets/Fonts/lato-latin-400-normal.woff2"]) {
    assert.equal(await resolveFile(fresh(), dir, rel), null, rel);
  }
  assert.deepEqual(extraPaths(fresh()), []);
});

test("text override replaces the start button", async () => {
  const project = fresh();
  project.texts["start.button"] = "GO";
  const source = await resolveFile(project, tmp(), START);
  assert.ok(source.includes(">GO<"));
  assert.ok(!source.includes("STARTEN"));
});

test("hostile text cannot break out of the source", async () => {
  const hostile = "`</span>${alert(1)}\"'\\\n\u2028";
  assert.ok(!/[`$"'\\<>\n\u2028]/.test(escapeForSource(hostile).replaceAll("\\u", "")));
  const dir = tmp();
  for (const slot of textSlots()) {
    const project = fresh();
    project.texts[slot.key] = hostile;
    const source = await resolveFile(project, dir, slot.file);
    assert.ok(!source.includes("${alert"), slot.key);
    const file = path.join(dir, "check.mjs");
    fs.writeFileSync(file, source);
    execFileSync(process.execPath, ["--check", file]);
  }
});

test("color override rewrites css and js consistently", async () => {
  const project = fresh();
  project.colors.primary = "#FF0000";
  const css = await resolveFile(project, tmp(), "tailwind.css");
  assert.ok(!/#14305d/i.test(css));
  assert.ok(css.includes("#ff0000"));
  assert.ok((await resolveFile(project, tmp(), "src/scenes/settings-scene/settings-scene.js")).includes("text-[#ff0000]"));
});

test("invalid color is ignored", async () => {
  const project = fresh();
  project.colors.primary = "red;}";
  assert.equal(await resolveFile(project, tmp(), "tailwind.css"), null);
});

test("image override returns the uploaded bytes, missing upload falls back", async () => {
  const dir = tmp();
  fs.mkdirSync(path.join(dir, "assets"));
  fs.writeFileSync(path.join(dir, "assets", "logo.circle"), "PNGDATA");
  const project = fresh();
  project.images["logo.circle"] = "logo.circle";
  project.images["logo.sponsor"] = "../../etc/passwd";
  assert.equal((await resolveFile(project, dir, IMAGE_SLOTS[0].path)).toString(), "PNGDATA");
  assert.equal(await resolveFile(project, dir, IMAGE_SLOTS[2].path), null);
});

test("content override replaces the json file", async () => {
  const project = fresh();
  project.content["assets/json/links-scene-content.json"] = [{ title: "x" }];
  assert.deepEqual(JSON.parse(await resolveFile(project, tmp(), "assets/json/links-scene-content.json")), [{ title: "x" }]);
});

test("uploaded link pictures are served and built", async () => {
  const dir = tmp();
  const project = fresh();
  const rel = "assets/Images/Uploads/link-abc.png";
  project.content["assets/json/links-scene-content.json"] = [{ title: "x", desc: "", imgSrc: rel, url: "https://a.de" }];
  fs.mkdirSync(path.join(dir, "assets"));
  fs.writeFileSync(path.join(dir, "assets", "link-abc"), "PIC");
  assert.equal((await resolveFile(project, dir, rel)).toString(), "PIC");
  assert.deepEqual(extraPaths(project), [rel]);
  assert.equal(await resolveFile(project, dir, "assets/Images/Uploads/..%2Fx.png"), null);
  assert.equal(await resolveFile(project, dir, "assets/Images/Uploads/missing.png"), null);
});

test("new novel gets a background", async () => {
  const dir = tmp();
  const project = fresh();
  project.novels.push({ ...project.novels[1], name: "Neu" });
  const rel = "assets/Images/Background/Neu_BG.png";
  assert.deepEqual(await resolveFile(project, dir, rel), app("assets/Images/Background/Einstieg_BG.png"));
  assert.deepEqual(extraPaths(project), [rel]);
  assert.ok(JSON.parse(await resolveFile(project, dir, "assets/json/image-paths.json")).includes(rel));

  fs.mkdirSync(path.join(dir, "assets"));
  fs.writeFileSync(path.join(dir, "assets", "bg-Neu"), "BG");
  project.novels.at(-1).background = "bg-Neu";
  assert.equal((await resolveFile(project, dir, rel)).toString(), "BG");
});

test("index.html gets an escaped title", async () => {
  const project = fresh();
  project.appName = "A<b>&";
  assert.ok((await resolveFile(project, tmp(), "index.html")).includes("<title>A&lt;b&gt;&amp;</title>"));
});

test("build writes a complete app", async () => {
  const out = path.join(tmp(), "dist");
  const project = fresh();
  project.texts["start.button"] = "GO";
  project.novels.push({ ...project.novels[1], name: "Neu" });
  const { files } = await build(project, tmp(), out);
  const appCount = fs.readdirSync(APP_DIR, { recursive: true, withFileTypes: true }).filter((e) => e.isFile()).length;
  assert.equal(files, appCount + 2);
  for (const rel of ["index.html", "serve.mjs", "assets/json/novels.json", "assets/Images/Background/Neu_BG.png", "tailwind.css"]) {
    assert.ok(fs.existsSync(path.join(out, rel)), rel);
  }
  assert.ok(fs.readFileSync(path.join(out, START), "utf8").includes(">GO<"));
  assert.deepEqual(fs.readFileSync(path.join(out, "tailwind.css")), app("tailwind.css"));
});

test("safeJoin rejects traversal", async () => {
  const root = path.resolve("/a/b");
  assert.equal(safeJoin(root, "../c"), null);
  assert.equal(safeJoin(root, "/..%2f..%2fc"), null);
  assert.equal(safeJoin(root, "x/../../y"), null);
  assert.equal(safeJoin(root, "%zz"), null);
  assert.equal(safeJoin(root, "x/y.png"), path.join(root, "x", "y.png"));
  assert.equal(safeJoin(root, "/x/y.png"), path.join(root, "x", "y.png"));
});
