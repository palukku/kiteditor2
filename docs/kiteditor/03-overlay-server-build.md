# Tasks 3–4: Overlay, Build, Server

Read [README.md](README.md) and [01-project-format.md](01-project-format.md) first.

Paths called *rel* are relative to `app/` with forward slashes, e.g.
`assets/json/novels.json`.

### Task 3: Slots + overlay + build

**Files:**
- Create: `editor/lib/slots.mjs`, `editor/lib/overlay.mjs`, `editor/lib/serve-static.mjs`
- Test: `editor/test/overlay.test.mjs`
- Modify: `.gitignore` (add `editor/project/` and `dist/`)

**Interfaces:**
- Consumes: `compileProject` (Task 1).
- Produces (`slots.mjs`):
  - `APP_DIR` — absolute path of `app/`
  - `IMAGE_SLOTS: { key, label, path }[]`
  - `COLOR_SLOTS: { key, label, default }[]`
  - `textSlots(): { key, label, file, default }[]`
  - `CONTENT_FILES: { path, label }[]`
- Produces (`overlay.mjs`):
  - `resolveFile(project, projectDir, rel) → Buffer | string | null` —
    white-labelled content of one app file, `null` = serve the app file as is
  - `extraPaths(project) → string[]` — rels that exist only through the
    overlay (backgrounds of new novels)
  - `build(project, projectDir, outDir) → { files: number }`
  - `escapeForSource(text) → string`
- Produces (`serve-static.mjs`):
  - `sendFile(res, absPath, body?)` — content type by extension,
    `Cache-Control: no-store`, 404 when missing and no `body`
  - `safeJoin(root, urlPath) → string | null` — `null` when the result leaves `root`
  - Run directly: serves its own directory on `127.0.0.1:4174`

**Slot values (copy exactly):**

Image slots (`path` under `assets/Images/`):

| key | label | path |
|---|---|---|
| `logo.circle` | Logo (start screen) | `LoadingScreen/Kite_Logo_im_Kreis.png` |
| `logo.lettering` | Lettering (start screen) | `IconsAndLogos/Logo_Kite_Lettering_White.png` |
| `logo.sponsor` | Sponsor logo | `IconsAndLogos/Logo_Sponsor.png` |
| `logo.favicon` | Browser icon | `IconsAndLogos/Logo_Kite.png` |
| `bg.dark` | Dark background | `SceneBase/Background_Blue.png` |
| `bg.darkFlipped` | Dark background (start screen) | `SceneBase/Background_Blue_upside_down.png` |
| `bg.bright` | Bright background | `SceneBase/Background_Bright.png` |
| `bg.panorama` | Novel selector panorama | `FoundersBubble/Panorama.png` |
| `bg.landscape` | Novel selector landscape | `FoundersBubble/Panorama_Landschaft.png` |

Color slots:

| key | label | default |
|---|---|---|
| `dark` | Dark surfaces | `#0b1a2d` |
| `primary` | Primary text | `#14305d` |
| `heading` | Headings | `#284673` |
| `accent` | Accent / progress bar | `#f26522` |
| `bubblePlayer` | Player speech bubble | `#0c447f` |
| `bubbleNpc` | Character speech bubble | `#393a39` |
| `bubbleInfo` | Info speech bubble | `#0e7f90` |

Text slots: a hand-written list for short UI strings (start button, about
page title, consent checkbox texts, completion-scene texts) plus slots derived
at load time from every string literal inside `ABOUT_KITE_SECTIONS` in
`app/src/scenes/about-kite-scene/content-component.js`
(`about.<n>.heading`, `about.<n>.text`). Minimum hand-written slot:
`{ key: "start.button", file: "src/scenes/start-scene/start-scene.js", default: "STARTEN" }`.

Content files: `assets/json/legal-content.json` (Legal texts),
`assets/json/links-scene-content.json` (Links),
`assets/json/knowledge.json` (Knowledge base).

**Overlay rules** for `resolveFile`:

| rel | Result |
|---|---|
| `assets/json/novels.json` | `JSON.stringify(compileProject(project))` |
| in `CONTENT_FILES` and present in `project.content` | that JSON |
| `assets/json/image-paths.json` | app list + `extraPaths` |
| an image slot path with `project.images[key]` set | bytes of that project asset |
| `assets/Images/Background/<name>_BG.png` for a project novel | novel's `background` asset; else `null` if the app file exists; else bytes of the app's `Einstieg_BG.png` |
| `index.html` | text transform + `<title>` with escaped `appName` inserted after `<head>` |
| other `*.js`, `*.css`, `*.html` | text transform; `null` when nothing changed |
| anything else | `null` |

*Text transform:* (1) for each text slot with a non-empty override whose
`file === rel`: replace every occurrence of `default` with
`escapeForSource(override)`; (2) for each color slot with an override: replace
every case-insensitive occurrence of `default` with the override. Colors are
replaced in class names *and* in CSS selectors alike, which keeps Tailwind's
arbitrary-value classes (`bg-[#0b1a2d]`) consistent without rebuilding CSS.
Color overrides not matching `^#[0-9a-fA-F]{6}$` are ignored.

`escapeForSource`: every character of `\ " ' \` $ < > &` and every character
below U+0020 becomes `\uXXXX`. (Valid in JS string and template literals; a
slot is never inside raw HTML outside a JS file.)

**Build:** delete `outDir`, then for every file under `APP_DIR` and every
`extraPaths` entry write `resolveFile(...) ?? original bytes`; copy
`serve-static.mjs` to `outDir/serve.mjs`.

- [ ] **Step 1: Write failing tests** (`editor/test/overlay.test.mjs`); use
  `importKite` output as base project and `fs.mkdtempSync` dirs.
  - `every text slot default exists in its file` (Review Focus 4).
  - `every image slot path and content file exists in app/`.
  - `every color slot default occurs in app/tailwind.css` (case-insensitive).
  - `unchanged project: novels.json overlay is walk-equivalent JSON, tailwind.css resolves to null`.
  - `text override replaces the start button`: `texts["start.button"] = "GO"`
    → resolved `start-scene.js` contains `>GO<`-style occurrence of `GO` and
    no `STARTEN`.
  - `hostile text cannot break out`: override
    `` `</span>${alert(1)}"'\n `` → resolved source contains none of the raw
    characters `` ` `` + `${alert`, and `new Function`-free check: the resolved
    file still parses with `node --check` (write to temp `.mjs`, run
    `process.execPath --check`).
  - `color override rewrites css and js consistently`: `colors.primary = "#ff0000"`
    → resolved `tailwind.css` has no `#14305d` (any case) and contains
    `#ff0000`; resolved `settings-scene.js` contains `text-[#ff0000]`.
  - `invalid color is ignored`: `colors.primary = "red;}"` → `null`.
  - `image override returns the uploaded bytes`.
  - `new novel gets a background`: novel `name: "Neu"` without background →
    `resolveFile(.../Background/Neu_BG.png)` equals app `Einstieg_BG.png`
    bytes and `extraPaths` contains it; `image-paths.json` overlay lists it.
  - `index.html gets an escaped title`: `appName = "A<b>&"` →
    contains `<title>A&lt;b&gt;&amp;</title>`.
  - `build writes a complete app`: `outDir/index.html`, `outDir/serve.mjs`,
    `outDir/assets/json/novels.json` exist; file count ≥ app file count;
    overridden start button text present in `outDir`.
  - `safeJoin rejects traversal`: `safeJoin("/a/b", "../c")`,
    `"/..%2f"`-decoded `"../"`, and `"x/../../y"` → `null`; `"x/y.png"` → path.

- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement the three modules.
- [ ] **Step 4:** Run `node --test editor/test/` → PASS.
- [ ] **Step 5:** Commit `feat(editor): white-label overlay and build`.

### Task 4: Server + preview hook

**Files:**
- Create: `editor/server.mjs`
- Modify: `app/src/scenes/loading-scene/loading-scene.js` (`proceedToNextScene`)
- Test: `editor/test/server.test.mjs`

**Interfaces:**
- Consumes: everything from Task 3, `validateProject` (Task 1).
- Produces:
  - `createServer({ projectDir, distDir }) → http.Server` (exported; not
    listening). Running the file directly listens on `127.0.0.1:4173`
    (`PORT` env overrides); `--build` builds once and exits.
  - HTTP API (JSON unless noted):

| Route | Behaviour |
|---|---|
| `GET /` and `GET /<file>` | files from `editor/public/` |
| `GET /preview/<rel>` | `resolveFile(...)` or the app file |
| `GET /dist/<rel>` | file from `distDir` |
| `GET /api/project` | project JSON (seeded from default on first use) |
| `PUT /api/project` | body = project JSON (≤ 20 MB) → saved; `{ warnings: string[] }` |
| `POST /api/asset/<name>` | raw body (≤ 20 MB) → `projectDir/assets/<name>`; name must match `^[A-Za-z0-9._-]+$` and not start with `.`; `{ name }` |
| `GET /api/asset/<name>` | the uploaded file |
| `POST /api/build` | `{ files, dir }` |
| `GET /api/meta` | `{ imageSlots, colorSlots, textSlots, contentFiles, characters, expressions, sounds, biases, content }` |

  `meta.characters` = `characters` array of `character-info.json` without id 0;
  `expressions` = `[{ id, name }]` parsed from `face-expressions.txt`;
  `sounds` = base names in `AudioResources/`; `biases` = the text after `": "`
  on each line of `biases.txt`; `content` = map path → the app's original JSON
  for each content file.

  Errors: `400` invalid JSON / invalid name, `404` unknown, `413` body too
  large, all as `{ error }`. Paths are resolved with `safeJoin`.

**Preview hook** (the only app change): in `proceedToNextScene`, when
`new URLSearchParams(location.search).get("novel")` names an existing novel,
switch to `novel-scene` with `args: { novel, needBaseHeader: false }` instead
of the start/consent scene. Unknown name → normal flow.

- [ ] **Step 1: Write failing tests** (start `createServer` on port 0 with
  temp dirs, use global `fetch`).
  - `GET /api/project seeds from the default project` (has 9 novels).
  - `PUT then GET round-trips`, and PUT of a project with duplicate novel
    names returns a non-empty `warnings`.
  - `PUT with invalid JSON → 400`.
  - `preview serves compiled novels`: `/preview/assets/json/novels.json` has
    `visualNovels[0].name === "Einstieg"`.
  - `preview serves untouched app files`: `/preview/src/spa-main.js` equals the file.
  - `asset upload is visible in preview`: POST `/api/asset/logo.circle`, PUT
    project with `images["logo.circle"]`, GET the slot's preview path → same bytes.
  - `traversal is rejected`: raw request path `/preview/../package.json`
    (use `http.request` so the path is not normalised) and
    `/api/asset/..%2Fx` → 400 or 404, never file contents.
  - `build endpoint writes dist`: POST `/api/build` → `distDir/index.html`
    exists; `GET /dist/index.html` → 200.
  - `meta lists slots and characters`.

- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement server and the preview hook.
- [ ] **Step 4:** Run `node --test editor/test/` → PASS. Manually:
  `node editor/server.mjs`, open `/preview/index.html` → KITE app loads.
- [ ] **Step 5:** Commit `feat(editor): local server with live preview and build`.
