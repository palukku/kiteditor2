// Pure functions that change editor novels. No DOM: also imported by the
// Node tests. Format: docs/kiteditor/01-project-format.md

const UMLAUTS = { ä: "ae", ö: "oe", ü: "ue", Ä: "Ae", Ö: "Oe", Ü: "Ue", ß: "ss" };

// Turns a title into a unique, file-name-safe novel name
export function slugify(title, takenNames) {
  const base = String(title)
    .replace(/[äöüÄÖÜß]/g, (c) => UMLAUTS[c])
    .replace(/[^A-Za-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "novel";
  // "Einstieg" is the app's reserved name of the intro novel
  const taken = new Set([...takenNames, "Einstieg"]);
  let name = base;
  for (let n = 2; taken.has(name); n++) name = `${base}-${n}`;
  return name;
}

function blankNode(id, x, y) {
  return { id, label: "New node", x, y, steps: [], ending: "end", choices: [], next: null };
}

export function createNovel(project, title) {
  const novel = {
    name: slugify(title, project.novels.map((n) => n.name)),
    intro: false,
    title,
    description: "",
    context: "",
    color: "#14305d",
    frameColor: "#284673",
    background: null,
    start: "n1",
    nextNodeNumber: 2,
    nodes: [{ ...blankNode("n1", 40, 40), label: "Start" }],
  };
  project.novels.push(novel);
  return novel;
}

export function deleteNovel(project, novel) {
  if (novel.intro) return;
  project.novels = project.novels.filter((n) => n !== novel);
}

export function addNode(novel, nearNode) {
  const ids = new Set(novel.nodes.map((n) => n.id));
  novel.nextNodeNumber ??= 1;
  // Imported novels use free-form ids, so skip any that are taken
  while (ids.has(`n${novel.nextNodeNumber}`)) novel.nextNodeNumber++;
  const x = nearNode ? nearNode.x + 260 : 40;
  let y = nearNode ? nearNode.y : 40;
  while (novel.nodes.some((n) => n.x === x && n.y === y)) y += 110;
  const node = blankNode(`n${novel.nextNodeNumber++}`, x, y);
  novel.nodes.push(node);
  return node;
}

export function deleteNode(novel, node) {
  if (node.id === novel.start) return;
  novel.nodes = novel.nodes.filter((n) => n !== node);
  for (const other of novel.nodes) {
    if (other.next === node.id) other.next = null;
    for (const choice of other.choices) if (choice.to === node.id) choice.to = null;
  }
}

// All connections that can be drawn (targets that exist)
export function edgesOf(novel) {
  const ids = new Set(novel.nodes.map((n) => n.id));
  const edges = [];
  for (const node of novel.nodes) {
    const targets = node.ending === "choices" ? node.choices.map((c) => c.to) : node.ending === "next" ? [node.next] : [];
    for (const to of new Set(targets)) if (ids.has(to)) edges.push({ from: node.id, to });
  }
  return edges;
}
