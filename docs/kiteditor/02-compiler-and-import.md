# Tasks 1–2: Compiler and KITE Importer

Read [README.md](README.md) and [01-project-format.md](01-project-format.md) first.

### Task 1: Novel compiler + validation

**Files:**
- Create: `editor/lib/compile.mjs`
- Test: `editor/test/compile.test.mjs`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `compileNovel(novel) → visualNovel` (compiled form, see format doc)
  - `compileProject(project) → { visualNovels: visualNovel[] }` — intro novel
    first; if no novel has `intro: true`, the first novel is treated as intro;
    if `novels` is empty, emits one intro novel with a single `endNovel` event
  - `validateNovel(novel) → string[]` — human-readable warnings, empty = fine
  - `validateProject(project) → string[]` — novel warnings prefixed with
    `"<title>: "`, plus duplicate / invalid `name` and intro-count warnings
  - `EVENT = { join: 2, exit: 3, say: 4, choice: 5, showChoices: 6, end: 10, sound: 11, bias: 16 }`

- [ ] **Step 1: Write failing tests** in `editor/test/compile.test.mjs`
  (`node:test`, `node:assert/strict`). Use the two-node example novel from the
  format doc as fixture `demo`.

  - `compiles steps, choices and end`: `compileNovel(demo).novelEvents` ids are
    exactly `["n1","n1#1","n1#2","n1#3","n1#4","n1#5","n1#6","n2"]`; types are
    `[2,4,11,16,3,5,6,10]`; event `n1#5` has `onChoice: "n2"` and
    `text: "Hallo Mama."`; every non-final step event's `nextId` is the next
    id; `n1#6` and `n2` have no `nextId`.
  - `maps novel fields`: result has `name: "Eltern"`, `novelColor: "#25650e"`,
    `novelFrameColor: "#4c9a30"`, no `disablePauseMenu`.
  - `intro novel is named Einstieg`: with `intro: true` → `name === "Einstieg"`
    and `disablePauseMenu === true`.
  - `start node is emitted first` even when it is not first in `nodes`.
  - `dangling target ends the novel`: choice `to: "missing"` → that choice's
    `onChoice` points at an emitted `endNovel` event; `validateNovel` returns a
    warning containing `"missing"`.
  - `node without ending ends the novel`: `ending: "next", next: null` → last
    event of that node is `endNovel`; `validateNovel` warns.
  - `empty next-node is skipped`: A(choice→B), B(no steps, next→C), C(say, end)
    → A's choice has `onChoice: "C"`, no event has id `"B"`.
  - `empty next-node cycle does not hang`: B(next→C), C(next→B), both empty →
    compiles; targets resolve to an `endNovel` event.
  - `unreachable node warns`: `validateNovel` mentions the node's label.
  - `choices ending with zero choices warns` and compiles to `endNovel`.
  - `compileProject always has exactly one Einstieg` for: no intro flag, two
    intro flags (second is compiled under its own name), empty `novels`.
  - `validateProject reports duplicate names` and names not matching
    `^[A-Za-z0-9_-]+$`.

- [ ] **Step 2:** Run `node --test editor/test/compile.test.mjs` → FAIL (module missing).

- [ ] **Step 3: Implement `editor/lib/compile.mjs`.**
  Approach: build `Map id → node`; `resolve(id)` follows empty `next` nodes
  with a visited set and returns a node id or the constant `"#end"`; if any
  target resolves to `"#end"`, append one shared event
  `{ id: "#end", eventType: 10, character: 0, expressionType: 0 }`.
  Non-speaking events use `character: 0, expressionType: 0`. Step → event
  fields: `say → text`, `sound → audioClipToPlay`, `bias → relevantBias`.
  Unknown step types are skipped.

- [ ] **Step 4:** Run tests → PASS.
- [ ] **Step 5:** Commit `feat(editor): novel compiler and validation`.

### Task 2: KITE importer + seed project

**Files:**
- Create: `editor/lib/import-kite.mjs`
- Create (generated): `editor/default-project.json`
- Test: `editor/test/import-kite.test.mjs`

**Interfaces:**
- Consumes: `compileNovel` from Task 1.
- Produces:
  - `decompileNovel(visualNovel) → novel` (editor format, with `x`/`y` layout)
  - `importKite(novelsJson) → project` — `version: 1`, `appName: "KITE"`,
    empty `images/colors/texts/content`, all novels; the one named `Einstieg`
    gets `intro: true`
  - `layoutNovel(novel)` — assigns `x = 40 + depth * 260`,
    `y = 40 + indexInDepth * 110` by BFS from `start`; unreachable nodes go to
    an extra column
  - CLI (`node editor/lib/import-kite.mjs`): reads
    `app/assets/json/novels.json`, writes `editor/default-project.json`

**Decompile algorithm.** A *head* is an event that starts a node: the first
event, every `onChoice` target, and every event that is the `nextId` of two or
more events. From each head walk `nextId`: non-choice events become steps
(`2→join, 3→exit, 4→say, 11→sound, 16→bias`); the walk stops at
- another head → `ending: "next"`, `next` = that head,
- `addChoice` → collect consecutive `addChoice` events as `choices` until
  `showChoices` → `ending: "choices"`,
- `endNovel` → `ending: "end"`,
- no `nextId` → `ending: "end"`.

Node `id` and `label` = the head event's id. `nextNodeNumber: 1`.

- [ ] **Step 1: Write failing tests.**
  - `round trip keeps every KITE novel playable identically`: for each novel in
    `app/assets/json/novels.json`, `compileNovel(decompileNovel(v))` is
    *walk-equivalent* to `v`: starting from both first events, in lockstep,
    events have equal `eventType, character, expressionType, text,
    audioClipToPlay, relevantBias`; choice lists have equal length and texts
    and their targets are compared recursively (memoise visited id pairs).
    `name` of the compiled intro is `Einstieg`; `title, description, context,
    novelColor, novelFrameColor` are equal.
  - `no node id contains #`.
  - `importKite marks exactly one intro`.
  - `layoutNovel gives every node finite x and y and no two nodes share a position`.
  - `default-project.json is up to date`: equals `importKite(novels.json)`.

- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement; run the CLI to generate `editor/default-project.json`.
- [ ] **Step 4:** Run `node --test editor/test/` → PASS.
- [ ] **Step 5:** Commit `feat(editor): import existing KITE novels as seed project`.
