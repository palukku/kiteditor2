import { h, changed } from "./dom-service.js";
import { uploadAsset } from "./api-service.js";
import { createNovel, deleteNovel } from "./novel-model-service.js";

// Scenes that can be reopened after a preview reload without extra arguments
const RESTORABLE_SCENES = new Set(["novel-selector-scene", "settings-scene", "knowledge-scene", "archive-scene", "bookmarks-scene", "links-scene", "about-kite-scene", "legal-information-scene"]);
// Layout of the app's novel selection (novel-selector-scene.js / hex-component.js)
const HEX_X_STEP = 380;
const HEX_Y = [-288, -102];
const HEX_PATH = "M 96.5,0 L 209.5,0 Q 229.5,0 239.5,17.3 L 296,115.7 Q 306,133 296,150.3 L 239.5,248.7 Q 229.5,266 209.5,266 L 96.5,266 Q 76.5,266 66.5,248.7 L 10,150.3 Q 0,133 10,115.7 L 66.5,17.3 Q 76.5,0 96.5,0 Z";
const TEXT_PARENT_LEVELS = 4;

const norm = (text) => String(text ?? "").replace(/\s+/g, " ").trim();

// Finds the key path of a string inside a JSON value
function findPath(value, wanted, path = []) {
  if (typeof value === "string") return norm(value) === wanted ? path : null;
  if (!value || typeof value !== "object") return null;
  for (const key of Object.keys(value)) {
    const found = findPath(value[key], wanted, [...path, key]);
    if (found) return found;
  }
  return null;
}

// Edit-in-place for the preview: right-click anything in the app (a text, a
// logo, a novel) to change it there. Works from outside the iframe, so the
// app itself knows nothing about the editor.
export class PreviewInspector {

  constructor(editor) {
    this.editor = editor;
    this.restoreScene = null;
    this.menu = h("div", { class: "context-menu", hidden: true });
    this.filePicker = h("input", { type: "file", accept: "image/*", hidden: true });
    editor.append(this.menu, this.filePicker);

    document.addEventListener("pointerdown", (event) => { if (!this.menu.contains(event.target)) this.closeMenu(); });
    document.addEventListener("keydown", (event) => { if (event.key === "Escape") this.closeMenu(); });
    editor.preview.addEventListener("load", () => this.attach());
    this.attach();
  }

  get doc() {
    return this.editor.preview.contentDocument;
  }

  get project() {
    return this.editor.project;
  }

  get sceneManager() {
    return this.doc?.querySelector("scene-manager") ?? null;
  }

  get scene() {
    return this.sceneManager?.firstElementChild ?? null;
  }

  get introNovel() {
    return this.project.novels.find((n) => n.intro) ?? this.project.novels[0];
  }

  // The name a project novel has inside the app
  appName(novel) {
    return novel === this.introNovel ? "Einstieg" : novel.name;
  }

  novelByAppName(name) {
    return this.project.novels.find((novel) => this.appName(novel) === name) ?? null;
  }

  // Called for every document the iframe loads
  attach() {
    const doc = this.doc;
    if (!doc || doc.kiteditorAttached || !doc.documentElement) return;
    doc.kiteditorAttached = true;
    doc.addEventListener("contextmenu", (event) => this.onContextMenu(event), true);
    doc.addEventListener("pointerdown", () => this.closeMenu(), true);
    new MutationObserver(() => this.decorate()).observe(doc.documentElement, { childList: true, subtree: true });
    this.decorate();
  }

  // Runs whenever the app changes its DOM
  decorate() {
    const scene = this.scene;
    if (!scene) return;
    const tag = scene.tagName.toLowerCase();

    // After a reload, go back to where the user was once the app has started
    if (this.restoreScene && (tag === "start-scene" || tag === "terms-consent-scene")) {
      const target = this.restoreScene;
      this.restoreScene = null;
      this.sceneManager.dispatchEvent(new CustomEvent("sm-switch-scene", { detail: { scene: target } }));
      return;
    }

    // "Add novel" tile at the end of the novel selection
    const hexes = tag === "novel-selector-scene" && scene.querySelector("#novel-hexes");
    if (hexes && !hexes.querySelector(".kiteditor-add")) {
      const count = hexes.querySelectorAll("[data-id]").length;
      const add = this.doc.createElement("div");
      add.className = "kiteditor-add absolute flex items-center justify-center cursor-pointer";
      add.style.cssText = `left:${(count * HEX_X_STEP) / 10}cqw;top:${HEX_Y[count % 2] / 10 + 50}cqw;width:29.6cqw;height:26.6cqw`;
      add.innerHTML = `
        <svg viewBox="0 0 296 266" class="absolute inset-0 w-full h-full overflow-visible">
          <path d="${HEX_PATH}" fill="rgba(255,255,255,0.35)" stroke="#ffffff" stroke-width="8" stroke-dasharray="22 14" />
        </svg>
        <div class="relative text-center text-white text-[3.6cqw] pointer-events-none">＋ Novelle<br>hinzufügen</div>`;
      add.addEventListener("click", () => this.addNovel());
      hexes.append(add);
      // Let the selection scroll far enough to reach the new tile
      scene.lastHexPos = count * HEX_X_STEP;
    }
  }

  // ---------- reloading ----------

  // Reloads the app (needed for colors and backgrounds) and returns to the same place
  softReload() {
    const scene = this.scene;
    const tag = scene?.tagName.toLowerCase();
    if (tag === "novel-scene" && scene.novel?.name) return this.editor.reloadPreview(scene.novel.name);
    this.restoreScene = RESTORABLE_SCENES.has(tag) ? tag : null;
    this.editor.reloadPreview();
  }

  // Gives the running app the saved novels; redraws the novel selection if it is open
  async refreshNovels() {
    const win = this.editor.preview.contentWindow;
    const manager = this.sceneManager;
    if (!win || !manager) return;
    try {
      win.novelsCache = await (await fetch(`preview/assets/json/novels.json?t=${Date.now()}`)).json();
    } catch {
      return;
    }
    if (this.scene?.tagName.toLowerCase() === "novel-selector-scene" && this.sceneManager === manager) {
      manager.replaceChildren(this.doc.createElement("novel-selector-scene"));
    }
  }

  // Saves, then shows the result in panels and app
  async commit({ reload = false } = {}) {
    changed(this.editor, false);
    this.editor.refreshPanels();
    // The save itself hands the new novels to the running app (editor-main.save)
    await this.editor.flush();
    if (reload) this.softReload();
  }

  // ---------- context menu ----------

  closeMenu() {
    this.menu.hidden = true;
  }

  onContextMenu(event) {
    event.preventDefault();
    const items = this.itemsFor(event);
    if (items.length === 0) items.push(["Nothing to edit here", null]);
    this.menu.replaceChildren(...items.map(([label, action]) =>
      h("button", { disabled: !action, onclick: () => { this.closeMenu(); action(); } }, label),
    ));
    const frame = this.editor.preview.getBoundingClientRect();
    this.menu.hidden = false;
    this.menu.style.left = `${Math.min(frame.left + event.clientX, innerWidth - this.menu.offsetWidth - 8)}px`;
    this.menu.style.top = `${Math.min(frame.top + event.clientY, innerHeight - this.menu.offsetHeight - 8)}px`;
  }

  itemsFor(event) {
    const target = event.target.nodeType === 1 ? event.target : event.target.parentElement;
    const items = [];

    const text = this.textAt(target);
    if (text) {
      items.push([`Edit text (${text.source.label})`, () => this.editText(text)]);
      if (text.source.reset) items.push(["Reset text to original", () => this.applyText(text, text.source.reset)]);
    }

    const playing = target.closest("novel-scene");
    // While a novel plays, its own background covers the app background
    const image = this.imageAt(event.clientX, event.clientY) ?? (playing ? null : this.backgroundAt(target));
    if (image) {
      items.push([`Replace image (${image.slot.label})…`, () => this.pickImage(image)]);
      if (this.project.images[image.slot.key]) items.push(["Reset image to original", () => this.setImage(image, null)]);
    }

    const playedNovel = playing && this.novelByAppName(playing.novel?.name);
    if (playedNovel) {
      items.push(["Change background of this novel…", () => this.pickNovelBackground(playedNovel, playing)]);
      items.push(["Edit this novel", () => this.openNovel(playedNovel)]);
    }

    if (target.closest("novel-selector-scene")) {
      const hex = target.closest("[data-id], #InfoHex");
      const novel = hex && (hex.id === "InfoHex" ? this.introNovel : this.novelByAppName(hex.getAttribute("data-id")));
      if (novel) {
        items.push(["Edit this novel", () => this.openNovel(novel)]);
        items.push(["Rename this novel…", () => this.renameNovel(novel)]);
        items.push(["Play this novel", () => this.editor.reloadPreview(this.appName(novel))]);
        if (novel !== this.introNovel) items.push(["Delete this novel", () => this.removeNovel(novel)]);
      }
      items.push(["＋ Add a novel", () => this.addNovel()]);
    }
    return items;
  }

  // ---------- texts ----------

  // Where a text shown in the app comes from, with a way to change it
  findSource(shown) {
    const { project, meta } = this.editor;
    for (const slot of meta.textSlots) {
      if (norm(project.texts[slot.key] ?? slot.default) !== shown) continue;
      return {
        label: slot.label,
        reset: project.texts[slot.key] ? slot.default : null,
        set: (value) => {
          if (value && value !== slot.default) project.texts[slot.key] = value;
          else delete project.texts[slot.key];
        },
      };
    }
    // The novel on screen first: the same sentence may exist in several novels
    const playing = this.novelByAppName(this.scene?.novel?.name);
    const novels = [...project.novels].sort((a, b) => (b === playing) - (a === playing));
    for (const novel of novels) {
      for (const key of ["title", "description"]) {
        if (norm(novel[key]) === shown) return { label: `novel ${key}`, set: (value) => (novel[key] = value) };
      }
      for (const node of novel.nodes) {
        const step = node.steps.find((s) => s.type === "say" && norm(s.text) === shown);
        if (step) return { label: "dialogue", set: (value) => (step.text = value) };
        const choice = node.choices.find((c) => norm(c.text) === shown);
        if (choice) return { label: "answer", set: (value) => (choice.text = value) };
      }
    }
    for (const file of meta.contentFiles) {
      const path = findPath(project.content[file.path] ?? meta.content[file.path], shown);
      if (!path) continue;
      return {
        label: file.label,
        set: (value) => {
          let holder = (project.content[file.path] ??= structuredClone(meta.content[file.path]));
          for (const key of path.slice(0, -1)) holder = holder[key];
          holder[path.at(-1)] = value;
        },
      };
    }
    return null;
  }

  // The editable text at an element: the element itself or a close ancestor
  textAt(target) {
    let el = target;
    for (let level = 0; el && el.nodeType === 1 && level < TEXT_PARENT_LEVELS; level++, el = el.parentElement) {
      const shown = norm(el.textContent);
      const source = shown && this.findSource(shown);
      if (source) return { el, shown, source };
    }
    return null;
  }

  // Elements without child elements that show exactly this text
  leavesShowing(shown) {
    return [...this.doc.querySelectorAll("body *")].filter((el) => el.childElementCount === 0 && norm(el.textContent) === shown);
  }

  // Opens a text field on top of the text; typing changes the app immediately
  editText(text) {
    const leaves = this.leavesShowing(text.shown);
    const frame = this.editor.preview.getBoundingClientRect();
    const box = (leaves[0] ?? text.el).getBoundingClientRect();
    const width = Math.max(box.width, 220);
    const field = h("textarea", { class: "inline-edit", value: text.shown });
    field.style.cssText = `left:${Math.max(8, Math.min(frame.left + box.left, innerWidth - width - 8))}px;top:${frame.top + box.top}px;width:${width}px;height:${Math.max(box.height + 14, 56)}px`;
    const show = (value) => leaves.forEach((leaf) => (leaf.textContent = value));
    let done = false;
    const finish = (save) => {
      if (done) return;
      done = true;
      field.remove();
      if (save && norm(field.value) && field.value !== text.shown) return this.applyText(text, field.value, leaves);
      show(text.shown);
    };
    field.addEventListener("input", () => show(field.value));
    field.addEventListener("blur", () => finish(true));
    field.addEventListener("keydown", (event) => {
      if (event.key === "Escape") finish(false);
      if (event.key === "Enter" && !event.shiftKey) finish(true);
      event.stopPropagation();
    });
    this.editor.append(field);
    field.focus();
    field.select();
  }

  applyText(text, value, leaves = this.leavesShowing(text.shown)) {
    text.source.set(value);
    leaves.forEach((leaf) => (leaf.textContent = value));
    return this.commit();
  }

  // ---------- images ----------

  slotOfUrl(url) {
    let pathname;
    try {
      pathname = decodeURIComponent(new URL(url, this.doc.baseURI).pathname);
    } catch {
      return null;
    }
    return this.editor.meta.imageSlots.find((slot) => pathname.endsWith(`/${slot.path}`)) ?? null;
  }

  // Logos ignore the mouse in the app (pointer-events: none), so find them by position
  imageAt(x, y) {
    let best = null;
    for (const img of this.doc.images) {
      const box = img.getBoundingClientRect();
      const slot = x >= box.left && x <= box.right && y >= box.top && y <= box.bottom && this.slotOfUrl(img.src);
      if (slot && (!best || box.width * box.height < best.area)) best = { slot, area: box.width * box.height };
    }
    return best;
  }

  backgroundAt(target) {
    const view = this.doc.defaultView;
    for (let el = target; el && el.nodeType === 1; el = el.parentElement) {
      const url = view.getComputedStyle(el).backgroundImage.match(/url\("?([^")]+)"?\)/)?.[1];
      const slot = url && this.slotOfUrl(url);
      if (slot) return { slot, isBackground: true };
    }
    return null;
  }

  // Lets the user choose an image file; resolves with it (never when cancelled)
  chooseFile() {
    return new Promise((resolve) => {
      this.filePicker.value = "";
      this.filePicker.onchange = () => this.filePicker.files[0] && resolve(this.filePicker.files[0]);
      this.filePicker.click();
    });
  }

  async pickImage(image) {
    this.setImage(image, await this.chooseFile());
  }

  // file = null resets the slot to the app's original image
  async setImage({ slot, isBackground }, file) {
    try {
      if (file) {
        await uploadAsset(slot.key, file);
        this.project.images[slot.key] = slot.key;
      } else {
        delete this.project.images[slot.key];
      }
    } catch (error) {
      return alert(`Upload failed: ${error.message}`);
    }
    // Backgrounds come from the style sheet, so they need a reload; <img> can be swapped in place
    await this.commit({ reload: isBackground });
    this.editor.branding.refreshThumbnails();
    if (isBackground) return;
    for (const img of this.doc.images) {
      if (this.slotOfUrl(img.src) === slot) img.src = `${slot.path}?t=${Date.now()}`;
    }
  }

  async pickNovelBackground(novel, novelScene) {
    const file = await this.chooseFile();
    try {
      novel.background = (await uploadAsset(`bg-${novel.name}`, file)).name;
    } catch (error) {
      return alert(`Upload failed: ${error.message}`);
    }
    await this.commit();
    const background = novelScene.querySelector("#background");
    if (background) background.style.backgroundImage = `url(assets/Images/Background/${this.appName(novel)}_BG.png?t=${Date.now()})`;
  }

  // ---------- novels ----------

  openNovel(novel) {
    this.editor.selectNovel(novel);
  }

  addNovel() {
    const title = prompt("Title of the new novel:");
    if (!title?.trim()) return;
    this.openNovel(createNovel(this.project, title.trim()));
    return this.commit();
  }

  renameNovel(novel) {
    const title = prompt("Title of the novel:", novel.title);
    if (!title?.trim()) return;
    novel.title = title.trim();
    return this.commit();
  }

  removeNovel(novel) {
    if (!confirm(`Delete the novel "${novel.title}"? This cannot be undone.`)) return;
    deleteNovel(this.project, novel);
    if (this.editor.selectedNovel === novel) this.editor.selectNovel(this.project.novels[0] ?? null);
    return this.commit();
  }
}
