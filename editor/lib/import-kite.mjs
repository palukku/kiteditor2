// Converts the app's compiled novels.json back into editor novels.
// Used once to create editor/default-project.json (the real KITE app as a
// starting project). Run: node editor/lib/import-kite.mjs

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { EVENT } from "./compile.mjs";

const STEP_TYPE = { [EVENT.join]: "join", [EVENT.exit]: "exit", [EVENT.say]: "say", [EVENT.sound]: "sound", [EVENT.bias]: "bias" };

function toStep(event) {
  switch (event.eventType) {
    case EVENT.join:
      return { type: "join", character: event.character, expression: event.expressionType };
    case EVENT.say:
      return { type: "say", character: event.character, expression: event.expressionType, text: event.text ?? "" };
    case EVENT.sound:
      return { type: "sound", clip: event.audioClipToPlay };
    case EVENT.bias:
      return { type: "bias", bias: event.relevantBias };
    default:
      return { type: "exit" };
  }
}

// Places nodes in columns by their distance from the start node.
export function layoutNovel(novel) {
  const byId = new Map(novel.nodes.map((n) => [n.id, n]));
  const depth = new Map();
  let layer = byId.has(novel.start) ? [novel.start] : [];
  for (let d = 0; layer.length; d++) {
    const next = [];
    for (const id of layer) {
      if (depth.has(id) || !byId.has(id)) continue;
      depth.set(id, d);
      const node = byId.get(id);
      if (node.ending === "choices") next.push(...node.choices.map((c) => c.to));
      if (node.ending === "next") next.push(node.next);
    }
    layer = next;
  }
  const unreachable = Math.max(-1, ...depth.values()) + 1;
  const rows = new Map();
  for (const node of novel.nodes) {
    const d = depth.get(node.id) ?? unreachable;
    const row = rows.get(d) ?? 0;
    rows.set(d, row + 1);
    node.x = 40 + d * 260;
    node.y = 40 + row * 110;
  }
  return novel;
}

export function decompileNovel(visualNovel) {
  const events = visualNovel.novelEvents ?? [];
  const byId = new Map(events.map((e) => [e.id, e]));

  const refs = new Map();
  for (const e of events) if (e.nextId) refs.set(e.nextId, (refs.get(e.nextId) ?? 0) + 1);
  const heads = new Set();
  if (events[0]) heads.add(events[0].id);
  for (const e of events) if (e.eventType === EVENT.choice && byId.has(e.onChoice)) heads.add(e.onChoice);
  for (const [id, count] of refs) if (count > 1 && byId.has(id)) heads.add(id);
  // A choice block that runs into a normal event instead of showChoices is
  // never shown by the app; it just continues there (see below).
  const endsBlock = (e) => e.eventType === EVENT.choice || e.eventType === EVENT.showChoices;
  for (const e of events) {
    const next = byId.get(e.nextId);
    if (e.eventType === EVENT.choice && next && !endsBlock(next)) heads.add(next.id);
  }

  const nodes = [];
  for (const e of events) {
    if (!heads.has(e.id)) continue;
    const node = { id: e.id, label: e.id, x: 0, y: 0, steps: [], ending: "end", choices: [], next: null };
    let current = e;
    while (current) {
      if (current.eventType === EVENT.choice) {
        node.ending = "choices";
        // Collect the whole choice block up to showChoices
        while (current && current.eventType === EVENT.choice) {
          node.choices.push({ text: current.text ?? "", to: current.onChoice });
          current = byId.get(current.nextId);
        }
        if (current && current.eventType !== EVENT.showChoices) {
          // Broken block in the source data: keep the app's real behaviour
          node.ending = "next";
          node.choices = [];
          node.next = current.id;
        }
        break;
      }
      if (current.eventType === EVENT.end || current.eventType === EVENT.showChoices) break;
      if (STEP_TYPE[current.eventType]) node.steps.push(toStep(current));
      const next = byId.get(current.nextId);
      if (next && heads.has(next.id)) {
        node.ending = "next";
        node.next = next.id;
        break;
      }
      current = next;
    }
    nodes.push(node);
  }

  return layoutNovel({
    name: visualNovel.name,
    intro: visualNovel.name === "Einstieg",
    title: visualNovel.title ?? "",
    description: visualNovel.description ?? "",
    context: visualNovel.context ?? "",
    color: visualNovel.novelColor,
    frameColor: visualNovel.novelFrameColor,
    background: null,
    start: events[0]?.id ?? null,
    nextNodeNumber: 1,
    nodes,
  });
}

export function importKite(novelsJson) {
  return {
    version: 1,
    appName: "KITE",
    images: {},
    colors: {},
    texts: {},
    content: {},
    novels: novelsJson.visualNovels.map(decompileNovel),
  };
}

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
export const NOVELS_JSON = path.join(root, "app/assets/json/novels.json");
export const DEFAULT_PROJECT = path.join(root, "editor/default-project.json");

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const project = importKite(JSON.parse(fs.readFileSync(NOVELS_JSON, "utf8")));
  fs.writeFileSync(DEFAULT_PROJECT, JSON.stringify(project, null, 1) + "\n");
  console.log(`Wrote ${DEFAULT_PROJECT} (${project.novels.length} novels)`);
}
