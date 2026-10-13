// Tiny static file helpers. Also runs standalone: the build copies this
// file into dist/ as serve.mjs so a built app can be played with
// "node serve.mjs" (ES modules do not load from file:// URLs).

import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".wav": "audio/wav",
  ".mp3": "audio/mpeg",
  ".woff2": "font/woff2",
};

// Joins a URL path onto root; null when it would leave root.
export function safeJoin(root, urlPath) {
  let decoded;
  try {
    decoded = decodeURIComponent(urlPath);
  } catch {
    return null;
  }
  if (decoded.includes("\0")) return null;
  const base = path.resolve(root);
  const full = path.resolve(base, "./" + decoded.replace(/^[/\\]+/, ""));
  return full === base || full.startsWith(base + path.sep) ? full : null;
}

// Sends body when given, otherwise the file at absPath (404 when unreadable).
export function sendFile(res, absPath, body) {
  if (body == null) {
    try {
      body = fs.readFileSync(absPath);
    } catch {
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end('{"error":"not found"}');
      return;
    }
  }
  res.writeHead(200, {
    "Content-Type": TYPES[path.extname(absPath).toLowerCase()] ?? "application/octet-stream",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  });
  res.end(body);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const root = path.dirname(fileURLToPath(import.meta.url));
  const port = Number(process.env.PORT) || 4174;
  http
    .createServer((req, res) => {
      const urlPath = req.url.split("?")[0];
      const file = safeJoin(root, urlPath === "/" ? "index.html" : urlPath);
      if (!file) return sendFile(res, "", null);
      sendFile(res, file);
    })
    .listen(port, "127.0.0.1", () => console.log(`App running at http://127.0.0.1:${port}`));
}
