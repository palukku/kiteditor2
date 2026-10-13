import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { crc32, zipParts } from "../lib/zip.mjs";
import { buildSite } from "../lib/site.mjs";
import { createOverlay } from "../lib/overlay-core.mjs";

test("crc32 matches the standard check value", () => {
  assert.equal(crc32(new TextEncoder().encode("123456789")), 0xcbf43926);
  assert.equal(crc32(new Uint8Array(0)), 0);
});

test("zipParts writes local headers, a central directory and the end record", () => {
  const data = new TextEncoder().encode("hello");
  const zip = Buffer.concat(zipParts([["a/ä.txt", data], ["b.bin", new Uint8Array(0)]]));
  assert.equal(zip.readUInt32LE(0), 0x04034b50);
  assert.equal(zip.readUInt32LE(14), crc32(data));
  assert.equal(zip.readUInt32LE(18), 5);
  const nameLength = zip.readUInt16LE(26);
  assert.equal(zip.subarray(30, 30 + nameLength).toString("utf8"), "a/ä.txt");
  assert.equal(zip.subarray(30 + nameLength, 35 + nameLength).toString(), "hello");
  const end = zip.length - 22;
  assert.equal(zip.readUInt32LE(end), 0x06054b50);
  assert.equal(zip.readUInt16LE(end + 10), 2);
  // The end record points at the central directory
  assert.equal(zip.readUInt32LE(zip.readUInt32LE(end + 16)), 0x02014b50);
  assert.equal(zip.readUInt32LE(end + 16) + zip.readUInt32LE(end + 12), end);
});

test("buildSite writes a self-contained static editor", () => {
  const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "kiteditor-site-")), "site");
  buildSite(out);
  for (const rel of ["index.html", "sw.js", "editor.css", "src/editor-main.js", "src/browser-backend-service.js", "lib/compile.mjs", "lib/overlay-core.mjs", "lib/zip.mjs", "lib/serve-static.mjs", "default-project.json", "app/index.html", "app/assets/json/novels.json"]) {
    assert.ok(fs.existsSync(path.join(out, rel)), rel);
  }
  const meta = JSON.parse(fs.readFileSync(path.join(out, "meta.json"), "utf8"));
  assert.ok(meta.appFiles.includes("src/spa-main.js") && meta.appFiles.includes("index.html"));
  assert.ok(meta.textSlots.length > 10 && meta.characters.length > 5);
  // What the browser imports must not need Node
  for (const lib of ["compile.mjs", "overlay-core.mjs", "zip.mjs"]) {
    assert.ok(!/from "node:/.test(fs.readFileSync(path.join(out, "lib", lib), "utf8")), lib);
  }
  // Every relative import of the browser modules resolves inside the site
  for (const file of fs.readdirSync(path.join(out, "src"))) {
    const source = fs.readFileSync(path.join(out, "src", file), "utf8");
    for (const [, spec] of source.matchAll(/(?:from|import)\s*\(?\s*"(\.[^"]+)"/g)) {
      assert.ok(fs.existsSync(path.resolve(out, "src", spec)), `${file} imports ${spec}`);
    }
  }
});

test("overlay core ignores novel names that are not file-safe", async () => {
  const overlay = createOverlay({ image: [], color: [], text: [], content: [] }, { read: async () => null, exists: () => false, asset: async () => null });
  const project = { novels: [{ intro: true, name: "x", nodes: [] }, { name: "../../evil", nodes: [] }, { name: "Ok", nodes: [] }] };
  assert.deepEqual(overlay.extraPaths(project), ["assets/Images/Background/Einstieg_BG.png", "assets/Images/Background/Ok_BG.png"]);
});
