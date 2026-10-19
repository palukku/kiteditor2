# Project Format

One project = `editor/project/project.json` plus uploaded files in
`editor/project/assets/`. If `project.json` does not exist, the server copies
`editor/default-project.json` there on first start.

## `project.json`

```json
{
  "version": 1,
  "appName": "KITE",
  "images": { "logo.circle": "logo.circle" },
  "colors": { "dark": "#102030" },
  "texts":  { "start.button": "LOS GEHT'S" },
  "content": { "assets/json/links-scene-content.json": [ ] },
  "novels": [ ]
}
```

| Field | Meaning |
|---|---|
| `appName` | Browser tab title of the built app |
| `images` | image slot key → file name inside `editor/project/assets/`. Missing key = app default |
| `colors` | color slot key → `#rrggbb`. Missing key = app default |
| `texts` | text slot key → replacement string. Missing or empty = app default |
| `content` | app-relative JSON path → full replacement JSON value. Only paths in `CONTENT_FILES` are honoured. Shapes: see *Content files* below |
| `novels` | array of editor novels (below). Order = order in the app's novel selector |

Slot keys are defined in `editor/lib/slots.mjs` (Task 3).

## Content files

The editable pages of the app. Fields marked *rich* hold a **rich text**: an
HTML string with only `p`, `h2`, `h3`, `br`, `b`, `i`, `u` and `a[href]`
(`http(s):`, `mailto:`, `tel:`). The app renders it with
`app/src/shared-services/rich-text-service.js`, which drops everything else
and keeps its text; the editor edits it with `<rich-text>`.

| File | Shape |
|---|---|
| `assets/json/links-scene-content.json` | `[{ title, desc (rich), imgSrc, url, imgStyle: "object-contain" \| "object-cover" }]` |
| `assets/json/knowledge.json` | `[{ title, items: [{ title, fullText (rich) }] }]` (topics with entries) |
| `assets/json/legal-content.json` | `{ impressum, datenschutz, nutzungsbedingungen }`, each `{ title, html (rich) }`; `datenschutz` also has `toolbar: { resetLabel, infoText }` |
| `assets/json/about-kite-content.json` | `{ title, html (rich) }` |

A picture uploaded for a link is stored as project asset `link-<id>` and
referenced as `imgSrc: "assets/Images/Uploads/link-<id>.png"`; the overlay
serves and builds it.

Older projects (plain-text descriptions, legal `sections`, wiki `sourceUrl`,
`about.*` text slots) are converted on load by `migrateProject` in
`editor/lib/content-format.mjs`.

## Editor novel

```json
{
  "name": "Eltern",
  "intro": false,
  "title": "Eltern informieren",
  "description": "Shown in the selector bubble",
  "context": "Scenario description used for the AI feedback prompt",
  "color": "#25650e",
  "frameColor": "#4c9a30",
  "background": null,
  "start": "n1",
  "nextNodeNumber": 3,
  "nodes": [
    {
      "id": "n1",
      "label": "Greeting",
      "x": 40, "y": 40,
      "steps": [
        { "type": "join",  "character": 8, "expression": 10 },
        { "type": "say",   "character": 8, "expression": 9, "text": "Hallo!" },
        { "type": "sound", "clip": "TelephoneCall" },
        { "type": "bias",  "bias": "Tightrope Bias" },
        { "type": "exit" }
      ],
      "ending": "choices",
      "choices": [ { "text": "Hallo Mama.", "to": "n2" } ],
      "next": null
    },
    { "id": "n2", "label": "Bye", "x": 300, "y": 40, "steps": [], "ending": "end", "choices": [], "next": null }
  ]
}
```

| Field | Rules |
|---|---|
| `name` | Stable key used by the app (file names, bookmarks, archive). Matches `^[A-Za-z0-9_-]+$`, unique in the project. Generated from the title on creation, never edited afterwards |
| `intro` | Exactly one novel has `true`. It is compiled with `name: "Einstieg"` and `disablePauseMenu: true`, is played after the start button, and cannot be deleted |
| `background` | File name in `editor/project/assets/` or `null` (then the app's `<name>_BG.png` if it exists, else the intro background) |
| `start` | `id` of the first node |
| `nextNodeNumber` | Counter for new node ids (`"n" + number`) |
| node `id` | Unique per novel, immutable, must not contain `#` |
| node `label` | Free text shown in the graph; never referenced |
| node `ending` | `"choices"` (use `choices`), `"next"` (jump to `next`), or `"end"` (novel ends) |
| step `character` | Numeric id from `app/assets/json/character-info.json`. `1` = player bubble, `4` = info/narrator bubble, others = NPC with sprite |
| step `expression` | Numeric id from `app/assets/mappings/face-expressions.txt` |
| step `clip` | File base name from `app/assets/AudioResources/` (no extension) |
| step `bias` | Free text; marks the dialogue for AI feedback |

## Compiled form (what the app reads)

`app/assets/json/novels.json` → `{ "visualNovels": [ { name, title,
description, context, novelColor, novelFrameColor, disablePauseMenu,
novelEvents: [...] } ] }`.

Event: `{ id, nextId?, eventType, character, expressionType, text?, onChoice?,
audioClipToPlay?, relevantBias? }`. Event types come from
`app/assets/mappings/event-types.json`:
`characterJoin 2, characterExit 3, showMessage 4, addChoice 5, showChoices 6,
endNovel 10, playSound 11, markBias 16`.

The app starts a novel at `novelEvents[0]`, follows `nextId`, collects
`addChoice` events until `showChoices`, then jumps to the picked choice's
`onChoice` id. `endNovel` finishes the novel.

### Event ids produced by the compiler

For node `N` the emitted events are, in order: one per step, then per
ending:

| Ending | Events |
|---|---|
| `choices` | one `addChoice` per choice (`onChoice` = target node id), then one `showChoices` |
| `next` | nothing; the last step's `nextId` = `next` |
| `end` | one `endNovel` |

The **first** emitted event of the node gets `id = N.id`. Later ones get
`N.id + "#" + index` (index = position in the node's emitted list, starting
at 1). So every node that emits events is a valid jump target by its id.

A node with zero steps and `ending: "next"` emits nothing (the app has no
no-op event). The compiler resolves jumps *through* such nodes: anything
pointing at it points at its `next` instead, followed transitively and
cycle-safe. A target that cannot be resolved (missing node, cycle of empty
nodes, `next: null`) points at one shared `endNovel` event with id `#end`.
