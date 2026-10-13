// KITEditor local server. No dependencies: node editor/server.mjs
// Serves the editor UI, a live white-labelled preview of app/, and the API.

import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validateProject } from "./lib/compile.mjs";
import { resolveFile, build } from "./lib/overlay.mjs";
import { APP_DIR, IMAGE_SLOTS, COLOR_SLOTS, CONTENT_FILES, textSlots } from "./lib/slots.mjs";
import { safeJoin, sendFile } from "./lib/serve-static.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(HERE, "public");
const DEFAULT_PROJECT = path.join(HERE, "default-project.json");
const MAX_BODY = 20 * 1024 * 1024;
const ASSET_NAME = /^[A-Za-z0-9_-][A-Za-z0-9._-]*$/;

function json(res, status, value) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  res.end(JSON.stringify(value));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY) {
        reject(Object.assign(new Error("body too large"), { status: 413 }));
        req.destroy();
      } else {
        chunks.push(chunk);
      }
    });
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

function loadMeta() {
  const read = (rel) => fs.readFileSync(path.join(APP_DIR, rel), "utf8");
  const lines = (rel) => read(rel).split(/\r?\n/).filter((line) => line.includes(":"));
  return {
    imageSlots: IMAGE_SLOTS,
    colorSlots: COLOR_SLOTS,
    textSlots: textSlots(),
    contentFiles: CONTENT_FILES,
    characters: JSON.parse(read("assets/json/character-info.json")).characters.filter((c) => c.id !== 0),
    expressions: lines("assets/mappings/face-expressions.txt").map((line) => {
      const [name, id] = line.split(":");
      return { id: Number(id), name: name.trim() };
    }),
    sounds: fs.readdirSync(path.join(APP_DIR, "assets/AudioResources")).map((f) => path.parse(f).name).sort(),
    biases: lines("assets/mappings/biases.txt").map((line) => line.slice(line.indexOf(":") + 1).trim()),
    content: Object.fromEntries(CONTENT_FILES.map((c) => [c.path, JSON.parse(read(c.path))])),
  };
}

export function createServer({ projectDir, distDir }) {
  const projectFile = path.join(projectDir, "project.json");
  const assetsDir = path.join(projectDir, "assets");
  let project = null;
  let meta = null;

  const getProject = () => {
    if (!project) {
      if (!fs.existsSync(projectFile)) {
        fs.mkdirSync(projectDir, { recursive: true });
        fs.copyFileSync(DEFAULT_PROJECT, projectFile);
      }
      project = JSON.parse(fs.readFileSync(projectFile, "utf8"));
    }
    return project;
  };

  async function handle(req, res) {
    // Raw path on purpose: new URL() would silently normalise "/../"
    const urlPath = req.url.split("?")[0];
    const under = (prefix) => (urlPath.startsWith(prefix) ? urlPath.slice(prefix.length) : null);

    if (urlPath === "/api/project" && req.method === "GET") return json(res, 200, getProject());

    if (urlPath === "/api/project" && req.method === "PUT") {
      let next;
      try {
        next = JSON.parse((await readBody(req)).toString("utf8"));
      } catch (error) {
        if (error.status) throw error;
        return json(res, 400, { error: "invalid JSON" });
      }
      if (!next || typeof next !== "object" || !Array.isArray(next.novels)) return json(res, 400, { error: "not a project" });
      fs.mkdirSync(projectDir, { recursive: true });
      // Write-then-rename so a crash never leaves a half-written project
      fs.writeFileSync(projectFile + ".tmp", JSON.stringify(next, null, 1));
      fs.renameSync(projectFile + ".tmp", projectFile);
      project = next;
      return json(res, 200, { warnings: validateProject(project) });
    }

    if (urlPath === "/api/meta" && req.method === "GET") return json(res, 200, (meta ??= loadMeta()));

    if (urlPath === "/api/build" && req.method === "POST") {
      return json(res, 200, { ...build(getProject(), projectDir, distDir), dir: distDir });
    }

    const assetName = under("/api/asset/");
    if (assetName !== null) {
      if (!ASSET_NAME.test(assetName)) return json(res, 400, { error: "invalid asset name" });
      const file = path.join(assetsDir, assetName);
      if (req.method === "POST") {
        const body = await readBody(req);
        fs.mkdirSync(assetsDir, { recursive: true });
        fs.writeFileSync(file, body);
        return json(res, 200, { name: assetName });
      }
      // shortcut: uploads keep no file type, so they are served as PNG and the
      // browser sniffs the real image format; store the type if SVG is needed.
      return sendFile(res, file + ".png", fs.existsSync(file) ? fs.readFileSync(file) : null);
    }

    if (req.method !== "GET") return json(res, 404, { error: "not found" });

    const previewRel = under("/preview/");
    if (previewRel !== null) {
      const file = safeJoin(APP_DIR, previewRel);
      if (!file) return json(res, 400, { error: "invalid path" });
      const rel = path.relative(APP_DIR, file).split(path.sep).join("/");
      return sendFile(res, file, resolveFile(getProject(), projectDir, rel));
    }

    const distRel = under("/dist/");
    if (distRel !== null) {
      const file = safeJoin(distDir, distRel);
      return file ? sendFile(res, file) : json(res, 400, { error: "invalid path" });
    }

    const file = safeJoin(PUBLIC_DIR, urlPath === "/" ? "index.html" : urlPath);
    return file ? sendFile(res, file) : json(res, 400, { error: "invalid path" });
  }

  return http.createServer((req, res) => {
    handle(req, res).catch((error) => {
      if (!error.status) console.error(error);
      if (!res.headersSent) json(res, error.status ?? 500, { error: error.message });
    });
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const options = { projectDir: path.join(HERE, "project"), distDir: path.resolve(HERE, "../dist") };
  if (process.argv.includes("--build")) {
    const projectFile = path.join(options.projectDir, "project.json");
    const project = JSON.parse(fs.readFileSync(fs.existsSync(projectFile) ? projectFile : DEFAULT_PROJECT, "utf8"));
    const { files } = build(project, options.projectDir, options.distDir);
    console.log(`Built ${files} files → ${options.distDir}\nPlay it: node dist/serve.mjs`);
  } else {
    const port = Number(process.env.PORT) || 4173;
    createServer(options).listen(port, "127.0.0.1", () => console.log(`KITEditor running at http://127.0.0.1:${port}`));
  }
}
