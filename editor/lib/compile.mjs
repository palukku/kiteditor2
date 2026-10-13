// Compiles editor novels (nodes with steps and an ending) into the event
// list format the KITE app plays. Format: docs/kiteditor/01-project-format.md

export const EVENT = { join: 2, exit: 3, say: 4, choice: 5, showChoices: 6, end: 10, sound: 11, bias: 16 };

const END_ID = "#end";
const NAME_PATTERN = /^[A-Za-z0-9_-]+$/;

const isEmptyJump = (node) => node.ending === "next" && node.steps.length === 0;

// Follows empty "next" nodes until a node that emits events; END_ID when
// the target is missing or the chain loops.
function makeResolver(byId) {
  return (id) => {
    const seen = new Set();
    while (byId.has(id) && !seen.has(id)) {
      const node = byId.get(id);
      if (!isEmptyJump(node)) return id;
      seen.add(id);
      id = node.next;
    }
    return END_ID;
  };
}

function stepEvent(step) {
  const silent = { character: 0, expressionType: 0 };
  switch (step.type) {
    case "join":
      return { eventType: EVENT.join, character: step.character ?? 0, expressionType: step.expression ?? 0 };
    case "say":
      return { eventType: EVENT.say, character: step.character ?? 0, text: step.text ?? "", expressionType: step.expression ?? 0 };
    case "sound":
      return { eventType: EVENT.sound, ...silent, audioClipToPlay: step.clip ?? "" };
    case "bias":
      return { eventType: EVENT.bias, ...silent, relevantBias: step.bias ?? "" };
    case "exit":
      return { eventType: EVENT.exit, ...silent };
    default:
      return null;
  }
}

export function compileNovel(novel) {
  const nodes = novel.nodes ?? [];
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const resolve = makeResolver(byId);
  let usesEnd = false;
  const target = (id) => {
    const resolved = resolve(id);
    if (resolved === END_ID) usesEnd = true;
    return resolved;
  };

  const start = byId.get(novel.start) ?? nodes[0];
  const ordered = start ? [start, ...nodes.filter((n) => n !== start)] : [];
  const events = [];

  for (const node of ordered) {
    if (isEmptyJump(node)) continue;
    const own = node.steps.map(stepEvent).filter(Boolean);
    const choices = node.ending === "choices" ? node.choices ?? [] : [];
    let jump = null;

    if (choices.length > 0) {
      for (const choice of choices) {
        own.push({ eventType: EVENT.choice, character: 0, onChoice: target(choice.to), text: choice.text ?? "", expressionType: 0 });
      }
      own.push({ eventType: EVENT.showChoices, character: 0, expressionType: 0 });
    } else if (node.ending === "next" && resolve(node.next) !== END_ID) {
      jump = resolve(node.next);
    } else {
      own.push({ eventType: EVENT.end, character: 0, expressionType: 0 });
    }

    own.forEach((event, i) => {
      const id = i === 0 ? node.id : `${node.id}#${i}`;
      const isLast = i === own.length - 1;
      const stops = event.eventType === EVENT.showChoices || event.eventType === EVENT.end;
      const nextId = stops ? undefined : isLast ? jump : `${node.id}#${i + 1}`;
      // id and nextId first, to keep the same key order as the original novels.json
      events.push({ id, ...(nextId ? { nextId } : {}), ...event });
    });
  }

  if (usesEnd || events.length === 0) {
    events.push({ id: END_ID, eventType: EVENT.end, character: 0, expressionType: 0 });
  }
  // The app starts at events[0]; an empty start node must not shift that.
  if (start && isEmptyJump(start)) {
    const first = events.findIndex((e) => e.id === resolve(start.id));
    events.unshift(...events.splice(first, 1));
  }

  return {
    name: novel.intro ? "Einstieg" : novel.name,
    title: novel.title ?? "",
    description: novel.description ?? "",
    context: novel.context ?? "",
    novelColor: novel.color ?? "#14305d",
    novelFrameColor: novel.frameColor ?? "#284673",
    ...(novel.intro ? { disablePauseMenu: true } : {}),
    novelEvents: events,
  };
}

// The novel played after the start button: the flagged one, else the first.
export function introOf(project) {
  const novels = project.novels ?? [];
  return novels.find((n) => n.intro) ?? novels[0];
}

export function compileProject(project) {
  const novels = project.novels ?? [];
  const intro = introOf(project) ?? { nodes: [], title: "" };
  const rest = novels.filter((n) => n !== intro);
  return {
    visualNovels: [
      compileNovel({ ...intro, intro: true }),
      ...rest.map((n) => compileNovel({ ...n, intro: false })),
    ],
  };
}

export function validateNovel(novel) {
  const warnings = [];
  const nodes = novel.nodes ?? [];
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const name = (n) => `"${n.label || n.id}"`;

  if (!byId.has(novel.start)) warnings.push("The novel has no start node.");

  for (const node of nodes) {
    if (node.ending === "choices") {
      if (!node.choices?.length) warnings.push(`Node ${name(node)} offers choices but has none; the novel ends there.`);
      for (const choice of node.choices ?? []) {
        if (!byId.has(choice.to)) warnings.push(`A choice in node ${name(node)} leads nowhere (target "${choice.to ?? ""}" is missing); the novel ends there.`);
        if (!choice.text?.trim()) warnings.push(`A choice in node ${name(node)} has no text.`);
      }
    } else if (node.ending === "next" && !byId.has(node.next)) {
      warnings.push(`Node ${name(node)} continues nowhere (target "${node.next ?? ""}" is missing); the novel ends there.`);
    }
  }

  // Reachability from the start node
  const reached = new Set();
  const queue = byId.has(novel.start) ? [novel.start] : [];
  while (queue.length) {
    const id = queue.pop();
    if (reached.has(id) || !byId.has(id)) continue;
    reached.add(id);
    const node = byId.get(id);
    if (node.ending === "choices") queue.push(...(node.choices ?? []).map((c) => c.to));
    if (node.ending === "next") queue.push(node.next);
  }
  for (const node of nodes) {
    if (byId.has(novel.start) && !reached.has(node.id)) warnings.push(`Node ${name(node)} can never be reached.`);
  }
  return warnings;
}

export function validateProject(project) {
  const warnings = [];
  const novels = project.novels ?? [];
  const intros = novels.filter((n) => n.intro).length;
  if (intros !== 1) warnings.push(`A project needs exactly one intro novel (found ${intros}).`);

  const seen = new Set();
  for (const novel of novels) {
    const key = novel.intro ? "Einstieg" : novel.name;
    if (!NAME_PATTERN.test(novel.name ?? "")) warnings.push(`Novel "${novel.title}" has an invalid name "${novel.name}".`);
    if (seen.has(key)) warnings.push(`The novel name "${key}" is used more than once.`);
    seen.add(key);
    warnings.push(...validateNovel(novel).map((w) => `${novel.title}: ${w}`));
  }
  return warnings;
}
