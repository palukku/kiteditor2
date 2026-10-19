// Backend of the browser-only editor (GitHub Pages): does in the browser
// what editor/server.mjs does locally. The project lives in this browser's
// IndexedDB, the preview is answered through the service worker (sw.js),
// and a build is a zip download.

import { validateProject } from "../lib/compile.mjs";
import { migrateProject } from "../lib/content-format.mjs";
import { createOverlay } from "../lib/overlay-core.mjs";
import { zipParts } from "../lib/zip.mjs";

const DB_NAME = "kiteditor";
const STORE = "files";
const PROJECT_KEY = "project";
const ASSET_PREFIX = "asset:";
const CONTROL_TIMEOUT_MS = 3000;

// Tiny key-value store on IndexedDB
function openStore() {
  const opened = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  const run = async (mode, action) => {
    const db = await opened;
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const request = action(tx.objectStore(STORE));
      tx.oncomplete = () => resolve(request.result);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  };
  return {
    get: (key) => run("readonly", (store) => store.get(key)),
    set: (key, value) => run("readwrite", (store) => store.put(value, key)),
    keys: () => run("readonly", (store) => store.getAllKeys()),
    clear: () => run("readwrite", (store) => store.clear()),
  };
}

// The JSON of an exported project, with a readable error for edited files
function parseProjectFile(text) {
  try {
    // A byte order mark from some text editors is not JSON
    return JSON.parse(text.replace(/^\uFEFF/, ""));
  } catch (error) {
    throw new Error(`the file is not valid JSON (${error.message}). If it was edited or reformatted, check for trailing commas, comments or single quotes.`);
  }
}

const toBytes = async (response) => (response.ok ? new Uint8Array(await response.arrayBuffer()) : null);

// The preview iframe only works once the service worker controls this page
async function startServiceWorker() {
  if (!("serviceWorker" in navigator)) {
    throw new Error("this browser blocks service workers here. The online editor needs an https:// address (or localhost) and no private window.");
  }
  // updateViaCache "none": the browser always fetches sw.js itself fresh, so a deploy takes over at once
  await navigator.serviceWorker.register("sw.js", { updateViaCache: "none" });
  await navigator.serviceWorker.ready;
  if (!navigator.serviceWorker.controller) {
    await Promise.race([
      new Promise((resolve) => navigator.serviceWorker.addEventListener("controllerchange", resolve, { once: true })),
      new Promise((resolve) => setTimeout(resolve, CONTROL_TIMEOUT_MS)),
    ]);
  }
}

export async function createBrowserBackend() {
  const store = openStore();
  const meta = await (await fetch("meta.json")).json();
  const appFiles = new Set(meta.appFiles);
  // The saved project: what preview and build show
  let project = (await store.get(PROJECT_KEY)) ?? (await (await fetch("default-project.json")).json());
  migrateProject(project, meta.content);

  const textCache = new Map();
  const overlay = createOverlay(
    { image: meta.imageSlots, color: meta.colorSlots, text: meta.textSlots, content: meta.contentFiles },
    {
      exists: (rel) => appFiles.has(rel),
      read: (rel) => {
        if (!appFiles.has(rel)) return Promise.resolve(null);
        // Source files are transformed on every preview load, so keep them; images are not
        if (!/\.(js|css|html|json)$/.test(rel)) return fetch(`app/${rel}`).then(toBytes);
        if (!textCache.has(rel)) textCache.set(rel, fetch(`app/${rel}`).then(toBytes));
        return textCache.get(rel);
      },
      asset: async (name) => {
        const blob = await store.get(ASSET_PREFIX + name);
        return blob ? new Uint8Array(await blob.arrayBuffer()) : null;
      },
    },
  );

  await startServiceWorker();
  navigator.serviceWorker.addEventListener("message", async (event) => {
    if (event.data?.previewPath == null) return;
    const body = await overlay.resolveFile(project, event.data.previewPath).catch(() => null);
    event.ports[0].postMessage({ body });
  });

  return {
    getProject: async () => structuredClone(project),

    getMeta: async () => meta,

    async saveProject(next) {
      project = structuredClone(next);
      await store.set(PROJECT_KEY, project);
      return { warnings: validateProject(project) };
    },

    async uploadAsset(name, file) {
      await store.set(ASSET_PREFIX + name, file);
      return { name };
    },

    // shortcut: files are fetched one after another (~400 requests); batch them if builds feel slow
    async buildApp() {
      const encoder = new TextEncoder();
      const entries = [];
      for await (const [rel, content] of overlay.buildFiles(project, meta.appFiles)) {
        if (content != null) entries.push([rel, typeof content === "string" ? encoder.encode(content) : content]);
      }
      entries.push(["serve.mjs", await toBytes(await fetch("lib/serve-static.mjs"))]);
      const url = URL.createObjectURL(new Blob(zipParts(entries), { type: "application/zip" }));
      return { files: entries.length, dir: "kite-app.zip", url, download: "kite-app.zip" };
    },

    // The project with its uploaded images in one file, as a backup or to move it to another browser
    async exportProject() {
      const assets = {};
      for (const key of await store.keys()) {
        if (!String(key).startsWith(ASSET_PREFIX)) continue;
        const blob = await store.get(key);
        assets[key.slice(ASSET_PREFIX.length)] = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = () => reject(reader.error);
          reader.readAsDataURL(blob);
        });
      }
      // Indented, so the file is readable without reformatting it
      return new Blob([JSON.stringify({ project, assets }, null, 2)], { type: "application/json" });
    },

    async resetProject() {
      project = await (await fetch("default-project.json")).json();
      migrateProject(project, meta.content);
      await store.set(PROJECT_KEY, project);
      return structuredClone(project);
    },

    async importProject(file) {
      const data = parseProjectFile(await file.text());
      // Accepts an export of this editor, or a plain project.json of the local editor
      const next = data.project ?? data;
      if (!Array.isArray(next?.novels)) throw new Error("this file is not a KITEditor project");
      await store.clear();
      for (const [name, dataUrl] of Object.entries(data.assets ?? {})) {
        if (/^[A-Za-z0-9_-][A-Za-z0-9._-]*$/.test(name) && String(dataUrl).startsWith("data:")) {
          await store.set(ASSET_PREFIX + name, await (await fetch(dataUrl)).blob());
        }
      }
      migrateProject(next, meta.content);
      project = next;
      await store.set(PROJECT_KEY, project);
    },
  };
}
