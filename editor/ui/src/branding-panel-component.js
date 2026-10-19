import { h, changed } from "./dom-service.js";
import { uploadAsset } from "./api-service.js";
import "./links-editor-component.js";
import "./wiki-editor-component.js";
import "./document-editor-component.js";

// Right panel for one item of the "General" folder (see GENERAL_ITEMS in
// nav-tree-component.js): shows only the slots that item names.
class BrandingPanel extends HTMLElement {

  project = null;
  meta = null;
  item = null;
  thumbs = [];
  editors = new Map(); // item → its content editor, kept so open rows stay open

  connectedCallback() {
    this.render();
  }

  render() {
    if (!this.project || !this.item) return;
    const { item, meta } = this;
    const group = (title, children) => children.length > 0 && [h("h3", null, title), children];
    this.thumbs = [];
    const children = [
      h("h2", null, item.label),
      item.appName && this.renderApp(),
      group("Logos & backgrounds", meta.imageSlots.filter((slot) => item.images?.includes(slot.key)).map((slot) => this.renderImage(slot))),
      group("Colors", item.colors ? meta.colorSlots.map((slot) => this.renderColor(slot)) : []),
      group("Texts", item.texts ? meta.textSlots.filter((slot) => item.texts(slot.key)).map((slot) => this.renderText(slot)) : []),
      item.content && this.renderContent(item),
    ];
    this.replaceChildren(...children.flat(Infinity).filter(Boolean));
  }

  renderApp() {
    return h("label", { class: "field" },
      h("span", null, "App name (browser tab)"),
      h("input", { type: "text", value: this.project.appName ?? "", oninput: (e) => { this.project.appName = e.target.value; changed(this, true); } }),
    );
  }

  renderImage(slot) {
    const thumb = h("img", { class: "thumb", alt: "", src: `preview/${slot.path}?t=${Date.now()}` });
    this.thumbs.push({ thumb, slot });
    const upload = async (event) => {
      const file = event.target.files[0];
      if (!file) return;
      try {
        await uploadAsset(slot.key, file);
        this.project.images[slot.key] = slot.key;
        changed(this, true);
      } catch (error) {
        alert(`Upload failed: ${error.message}`);
      }
      event.target.value = "";
    };
    return h("div", { class: "slot" },
      thumb,
      h("div", { class: "slot-body" },
        h("span", null, slot.label),
        h("div", { class: "row" },
          h("input", { type: "file", accept: "image/*", onchange: upload }),
          h("button", { class: "small", onclick: () => { delete this.project.images[slot.key]; changed(this, true); } }, "Reset"),
        ),
      ),
    );
  }

  // Called by editor-main after each save: thumbnails show the saved project
  refreshThumbnails() {
    for (const { thumb, slot } of this.thumbs) thumb.src = `preview/${slot.path}?t=${Date.now()}`;
  }

  renderColor(slot) {
    const input = h("input", {
      type: "color",
      value: this.project.colors[slot.key] ?? slot.default,
      // "change" fires once when the picker closes; "input" would reload the preview on every drag step
      onchange: (e) => { this.project.colors[slot.key] = e.target.value; changed(this, true); },
    });
    return h("div", { class: "row color" },
      input,
      h("span", null, slot.label),
      h("button", { class: "small", onclick: () => { delete this.project.colors[slot.key]; input.value = slot.default; changed(this, true); } }, "Reset"),
    );
  }

  renderText(slot) {
    const rows = Math.min(6, Math.max(1, Math.ceil(slot.default.length / 38)));
    return h("label", { class: "field" },
      h("span", null, slot.label),
      h("textarea", {
        rows,
        placeholder: slot.default,
        value: this.project.texts[slot.key] ?? "",
        onchange: (e) => {
          if (e.target.value) this.project.texts[slot.key] = e.target.value;
          else delete this.project.texts[slot.key];
          changed(this, true);
        },
      }),
    );
  }

  // The content editor of the item (links, wiki or a text page)
  renderContent(item) {
    if (!this.editors.has(item)) {
      this.editors.set(item, h(item.content.editor, { project: this.project, meta: this.meta, item }));
    }
    return this.editors.get(item);
  }
}

customElements.define("branding-panel", BrandingPanel);
