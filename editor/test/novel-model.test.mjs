import test from "node:test";
import assert from "node:assert/strict";
import { slugify, createNovel, deleteNovel, addNode, deleteNode, edgesOf } from "../ui/src/novel-model-service.js";
import { compileNovel, validateNovel } from "../lib/compile.mjs";

test("slugify makes unique file-safe names", () => {
  assert.equal(slugify("Büro & Größe!", []), "Buero-Groesse");
  assert.equal(slugify("", []), "novel");
  assert.equal(slugify("???", []), "novel");
  assert.equal(slugify("A", ["A", "A-2"]), "A-3");
  assert.equal(slugify("Einstieg", []), "Einstieg-2");
  assert.match(slugify("../../etc/passwd", []), /^[A-Za-z0-9_-]+$/);
});

test("createNovel is valid and compiles to a single end", () => {
  const project = { novels: [] };
  const novel = createNovel(project, "Mein Test");
  assert.equal(project.novels[0], novel);
  assert.equal(novel.name, "Mein-Test");
  assert.deepEqual(validateNovel(novel), []);
  assert.deepEqual(compileNovel(novel).novelEvents.map((e) => e.eventType), [10]);
  assert.equal(createNovel(project, "Mein Test").name, "Mein-Test-2");
});

test("addNode yields unique ids, also after deletions and for imported ids", () => {
  const novel = createNovel({ novels: [] }, "x");
  const a = addNode(novel, novel.nodes[0]);
  const b = addNode(novel, novel.nodes[0]);
  deleteNode(novel, a);
  const c = addNode(novel);
  assert.equal(new Set([novel.nodes[0].id, a.id, b.id, c.id]).size, 4);
  assert.deepEqual([a.x, a.y], [300, 40]);
  assert.notDeepEqual([a.x, a.y], [b.x, b.y]);

  const imported = { start: "Anfang", nextNodeNumber: 1, nodes: [{ id: "Anfang", x: 0, y: 0, choices: [] }, { id: "n1", x: 0, y: 110, choices: [] }] };
  assert.equal(addNode(imported).id, "n2");
});

test("deleteNode clears references and refuses the start node", () => {
  const novel = createNovel({ novels: [] }, "x");
  const start = novel.nodes[0];
  const a = addNode(novel, start);
  const b = addNode(novel, start);
  Object.assign(start, { ending: "choices", choices: [{ text: "a", to: a.id }, { text: "b", to: b.id }] });
  Object.assign(b, { ending: "next", next: a.id });
  deleteNode(novel, a);
  assert.deepEqual(start.choices.map((c) => c.to), [null, b.id]);
  assert.equal(b.next, null);
  deleteNode(novel, start);
  assert.ok(novel.nodes.includes(start));
});

test("deleteNovel refuses the intro novel", () => {
  const project = { novels: [] };
  const intro = createNovel(project, "Intro");
  intro.intro = true;
  const other = createNovel(project, "Other");
  deleteNovel(project, intro);
  deleteNovel(project, other);
  assert.deepEqual(project.novels, [intro]);
});

test("edgesOf skips dangling targets and inactive endings", () => {
  const novel = createNovel({ novels: [] }, "x");
  const start = novel.nodes[0];
  const a = addNode(novel, start);
  Object.assign(start, { ending: "choices", choices: [{ text: "a", to: a.id }, { text: "again", to: a.id }, { text: "x", to: "gone" }], next: a.id });
  assert.deepEqual(edgesOf(novel), [{ from: start.id, to: a.id }]);
  start.ending = "end";
  assert.deepEqual(edgesOf(novel), []);
});
