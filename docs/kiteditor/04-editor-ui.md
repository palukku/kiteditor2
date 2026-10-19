# Tasks 5–7: Editor UI

Read [README.md](README.md) and [01-project-format.md](01-project-format.md)
first. The HTTP API is specified in
[03-overlay-server-build.md](03-overlay-server-build.md), Task 4.

All files live in `editor/ui/`. Vanilla ES modules, Custom Elements in
light DOM, plain CSS classes from `editor.css`. Never build HTML from user text
with string concatenation: set `textContent` / `value`.

## Layout

```
+--------------------------------------------------------------------------+
| KITEditor   [saved ✓]                    [↻ Restart preview] [Build app] |
+----------------+-------------------+-------------------------------------+
| ▾ General      |                   | Edit view of the selected item:     |
|   Start screen |   +-----------+   |                                     |
|   Links        |   |           |   | - General item: its logos, colors,  |
|   Wiki         |   | KITE app  |   |   texts and its content editor      |
|   Imprint …    |   | (iframe)  |   | - Novel: settings, node graph and   |
| ▾ Novels       |   |  1 : 2    |   |   the selected node                 |
|   ⠿ Novel 1 ↑↓ |   +-----------+   |                                     |
|   ＋ New novel |                   |                                     |
+----------------+-------------------+-------------------------------------+
```

The left column is `<nav-tree>` (`nav-tree-component.js`), like the file tree
of a code editor. Folders are only folders; a click on an item emits
`item-select` (General) or `novel-select` (novel), and `editor-main` shows
`<branding-panel>` with that `item` or `<novel-editor>` on the right.
`GENERAL_ITEMS` lists which image, color, text and content slots each General
item shows and the app scene the preview opens (`scene`); every slot belongs
to exactly one item. While a General item is selected the preview is
read-only (`PreviewInspector.readOnly`): taps, clicks and typing are swallowed,
scrolling, dragging, external links and right-click editing still work.
Selecting a novel starts it in the preview and makes it playable. Novels are
reordered by drag and drop or with ↑/↓.

## Content editors

A General item with `content: { editor, path, key? }` shows that editor
below its texts. All three extend `ContentEditor` (`content-service.js`): they
edit a copy of the content file that goes into `project.content` on the first
edit, so only opening one never creates an override. Every change shows in
the running preview right away (`preview: "live"`, see *Live preview*).
*Reset to original* removes the override (or that
`key` of it). `branding-panel` keeps one editor per item, so open rows stay
open while you switch items.

- `<links-editor>`: one row per link (⠿ drag, ↑ ↓ ✕); clicking a row opens
  it and closes the others. An open link has *Title*, *Content* (rich text),
  *Picture* (upload as asset `link-<id>`, fit: whole picture / fill) and the
  address opened by a click on the picture. The page title is the
  `links.title` text slot above it.
- `<wiki-editor>`: topics as rows like the links; an open topic has its title
  and its entries as a nested row list (one entry open at a time) with
  *Title* and *Content*. Rows of one list only drop into that list.
- `<document-editor>`: *Title* and *Content* (rich text with headings) for
  Imprint, Privacy, Terms of use and About KITE; Privacy also has the reset
  button texts.

Row lists come from `accordionList` / `sortableRow` in `reorder-service.js`
(the nav tree uses `sortableRow` too).

**`<rich-text>`** (`rich-text-component.js`, props `value`, `headings`): a
`contenteditable` area with *B*, *I*, *U*, *¶ / H2 / H3* (with `headings`)
and *Link*. Formatting uses `document.execCommand`. *Link* (or a click on a
link) opens a small form with link text and address (`www.x.de` becomes
`https://www.x.de`, an e-mail address `mailto:`) and *Remove link*. Pasting
inserts plain text. It emits `rich-change` (`detail.html`) while typing and
`rich-done` when it loses focus after a change. Loading and saving go through
`rich-text-service.js`, which rebuilds only the allowed tags with `h()` (see
[01-project-format.md](01-project-format.md#content-files)). Rich fields
(`desc`, `fullText`, `html`) are not offered for right-click editing in the
preview, so a plain edit cannot drop their formatting.

CSS grid `280px auto 1fr`, full viewport height. The phone iframe keeps
aspect ratio 1:2 at full available height. Warnings from the last save are
listed under the top bar.

## Editing inside the preview

`preview-inspector-handler.js` (`PreviewInspector`, created by `editor-main`)
attaches to the iframe document from outside on every load:

- **Right-click** builds a menu from what is under the pointer: a text whose
  content matches a text slot, a novel title/description, a dialogue line, an
  answer or a string in a content file (`findSource`); an `<img>` or CSS
  background that belongs to an image slot; a novel tile in the selection; the
  background of the novel being played.
- **Edit text** opens a text field over the text; typing changes the app's DOM
  immediately, Enter/blur saves, Escape reverts.
- **Novel selection** gets an extra “＋ Novelle hinzufügen” tile; tiles offer
  edit, rename, play, delete.
- Live updates: see *Live preview*; novel changes are pushed into the
  running app (`refreshNovels` sets `window.novelsCache` and redraws the
  selection) or use `softReload()`, which reloads and reopens the same scene.

## Live preview

Changes to General items never reload the preview
(`live-preview-handler.js`, `LivePreview`, owned by the inspector). It knows
what the running app was built from (`editor-main.saved` when the iframe
loaded) and patches the difference to the current project, ~100 ms after a
change and before the save:

- **Content files:** the iframe's `fetch()` answers them from the project in
  memory. A screen showing one (links, wiki, legal pages, about, consent) is
  built again hidden next to the old one and swapped in when its DOM is
  quiet, keeping scroll positions, open wiki topics and open `<details>`.
- **Texts:** the text nodes showing a text slot (as built, or as last set)
  get the new value; new screens are fixed in `decorate()`.
- **Colors:** a copy of `tailwind.css` replaces the stylesheet: selectors
  keep the built colors (the DOM classes use them), values get the new ones.
- **Images:** after the save (the server needs them), `<img>`, the browser
  icon and CSS `url()`s of replaced slots get `?v=<time>` (`image-change`
  event → `editor-main.pendingImages`).
- **App name:** `document.title`.

## Shared state contract

`<editor-main>` owns `this.project` and `this.meta`. Children receive them via
properties (`el.project`, `el.meta`, plus panel-specific ones) and call
`el.render()`. Children mutate the project object in place and then dispatch a
bubbling `project-change` event:

```js
new CustomEvent("project-change", { bubbles: true, detail: { preview: true } })
```

`detail.preview: true` → the preview iframe reloads after the save (novel
changes). `"live"` → shown in the running preview at once (General items,
see *Live preview*). `false`/absent → save only (novel editing; the user
presses ▶ Play).

`editor-main` debounces saves by 400 ms (`PUT /api/project`), shows
`saving… / saved ✓ / save failed`, and renders returned `warnings`.

### Task 5: Editor shell + branding panel

**Files:**
- Create: `editor/ui/index.html`, `editor/ui/editor.css`
- Create: `editor/ui/src/editor-main.js`, `api-service.js`,
  `branding-panel-component.js` (content editors: see *Content editors* above)

**Interfaces:**
- Produces (`api-service.js`): `getProject()`, `getMeta()`,
  `saveProject(project) → { warnings }`, `uploadAsset(name, file) → { name }`,
  `buildApp() → { files, dir }`, `assetUrl(name)`.
- Produces: `<editor-main>`, `<branding-panel>` (props `project`, `meta`).
- Preview control on `editor-main`: `reloadPreview(novelName?)` sets the iframe
  `src` to `/preview/index.html?t=<Date.now()>` plus `&novel=<name>` when given.

**Branding panel sections** (each a `<details>`):
1. **App** — `appName` text input.
2. **Logos & backgrounds** — per image slot: thumbnail
   (`/preview/<slot path>?t=…`), file input (`accept="image/*"`), *Reset*
   button (deletes `project.images[key]`). Upload name = slot key.
3. **Colors** — per color slot: `<input type="color">` (value = override or
   default), *Reset*.
4. **Texts** — per text slot: `<textarea>` with `placeholder` = default,
   value = override. Empty value deletes the key.
5. **Content** — the item's content editor (see *Content editors*).

All of them dispatch `project-change` with `preview: true`.

**Reset project button:** `confirmButton()` (`dom-service.js`): the first
click turns it red with a countdown (“Really reset everything? 5…”); only a
second click within those 5 seconds saves pending edits, calls
`resetProject()` (default project; uploads are kept) and reloads the editor.

**Build button:** saves pending changes, calls `buildApp()`, then shows
`Built <files> files → <dir>` and a link *Open built app* (`/dist/index.html`).

- [ ] **Step 1:** Create the files; run `node editor/server.mjs`.
- [ ] **Step 2: Verify in a browser** at http://127.0.0.1:4173:
  the KITE app runs in the middle; changing the *Dark surfaces* color and the
  start button text is visible after the automatic preview reload; uploading a
  logo replaces it on the start screen; *Reset* restores it; *Build app*
  reports success and *Open built app* shows the same result.
- [ ] **Step 3:** `node --test editor/test/*.test.mjs` still passes.
- [ ] **Step 4:** Commit `feat(editor): editor shell and branding panel`.

### Task 6: Novel list + novel editor

**Files:**
- Create: `editor/ui/src/novel-list-component.js`,
  `novel-editor-component.js`, `novel-graph-component.js`,
  `node-form-component.js`, `novel-model-service.js`
- Test: `editor/test/novel-model.test.mjs` (the service is DOM-free and is
  imported from Node)

**Interfaces:**
- Produces (`novel-model-service.js`, pure functions mutating the passed object):
  - `slugify(title, takenNames) → string` — ASCII, `ä→ae ö→oe ü→ue ß→ss`,
    other characters dropped, empty → `"novel"`, made unique with `-2`, `-3`…
  - `createNovel(project, title) → novel` — one start node `n1` with
    `ending: "end"`, `color: "#14305d"`, `frameColor: "#284673"`; pushed to
    `project.novels`
  - `deleteNovel(project, novel)` — no-op for the intro novel
  - `addNode(novel, nearNode?) → node` — id `"n" + nextNodeNumber++`, label
    `"New node"`, placed 260 px right of `nearNode` (or at 40/40),
    `ending: "end"`
  - `deleteNode(novel, node)` — no-op for the start node; clears every
    `choice.to` / `next` that pointed at it
  - `edgesOf(novel) → { from, to }[]` — only edges whose target exists
- Produces elements: `<novel-list>` (props `project`, `selected`; emits
  `novel-select` with `detail.novel`, and `novel-play`), `<novel-editor>`
  (props `novel`, `meta`), `<novel-graph>` (props `novel`, `selectedId`; emits
  `node-select` with `detail.id`), `<node-form>` (props `novel`, `node`, `meta`).

**Behaviour:**
- **Novel list** (left tab *Novels*): one row per novel — color dot, title,
  `intro` badge; click selects; *＋ New novel* asks for a title
  (`window.prompt`) and selects the result; *Delete* (with `confirm`) on
  non-intro rows; ↑/↓ reorder.
- **Novel editor header:** inputs for `title`, `description`, `context`,
  `color`, `frameColor`; background file input (upload name
  `bg-<novel.name>`) + *Reset*; *▶ Play* → `editorMain.reloadPreview(name)`
  where name is `"Einstieg"` for the intro novel.
- **Graph:** scrollable area; nodes are absolutely positioned boxes showing
  `label` and the first `say` text (max 60 chars); start node and end nodes
  are visually marked; SVG cubic curves from a node's right edge to the
  target's left edge, one per `edgesOf` entry. Pointer-drag moves a node
  (updates `x`/`y`, clamped ≥ 0, redraws edges live, `project-change` on
  release). Click selects. Buttons: *＋ Node*, *Delete node*, *Set as start*.
- **Node form:** `label` input; step list — each row: type badge, fields by
  type (`say`: character select, expression select, text textarea; `join`:
  character, expression; `sound`: clip select; `bias`: text input with
  `<datalist>` of `meta.biases`; `exit`: none), ↑ ↓ ✕; *add step* buttons per
  type. Ending: three radio buttons; `choices` → rows of text input + target
  select + ✕ and *＋ Choice*; `next` → target select. Every target select
  lists all nodes by label plus **“＋ new node…”**, which calls `addNode`,
  links it and selects it.

- [ ] **Step 1: Write failing tests** for `novel-model-service.js`:
  - `slugify("Büro & Größe!", []) === "Buero-Groesse"`; `slugify("", [])
    === "novel"`; `slugify("A", ["A","A-2"]) === "A-3"`.
  - `createNovel` result passes `validateNovel` with no warnings and compiles
    to a single `endNovel` event.
  - `addNode` yields unique ids across repeated calls and after deletions.
  - `deleteNode` clears references and refuses the start node.
  - `deleteNovel` refuses the intro novel.
  - `edgesOf` skips dangling targets.
- [ ] **Step 2:** Run → FAIL. **Step 3:** Implement service → PASS.
- [ ] **Step 4:** Implement the four components.
- [ ] **Step 5: Verify in a browser:** create a novel “Test”, add a `join`
  and a `say` step, add two choices each creating a new node, give those nodes
  a `say` step and `end`; press ▶ Play → the novel plays in the preview with
  both branches reachable; press *Build app* → novel is in the built app's
  selector. Open the imported “Kredit beantragen” novel → graph renders and
  stays responsive while dragging.
- [ ] **Step 6:** Commit `feat(editor): novel list and node-based novel editor`.

### Task 7: Documentation

**Files:**
- Modify: `AGENT.md` — add an “Editor (`editor/`)” section: no dependencies,
  plain CSS (not Tailwind), `.mjs` on the Node side, commands table, pointer
  to `docs/kiteditor/`.
- Modify: `README.md` — add a “KITEditor” section: what it is, the three
  commands (start, test, play a build).

- [ ] **Step 1:** Edit both files. **Step 2:** Commit `docs: KITEditor usage`.
