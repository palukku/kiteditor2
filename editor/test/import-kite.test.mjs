import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { compileNovel, validateProject } from "../lib/compile.mjs";
import { decompileNovel, importKite, layoutNovel, NOVELS_JSON, DEFAULT_PROJECT } from "../lib/import-kite.mjs";
import { assertWalkEquivalent } from "./helpers.mjs";

const kite = JSON.parse(fs.readFileSync(NOVELS_JSON, "utf8"));

test("round trip keeps every KITE novel playable identically", () => {
  for (const original of kite.visualNovels) {
    const compiled = compileNovel(decompileNovel(original));
    assert.ok(assertWalkEquivalent(original, compiled) > 1, original.name);
    for (const key of ["name", "title", "description", "context", "novelColor", "novelFrameColor"]) {
      assert.equal(compiled[key], original[key], `${original.name}.${key}`);
    }
  }
});

test("no node id contains #", () => {
  for (const novel of importKite(kite).novels) {
    for (const node of novel.nodes) assert.ok(!node.id.includes("#"), node.id);
  }
});

test("importKite marks exactly one intro and has no name problems", () => {
  const project = importKite(kite);
  assert.equal(project.novels.filter((n) => n.intro).length, 1);
  assert.deepEqual(validateProject(project).filter((w) => !w.includes("can never be reached")), []);
});

test("layoutNovel gives every node a unique finite position", () => {
  for (const novel of importKite(kite).novels) {
    layoutNovel(novel);
    const positions = new Set(novel.nodes.map((n) => `${n.x}/${n.y}`));
    assert.equal(positions.size, novel.nodes.length);
    assert.ok(novel.nodes.every((n) => Number.isFinite(n.x) && Number.isFinite(n.y)));
  }
});

test("default-project.json is up to date", () => {
  assert.deepEqual(JSON.parse(fs.readFileSync(DEFAULT_PROJECT, "utf8")), importKite(kite));
});
