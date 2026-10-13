# KITEditor Implementation Plan

> **For agentic workers:** implement task-by-task in the order below. Steps use
> checkbox (`- [ ]`) syntax for tracking. Read this file and
> [01-project-format.md](01-project-format.md) before any task; they define the
> names every task shares.

**Goal:** A local, dependency-free configurator that shows the real KITE app in
the middle of the screen, lets a non-programmer change logos, colors, texts and
novels around it, and builds a white-labelled copy of the KITE app.

**Architecture:** A zero-dependency Node server (`editor/server.mjs`) serves the
editor UI and a live **preview** of `app/`. The preview is the untouched app
plus an **overlay**: a pure function that, for a given file path, returns the
white-labelled bytes (compiled `novels.json`, replaced images, color/text
substitutions) or nothing. **Build** runs the same overlay over every app file
and writes `dist/`. One code path, so preview == build. Novels are authored in
the editor's own node format (no Twine/Twee) and compiled to the app's existing
event list.

**Tech Stack:** Node ≥ 20 standard library only (`node:http`, `node:fs`,
`node:path`, `node:test`). Browser: vanilla JS ES modules, Custom Elements,
plain CSS. No npm packages, no bundler, no framework.

**Spec:** [project-definition.md](project-definition.md) (sections 1, 3, 4).

## Global Constraints

- No dependencies: nothing may be added to `package.json`; no CDN URLs; no
  `npm install` needed to run editor, tests or build.
- Works offline. The server binds to `127.0.0.1` only.
- Editor UI uses plain CSS in `editor/public/editor.css` (not Tailwind — the
  Tailwind CLI is an npm dependency and is not installed).
- `app/` stays a working standalone KITE app. Do **not** add Tailwind classes
  to `app/` (the generated `app/tailwind.css` cannot be rebuilt offline).
  The only allowed app change is the `?novel=` preview hook (Task 4).
- Node-side files are ES modules with the `.mjs` extension. Browser files
  follow `AGENT.md`: Custom Elements, `-component.js` / `-service.js` suffixes,
  simple English `//` comments.
- Novels are never stored as Twee. The editor format in
  [01-project-format.md](01-project-format.md) is the single source of truth.
- The user's project lives in `editor/project/` (git-ignored). Build output
  goes to `dist/` (git-ignored).
- Editor UI language: English. App content language is whatever the user types.

## File Map

| Path | Responsibility |
|---|---|
| `editor/lib/compile.mjs` | `compileNovel`, `compileProject`, `validateNovel` — editor novel → app events |
| `editor/lib/import-kite.mjs` | `decompileNovel`, `importKite` — existing `novels.json` → editor novels; CLI writes `editor/default-project.json` |
| `editor/lib/slots.mjs` | `IMAGE_SLOTS`, `COLOR_SLOTS`, `textSlots()`, `CONTENT_FILES` — what is configurable and where it lives in `app/` |
| `editor/lib/overlay.mjs` | `resolveFile`, `extraPaths`, `build` — white-labelling of single files and whole build |
| `editor/lib/serve-static.mjs` | `sendFile`, standalone static server (copied into `dist/` as `serve.mjs`) |
| `editor/server.mjs` | HTTP routes: editor UI, `/preview/`, `/dist/`, `/api/*` |
| `editor/default-project.json` | Generated seed project = the real KITE app |
| `editor/public/index.html`, `editor.css` | Editor shell and styles |
| `editor/public/src/*.js` | Editor Custom Elements (see [04-editor-ui.md](04-editor-ui.md)) |
| `editor/test/*.test.mjs` | `node --test` suites |
| `app/src/scenes/loading-scene/loading-scene.js` | `?novel=` preview hook |

## Commands

| What | Command |
|---|---|
| Start editor | `node editor/server.mjs` → http://127.0.0.1:4173 |
| Tests | `node --test editor/test/` |
| Regenerate seed project | `node editor/lib/import-kite.mjs` |
| Build without UI | `node editor/server.mjs --build` |
| Play a build | `node dist/serve.mjs` → http://127.0.0.1:4174 |

## Tasks

| # | Task | Doc |
|---|---|---|
| 1 | Novel compiler + validation | [02-compiler-and-import.md](02-compiler-and-import.md) |
| 2 | KITE importer + seed project | [02-compiler-and-import.md](02-compiler-and-import.md) |
| 3 | Slots + overlay + build | [03-overlay-server-build.md](03-overlay-server-build.md) |
| 4 | Server + preview hook | [03-overlay-server-build.md](03-overlay-server-build.md) |
| 5 | Editor shell + branding panel | [04-editor-ui.md](04-editor-ui.md) |
| 6 | Novel list + novel editor (graph, node form) | [04-editor-ui.md](04-editor-ui.md) |
| 7 | Docs: `AGENT.md`, root `README.md` section | [04-editor-ui.md](04-editor-ui.md) |

Commit after every task.

## Review Focus

Inputs the spec implies but that are easy to miss. Each has a test in the
task that owns the code.

1. **Novel with a dangling or missing target** (choice points to a deleted
   node, node has no ending). The built app must not hang: the compiler ends
   the novel there and `validateNovel` reports it. (Task 1)
2. **Text containing quotes, backticks, `${`, `<` or newlines** typed into a
   text slot. It is substituted into JS source; it must not break the app or
   inject code. (Task 3)
3. **Path traversal** through `/preview/../..`, `/api/asset/../../x`. Must be
   rejected. (Task 4)
4. **App drift**: a text slot whose default string no longer exists in `app/`
   silently stops working. A test asserts every slot default is found. (Task 3)
5. **Project without an intro novel or with duplicate novel names**. The app
   hard-requires a novel named `Einstieg`; compile must always emit exactly
   one and `validateProject` must report duplicates. (Task 1)

## Explicitly Out Of Scope (first version)

- Custom character artwork (characters are picked from the existing KITE
  sprite sets), interactive background objects for new novels.
- Drag-to-connect edges in the graph (targets are chosen in a dropdown).
- Multi-project management, undo/redo, i18n of the editor UI.
- Packaging as a native executable / installer.
- AI feedback configuration (endpoint/passphrase stay as in `app/`).
