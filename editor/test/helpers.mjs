import assert from "node:assert/strict";

// Plays events like the app does, from startId up to the next choice
// block or the end. Returns what the player would see.
function run(events, startId) {
  const byId = new Map(events.map((e) => [e.id, e]));
  const trace = [];
  let choices = [];
  let current = byId.get(startId);
  for (let guard = 0; guard < 100000; guard++) {
    if (!current) return { trace, choices: null, stop: "dead" };
    if (current.eventType === 10) return { trace, choices: null, stop: "end" };
    if (current.eventType === 6) return { trace, choices, stop: "choices" };
    if (current.eventType === 5) {
      choices.push(current);
    } else {
      if (current.eventType === 4) choices = [];
      trace.push([current.eventType, current.character, current.expressionType, current.text, current.audioClipToPlay, current.relevantBias]);
    }
    current = byId.get(current.nextId);
  }
  throw new Error("event loop without choice or end");
}

// Asserts that two compiled novels play identically on every path.
export function assertWalkEquivalent(a, b) {
  const seen = new Set();
  const queue = [[a.novelEvents[0].id, b.novelEvents[0].id]];
  while (queue.length) {
    const [idA, idB] = queue.pop();
    const key = `${idA}\u0000${idB}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const ra = run(a.novelEvents, idA);
    const rb = run(b.novelEvents, idB);
    assert.deepEqual(rb.trace, ra.trace, `${a.name}: trace from ${idA}`);
    assert.equal(rb.stop, ra.stop, `${a.name}: stop from ${idA}`);
    if (ra.choices) {
      assert.deepEqual(rb.choices.map((c) => c.text), ra.choices.map((c) => c.text), `${a.name}: choices at ${idA}`);
      ra.choices.forEach((c, i) => queue.push([c.onChoice, rb.choices[i].onChoice]));
    }
  }
  return seen.size;
}
