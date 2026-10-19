// Service worker of the browser-only editor (not used with the local server).
// It makes "preview/<file>" work without a server: the request is handed to
// the editor page, which answers with the white-labelled file, or with
// nothing, in which case the original app file is served.

const TYPES = { html: "text/html; charset=utf-8", js: "text/javascript; charset=utf-8", css: "text/css; charset=utf-8", json: "application/json; charset=utf-8", png: "image/png" };
const ANSWER_TIMEOUT_MS = 5000;

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("fetch", (event) => {
  const scope = new URL(self.registration.scope).pathname;
  const prefix = `${scope}preview/`;
  const pathname = new URL(event.request.url).pathname;
  if (!pathname.startsWith(prefix)) return;
  let rel;
  try {
    rel = decodeURIComponent(pathname.slice(prefix.length)) || "index.html";
  } catch {
    return;
  }
  event.respondWith(answer(scope, rel));
});

// Asks the editor page (the top-level window) for the file
async function askEditor(rel) {
  const windows = await self.clients.matchAll({ type: "window" });
  const editor = windows.find((client) => client.frameType === "top-level");
  if (!editor) return null;
  return new Promise((resolve) => {
    const channel = new MessageChannel();
    channel.port1.onmessage = (event) => resolve(event.data.body);
    setTimeout(() => resolve(null), ANSWER_TIMEOUT_MS);
    editor.postMessage({ previewPath: rel }, [channel.port2]);
  });
}

async function answer(scope, rel) {
  const body = await askEditor(rel);
  if (body == null) {
    // Rewrap the original: a fetched response keeps its app/ URL, and the browser
    // would resolve relative URLs in it (CSS backgrounds, JS imports) past the preview
    const original = await fetch(`${scope}app/${rel}`);
    return new Response(original.body, { status: original.status, statusText: original.statusText, headers: original.headers });
  }
  const type = TYPES[rel.split(".").pop().toLowerCase()] ?? "application/octet-stream";
  return new Response(body, { headers: { "Content-Type": type, "Cache-Control": "no-store" } });
}
