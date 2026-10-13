import test from "node:test";
import assert from "node:assert/strict";
import { compileNovel, compileProject, validateNovel, validateProject } from "../lib/compile.mjs";

const node = (id, extra = {}) => ({ id, label: id, x: 0, y: 0, steps: [], ending: "end", choices: [], next: null, ...extra });
const say = (text) => ({ type: "say", character: 8, expression: 9, text });

const demo = () => ({
  name: "Eltern",
  intro: false,
  title: "Eltern informieren",
  description: "d",
  context: "c",
  color: "#25650e",
  frameColor: "#4c9a30",
  background: null,
  start: "n1",
  nodes: [
    node("n1", {
      steps: [
        { type: "join", character: 8, expression: 10 },
        say("Hallo!"),
        { type: "sound", clip: "TelephoneCall" },
        { type: "bias", bias: "Tightrope Bias" },
        { type: "exit" },
      ],
      ending: "choices",
      choices: [{ text: "Hallo Mama.", to: "n2" }],
    }),
    node("n2"),
  ],
});

const ids = (v) => v.novelEvents.map((e) => e.id);
const byId = (v, id) => v.novelEvents.find((e) => e.id === id);

test("compiles steps, choices and end", () => {
  const v = compileNovel(demo());
  assert.deepEqual(ids(v), ["n1", "n1#1", "n1#2", "n1#3", "n1#4", "n1#5", "n1#6", "n2"]);
  assert.deepEqual(v.novelEvents.map((e) => e.eventType), [2, 4, 11, 16, 3, 5, 6, 10]);
  assert.equal(byId(v, "n1#5").onChoice, "n2");
  assert.equal(byId(v, "n1#5").text, "Hallo Mama.");
  assert.deepEqual(v.novelEvents.slice(0, 6).map((e) => e.nextId), ["n1#1", "n1#2", "n1#3", "n1#4", "n1#5", "n1#6"]);
  assert.equal(byId(v, "n1#6").nextId, undefined);
  assert.equal(byId(v, "n2").nextId, undefined);
  assert.equal(byId(v, "n1#1").text, "Hallo!");
  assert.equal(byId(v, "n1#2").audioClipToPlay, "TelephoneCall");
  assert.equal(byId(v, "n1#3").relevantBias, "Tightrope Bias");
});

test("maps novel fields", () => {
  const v = compileNovel(demo());
  assert.equal(v.name, "Eltern");
  assert.equal(v.novelColor, "#25650e");
  assert.equal(v.novelFrameColor, "#4c9a30");
  assert.equal("disablePauseMenu" in v, false);
});

test("intro novel is named Einstieg", () => {
  const v = compileNovel({ ...demo(), intro: true });
  assert.equal(v.name, "Einstieg");
  assert.equal(v.disablePauseMenu, true);
});

test("start node is emitted first", () => {
  const n = demo();
  n.nodes.reverse();
  assert.equal(compileNovel(n).novelEvents[0].id, "n1");
});

test("dangling target ends the novel", () => {
  const n = demo();
  n.nodes[0].choices[0].to = "missing";
  const v = compileNovel(n);
  assert.equal(byId(v, byId(v, "n1#5").onChoice).eventType, 10);
  assert.ok(validateNovel(n).some((w) => w.includes("missing")));
});

test("node without ending ends the novel", () => {
  const n = demo();
  n.nodes[1] = node("n2", { steps: [say("x")], ending: "next", next: null });
  const v = compileNovel(n);
  assert.equal(v.novelEvents.at(-1).eventType, 10);
  assert.equal(byId(v, "n2").nextId, "n2#1");
  assert.ok(validateNovel(n).length > 0);
});

test("empty next-node is skipped", () => {
  const n = demo();
  n.nodes = [
    node("A", { ending: "choices", choices: [{ text: "go", to: "B" }] }),
    node("B", { ending: "next", next: "C" }),
    node("C", { steps: [say("c")] }),
  ];
  n.start = "A";
  const v = compileNovel(n);
  assert.equal(byId(v, "A").onChoice, "C");
  assert.equal(byId(v, "B"), undefined);
  assert.deepEqual(validateNovel(n), []);
});

test("empty start node still starts at the right event", () => {
  const n = demo();
  n.nodes = [node("X", { steps: [say("x")] }), node("S", { ending: "next", next: "T" }), node("T", { steps: [say("t")] })];
  n.start = "S";
  assert.equal(compileNovel(n).novelEvents[0].id, "T");
});

test("empty next-node cycle does not hang", () => {
  const n = demo();
  n.nodes = [
    node("A", { ending: "choices", choices: [{ text: "go", to: "B" }] }),
    node("B", { ending: "next", next: "C" }),
    node("C", { ending: "next", next: "B" }),
  ];
  n.start = "A";
  const v = compileNovel(n);
  assert.equal(byId(v, byId(v, "A").onChoice).eventType, 10);
});

test("unreachable node warns", () => {
  const n = demo();
  n.nodes.push(node("n3", { label: "Lonely" }));
  assert.ok(validateNovel(n).some((w) => w.includes("Lonely")));
});

test("choices ending with zero choices warns and ends", () => {
  const n = demo();
  n.nodes = [node("n1", { ending: "choices", choices: [] })];
  assert.ok(validateNovel(n).length > 0);
  assert.deepEqual(compileNovel(n).novelEvents.map((e) => e.eventType), [10]);
});

test("compileProject always has exactly one Einstieg", () => {
  const count = (p) => compileProject(p).visualNovels.filter((v) => v.name === "Einstieg").length;
  const a = { ...demo(), name: "A" };
  const b = { ...demo(), name: "B" };
  assert.equal(count({ novels: [a, b] }), 1);
  assert.equal(compileProject({ novels: [a, b] }).visualNovels[0].title, a.title);
  const two = compileProject({ novels: [{ ...a, intro: true }, { ...b, intro: true }] });
  assert.deepEqual(two.visualNovels.map((v) => v.name), ["Einstieg", "B"]);
  const empty = compileProject({ novels: [] });
  assert.equal(empty.visualNovels.length, 1);
  assert.equal(empty.visualNovels[0].name, "Einstieg");
  assert.deepEqual(empty.visualNovels[0].novelEvents.map((e) => e.eventType), [10]);
});

test("intro novel comes first even when listed later", () => {
  const p = { novels: [{ ...demo(), name: "A" }, { ...demo(), name: "B", intro: true }] };
  assert.deepEqual(compileProject(p).visualNovels.map((v) => v.name), ["Einstieg", "A"]);
});

test("validateProject reports duplicate and invalid names", () => {
  const p = { novels: [{ ...demo(), intro: true }, { ...demo(), name: "X" }, { ...demo(), name: "X" }, { ...demo(), name: "a b" }] };
  const w = validateProject(p);
  assert.ok(w.some((x) => x.includes('"X"') && x.includes("more than once")));
  assert.ok(w.some((x) => x.includes("a b")));
  assert.deepEqual(validateProject({ novels: [{ ...demo(), intro: true }] }), []);
});
