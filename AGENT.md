# AGENT.md

## Project Context
This is a lightweight, web-based Visual Novel application. The project prioritizes speed, simplicity, and a clean UI/UX that matches the original Kite App design.

- Do not suggest or install any external libraries or frameworks. So only vanilla JavaScript.
- Use standard Custom Elements (`window.customElements.define`) for modular UI parts.
- The app should work in every browser and on every mobile phone.
- Use Tailwind CSS classes for all styling.
- After adding new Tailwind classes in JS or `app/index.html`, rebuild CSS: `npx @tailwindcss/cli -i ./style.css -o ./app/tailwind.css`. Utilities are scanned from `./app/index.html` and `./app/src/**/*.js` (`@source` in root `style.css`).
- Code Style: Use clean, readable JavaScript with simple English comments. (Using // instead of /*)

## Folder structure

- For the folder strucutre we are using four main files:
    - Top level folder (named ...-scene). All files should be in here.
        - ...-scene: Only one in every scene (in named exactly like the folder its in)
        - ...-service: Represents a non-class service which exports methods that should be seperated from the rest (named after what the service does exp: scroll-service)
        - ...-component: Represents a UI-Component which should be seperatet from the rest (named after what the component is exp: honeycomb-component)
        - ...-handler: Represents a class, which needs its own constructer and has its own methods.

## Editor (`editor/`)

KITEditor is the local white-label configurator around the app. Plan and format: `docs/kiteditor/`.

- No dependencies at all: Node standard library only, nothing added to `package.json`, no CDN.
- Node-side files are ES modules with `.mjs` (`editor/server.mjs`, `editor/lib/`). Browser files live in `editor/ui/` and follow the same naming rules as the app (`-component.js`, `-service.js`).
- The editor UI uses plain CSS (`editor/ui/editor.css`), NOT Tailwind. Do not add Tailwind classes to `app/` for editor features.
- Never build HTML from user text; use the `h()` helper in `editor/ui/src/dom-service.js`.
- White-labelling never edits `app/`: `editor/lib/overlay.mjs` replaces files/strings on the fly for preview and build. New configurable things go into `editor/lib/slots.mjs`.
- Two backends behind `editor/ui/src/api-service.js`: the local server (`editor/server.mjs`, project on disk) and the browser (`browser-backend-service.js` + `sw.js`, project in IndexedDB, build as zip). Shared logic must stay free of Node imports: `lib/compile.mjs`, `lib/overlay-core.mjs`, `lib/zip.mjs`. All UI URLs are relative (the site runs under a sub-path).
- Editing inside the preview (right-click a text, logo or novel; the “add novel” tile) lives in `editor/ui/src/preview-inspector-handler.js`. It works on the iframe from outside; do not add editor code to `app/`. Text and image edits change the running app in place; colors and backgrounds use `softReload()`, which returns to the same screen.
- Novels are stored in the editor's node format and compiled by `editor/lib/compile.mjs`. No Twee.
- Formatted content (links, wiki, legal texts, about KITE) is a rich text: an HTML string with only `p, h2, h3, br, b, i, u, a[href]`. The app renders it only through `app/src/shared-services/rich-text-service.js` (never `innerHTML` of raw JSON); the editor edits it with `<rich-text>` and cleans it with `editor/ui/src/rich-text-service.js`. Format and migration of older projects: `editor/lib/content-format.mjs`.
- Commands:
    - Start: `node editor/server.mjs` (http://127.0.0.1:4173)
    - Tests: `node --test editor/test/*.test.mjs`
    - Build without UI: `node editor/server.mjs --build`, play it with `node dist/serve.mjs`
    - Browser-only editor for static hosting (GitHub Pages): `node editor/server.mjs --site` writes `site/`
    - Regenerate the seed project after changing `app/assets/json/novels.json`: `node editor/lib/import-kite.mjs`
