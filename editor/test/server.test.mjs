import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { createServer } from "../server.mjs";
import { APP_DIR, IMAGE_SLOTS } from "../lib/slots.mjs";

const root = fs.mkdtempSync(path.join(os.tmpdir(), "kiteditor-server-"));
const projectDir = path.join(root, "project");
const distDir = path.join(root, "dist");
fs.writeFileSync(path.join(root, "secret.txt"), "SECRET");

let server;
let base;

before(async () => {
  server = createServer({ projectDir, distDir });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => server.close());

const getJson = async (url) => (await fetch(base + url)).json();
const put = (body) => fetch(base + "/api/project", { method: "PUT", body });

// fetch() normalises "/../", so traversal attempts need a raw request
function raw(requestPath) {
  return new Promise((resolve, reject) => {
    const req = http.request({ host: "127.0.0.1", port: server.address().port, path: requestPath }, (res) => {
      let body = "";
      res.on("data", (chunk) => (body += chunk));
      res.on("end", () => resolve({ status: res.statusCode, body }));
    });
    req.on("error", reject);
    req.end();
  });
}

test("GET /api/project seeds from the default project", async () => {
  const project = await getJson("/api/project");
  assert.equal(project.novels.length, 9);
  assert.ok(fs.existsSync(path.join(projectDir, "project.json")));
});

test("PUT then GET round-trips and returns warnings", async () => {
  const project = await getJson("/api/project");
  project.appName = "Mein Training";
  assert.deepEqual((await (await put(JSON.stringify(project))).json()).warnings.filter((w) => !w.includes("reached")), []);
  assert.equal((await getJson("/api/project")).appName, "Mein Training");

  const duplicate = structuredClone(project);
  duplicate.novels.push(structuredClone(duplicate.novels[1]));
  assert.ok((await (await put(JSON.stringify(duplicate))).json()).warnings.some((w) => w.includes("more than once")));
  await put(JSON.stringify(project));
});

test("PUT with invalid JSON or a non-project is rejected", async () => {
  assert.equal((await put("{nope")).status, 400);
  assert.equal((await put('{"novels":3}')).status, 400);
  assert.equal((await getJson("/api/project")).novels.length, 9);
});

test("preview serves compiled novels and untouched app files", async () => {
  assert.equal((await getJson("/preview/assets/json/novels.json")).visualNovels[0].name, "Einstieg");
  const res = await fetch(base + "/preview/src/spa-main.js");
  assert.equal(res.headers.get("content-type"), "text/javascript; charset=utf-8");
  assert.equal(await res.text(), fs.readFileSync(path.join(APP_DIR, "src/spa-main.js"), "utf8"));
  assert.ok((await (await fetch(base + "/preview/index.html?t=1")).text()).includes("<title>Mein Training</title>"));
});

test("asset upload is visible in preview", async () => {
  const upload = await fetch(base + "/api/asset/logo.circle", { method: "POST", body: "IMAGEBYTES" });
  assert.deepEqual(await upload.json(), { name: "logo.circle" });
  const project = await getJson("/api/project");
  project.images["logo.circle"] = "logo.circle";
  await put(JSON.stringify(project));
  assert.equal(await (await fetch(`${base}/preview/${IMAGE_SLOTS[0].path}`)).text(), "IMAGEBYTES");
  assert.equal(await (await fetch(base + "/api/asset/logo.circle")).text(), "IMAGEBYTES");
});

test("traversal is rejected", async () => {
  for (const attempt of ["/preview/../../secret.txt", "/preview/..%2f..%2f..%2fsecret.txt", "/dist/../secret.txt", "/../package.json", "/api/asset/..%2Fsecret.txt", "/api/asset/.hidden", "/preview/%2e%2e/package.json"]) {
    const res = await raw(attempt);
    assert.ok([400, 404].includes(res.status), `${attempt} → ${res.status}`);
    assert.ok(!res.body.includes("SECRET") && !res.body.includes("devDependencies"), attempt);
  }
  const post = await fetch(base + "/api/asset/..%2Fsecret.txt", { method: "POST", body: "x" });
  assert.equal(post.status, 400);
  assert.equal(fs.readFileSync(path.join(root, "secret.txt"), "utf8"), "SECRET");
});

test("build endpoint writes dist", async () => {
  const result = await (await fetch(base + "/api/build", { method: "POST" })).json();
  assert.ok(result.files > 100);
  assert.ok(fs.existsSync(path.join(distDir, "index.html")));
  assert.equal((await fetch(base + "/dist/index.html")).status, 200);
});

test("meta lists slots and characters", async () => {
  const meta = await getJson("/api/meta");
  assert.ok(meta.textSlots.some((s) => s.key === "start.button"));
  assert.ok(meta.characters.some((c) => c.id === 1) && !meta.characters.some((c) => c.id === 0));
  assert.deepEqual(meta.expressions[0], { id: 0, name: "Scared" });
  assert.ok(meta.sounds.includes("TelephoneCall"));
  assert.ok(meta.biases.includes("Zugang zu Finanzierung"));
  assert.ok(Array.isArray(meta.content["assets/json/knowledge.json"]));
});

test("unknown routes are 404", async () => {
  assert.equal((await fetch(base + "/nope.html")).status, 404);
  assert.equal((await fetch(base + "/api/unknown", { method: "POST" })).status, 404);
});
