// Shows changes to the General items in the running preview without
// reloading it (novels still reload). Works on the iframe from outside:
// - content files: the app's fetch() is answered from the project in memory,
//   and the screen showing them is redrawn in place (scroll position and open
//   sections are kept);
// - texts: the text nodes showing a text slot are changed;
// - colors and CSS backgrounds: the style sheet is replaced by a copy with
//   the new colors and fresh image URLs;
// - images (after the save, when the server has them): <img> URLs get a new
//   version so the browser loads them again;
// - app name: the document title.

const UPDATE_DELAY_MS = 100;
// A redrawn screen is shown once its DOM has been quiet this long (or after the timeout)
const QUIET_MS = 60;
const SWAP_TIMEOUT_MS = 1000;
const COLOR = /^#[0-9a-fA-F]{6}$/;
// Screens that show content files (see GENERAL_ITEMS in nav-tree-component.js)
const CONTENT_SCENES = new Set(["links-scene", "knowledge-scene", "imprint-scene", "dataprivacy-scene", "tos-scene", "about-kite-scene", "terms-consent-scene"]);

const norm = (text) => String(text ?? "").replace(/\s+/g, " ").trim();

export class LivePreview {

  constructor(editor, inspector) {
    this.editor = editor;
    this.inspector = inspector;
    this.timer = null;
    this.versions = {}; // image slot key → version, for slots replaced since the preview loaded
    this.swap = null; // promise of a running redraw
    this.redrawAgain = false;
  }

  get doc() {
    return this.editor.preview.contentDocument;
  }

  get meta() {
    return this.editor.meta;
  }

  get project() {
    return this.editor.project;
  }

  // Called by the inspector for every document the iframe loads
  attach(doc) {
    // The app was served from the saved project: that is what it shows now
    this.loaded = structuredClone(this.editor.saved);
    this.renderedContent = JSON.stringify(this.loaded.content ?? {});
    this.textNodes = new Map(); // text slot key → text nodes showing it
    this.shownTexts = new Map(); // text slot key → the value last put into them
    this.versions = {};
    this.css = null;
    const win = doc.defaultView;
    // The iframe starts with about:blank before the app loads
    if (!win || !/^https?:$/.test(win.location.protocol)) return;
    this.patchFetch(win);
    const link = doc.querySelector('link[rel="stylesheet"][href*="tailwind.css"]');
    if (link) {
      this.originalFetch(link.href)
        .then((response) => response.text())
        .then((text) => {
          if (this.doc !== doc) return;
          this.css = { link, text };
          this.update();
        })
        .catch(() => {});
    }
    this.update();
  }

  // Content files come from the project in memory, so edits show before they are saved
  patchFetch(win) {
    const original = win.fetch.bind(win);
    this.originalFetch = original;
    const base = new URL(".", win.location.href);
    win.fetch = (input, init) => {
      const url = new URL(input instanceof win.Request ? input.url : String(input), win.location.href);
      const rel = url.href.startsWith(base.href) ? decodeURIComponent(url.pathname.slice(base.pathname.length)) : null;
      if (!rel || !this.meta.contentFiles.some((file) => file.path === rel)) return original(input, init);
      const content = this.project.content[rel] ?? this.meta.content[rel];
      return Promise.resolve(new win.Response(JSON.stringify(content), { headers: { "Content-Type": "application/json" } }));
    };
  }

  // Shows the current project in the preview (shortly, so typing stays smooth)
  update() {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.apply(), UPDATE_DELAY_MS);
  }

  apply() {
    const doc = this.doc;
    if (!doc?.body || !this.loaded) return;
    doc.title = String(this.project.appName ?? "");
    this.updateTexts();
    this.updateStyles();
    this.updateContent();
  }

  // Called by the inspector whenever the app changes its DOM
  decorate() {
    if (!this.loaded || !this.doc?.body) return;
    this.updateTexts();
    this.updateImages();
  }

  // Resolves when no redraw is running (the app must not switch screens during one)
  whenIdle() {
    return this.swap ?? Promise.resolve();
  }

  // ---------- texts ----------

  updateTexts() {
    const slots = this.meta.textSlots
      .map((slot) => ({
        key: slot.key,
        loaded: norm(this.loaded.texts?.[slot.key] || slot.default),
        current: this.project.texts[slot.key] || slot.default,
      }))
      .filter((slot) => slot.loaded !== norm(slot.current) || this.textNodes.has(slot.key));
    if (slots.length === 0) return;
    // Text nodes showing a slot as the app was built (new screens) or as last set here
    const walker = this.doc.createTreeWalker(this.doc.body, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const text = norm(node.data);
      const slot = text && slots.find((s) => text === s.loaded || text === this.shownTexts.get(s.key));
      if (!slot) continue;
      if (!this.textNodes.has(slot.key)) this.textNodes.set(slot.key, new Set());
      this.textNodes.get(slot.key).add(node);
    }
    for (const slot of slots) {
      const nodes = this.textNodes.get(slot.key) ?? new Set();
      for (const node of nodes) {
        if (!node.isConnected) nodes.delete(node);
        else if (node.data !== slot.current) node.data = slot.current;
      }
      this.shownTexts.set(slot.key, norm(slot.current));
    }
  }

  // ---------- colors and images ----------

  // Rewrites the style sheet: class names stay as the app was built (the DOM
  // uses them), declared colors become the current ones. Tailwind escapes the
  // "#" in class selectors ("\#0b1a2d"), so only values match (?<!\\)#.
  updateStyles() {
    if (!this.css) return;
    const swaps = new Map();
    for (const slot of this.meta.colorSlots) {
      const loaded = this.loaded.colors?.[slot.key];
      const current = this.project.colors[slot.key];
      const from = COLOR.test(loaded ?? "") ? loaded : slot.default;
      const to = COLOR.test(current ?? "") ? current : slot.default;
      if (from.toLowerCase() !== to.toLowerCase()) swaps.set(from.slice(1).toLowerCase(), to.toLowerCase());
    }
    let text = this.css.text;
    if (swaps.size > 0) {
      text = text.replace(new RegExp(`(?<!\\\\)#(${[...swaps.keys()].join("|")})(?![0-9a-f])`, "gi"), (_, hex) => swaps.get(hex.toLowerCase()));
    }
    for (const [key, version] of Object.entries(this.versions)) {
      const slot = this.meta.imageSlots.find((s) => s.key === key);
      if (slot) text = text.replaceAll(`url(${slot.path})`, `url(${slot.path}?v=${version})`);
    }
    const doc = this.doc;
    let style = doc.getElementById("kiteditor-live-css");
    const changed = text !== this.css.text;
    if (changed) {
      if (!style) {
        style = doc.createElement("style");
        style.id = "kiteditor-live-css";
        doc.head.append(style);
      }
      if (style.textContent !== text) style.textContent = text;
    } else {
      style?.remove();
    }
    this.css.link.disabled = changed;
  }

  // Called after a save that replaced images: the browser must load them again
  refreshImages(keys) {
    if (!this.loaded) return;
    for (const key of keys) this.versions[key] = Date.now();
    this.updateImages();
    this.updateStyles();
  }

  // <img> elements and the browser icon of replaced slots get the new version
  updateImages() {
    if (Object.keys(this.versions).length === 0) return;
    for (const el of this.doc.querySelectorAll("img, link[rel~='icon']")) {
      const attribute = el.localName === "img" ? "src" : "href";
      const slot = this.inspector.slotOfUrl(el[attribute]);
      const version = slot && this.versions[slot.key];
      if (!version) continue;
      const url = `${slot.path}?v=${version}`;
      if (el.getAttribute(attribute) !== url) el.setAttribute(attribute, url);
    }
  }

  // ---------- content ----------

  updateContent() {
    const content = JSON.stringify(this.project.content);
    if (content === this.renderedContent) return;
    this.renderedContent = content;
    this.redraw();
  }

  // Builds the current screen again next to the old one (hidden) and swaps
  // them once it is ready, so there is no flicker
  async redraw() {
    const manager = this.inspector.sceneManager;
    const old = this.inspector.scene;
    const tag = old?.tagName.toLowerCase();
    if (!manager || !CONTENT_SCENES.has(tag)) return;
    if (this.swap) {
      this.redrawAgain = true;
      return;
    }
    let done;
    this.swap = new Promise((resolve) => (done = resolve));
    try {
      const scrolls = [...old.querySelectorAll("[id]")].filter((el) => el.scrollTop > 0).map((el) => [el.id, el.scrollTop]);
      const openButtons = this.openAccordionButtons(old);
      const openDetails = [...old.querySelectorAll("details")].map((el) => el.open);

      const next = this.doc.createElement(tag);
      next.args = old.args;
      next.style.cssText = "position:absolute;inset:0;visibility:hidden;pointer-events:none";
      manager.append(next);
      await this.settled(next);
      if (!old.isConnected || old.parentElement !== manager) {
        next.remove();
        return;
      }

      // Open the same sections again (the knowledge topics toggle on a click)
      const buttons = [...next.querySelectorAll("accordion-element button")];
      this.inspector.passClicks(() => openButtons.forEach((index) => buttons[index]?.click()));
      next.querySelectorAll("details").forEach((el, index) => (el.open = !!openDetails[index]));
      for (const [id, top] of scrolls) {
        const el = next.querySelector(`#${CSS.escape(id)}`);
        if (el) el.scrollTop = top;
      }
      next.style.cssText = "";
      old.remove();
    } finally {
      this.swap = null;
      done();
      if (this.redrawAgain) {
        this.redrawAgain = false;
        this.redraw();
      }
    }
  }

  // Indexes of the knowledge topic buttons whose entries are open
  openAccordionButtons(scene) {
    return [...scene.querySelectorAll("accordion-element button")]
      .map((button, index) => (button.nextElementSibling && !button.nextElementSibling.classList.contains("hidden") ? index : -1))
      .filter((index) => index >= 0);
  }

  // Resolves once the new screen has content and its DOM stopped changing
  settled(el) {
    return new Promise((resolve) => {
      let quiet = null;
      const finish = () => {
        observer.disconnect();
        clearTimeout(quiet);
        clearTimeout(timeout);
        resolve();
      };
      const wait = () => {
        clearTimeout(quiet);
        quiet = setTimeout(() => el.childElementCount > 0 && finish(), QUIET_MS);
      };
      const observer = new MutationObserver(wait);
      observer.observe(el, { childList: true, subtree: true, attributes: true });
      const timeout = setTimeout(finish, SWAP_TIMEOUT_MS);
      wait();
    });
  }
}
