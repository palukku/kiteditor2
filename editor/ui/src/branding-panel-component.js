import { h, changed } from "./dom-service.js";
import { uploadAsset } from "./api-service.js";
import "./json-form-component.js";

// Left panel: app name, logos, colors, texts and content files.
// Every change reloads the preview.
class BrandingPanel extends HTMLElement {

  project = null;
  meta = null;
  thumbs = [];

  connectedCallback() {
    this.render();
  }

  render() {
    if (!this.project) return;
    this.thumbs = [];
    this.replaceChildren(
      this.section("App", true, this.renderApp()),
      this.section("Logos & backgrounds", true, this.meta.imageSlots.map((slot) => this.renderImage(slot))),
      this.section("Colors", false, this.meta.colorSlots.map((slot) => this.renderColor(slot))),
      this.section("Texts", false, this.meta.textSlots.map((slot) => this.renderText(slot))),
      this.section("Content pages", false, this.meta.contentFiles.map((file) => this.renderContent(file))),
    );
  }

  section(title, open, children) {
    return h("details", { class: "section", open }, h("summary", null, title), children);
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

  renderContent(file) {
    const form = h("json-form");
    // Rendered on first open only: these files are large
    const load = () => {
      form.value = this.project.content[file.path] ?? structuredClone(this.meta.content[file.path]);
      form.render();
    };
    form.addEventListener("json-change", () => {
      this.project.content[file.path] = form.value;
      changed(this, false);
    });
    return h("details", { class: "subsection", ontoggle: (e) => e.target.open && !form.value && load() },
      h("summary", null, file.label),
      h("div", { class: "row" },
        h("button", { class: "small", onclick: () => { delete this.project.content[file.path]; load(); changed(this, true); } }, "Reset to original"),
        h("button", { class: "small", onclick: () => changed(this, true) }, "Show in preview"),
      ),
      form,
    );
  }
}

customElements.define("branding-panel", BrandingPanel);
