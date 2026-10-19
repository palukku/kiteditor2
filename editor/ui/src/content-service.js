import { h, changed } from "./dom-service.js";
import "./rich-text-component.js";

// Shared parts of the content editors (links, wiki, documents). They edit a
// copy of a content file; the copy goes into project.content on the first
// edit, so only opening an editor never creates an override.

export class ContentEditor extends HTMLElement {

  project = null;
  meta = null;
  item = null; // a GENERAL_ITEMS entry; item.content = { editor, path, key? }
  data = null;

  connectedCallback() {
    this.render();
  }

  get path() {
    return this.item.content.path;
  }

  // The content file as the project has it, or a copy of the app's original
  load() {
    this.data = this.project.content[this.path] ?? structuredClone(this.meta.content[this.path]);
  }

  // Stores the edited copy; the preview shows it right away
  edit() {
    this.project.content[this.path] = this.data;
    changed(this, "live");
  }

  // A change to the structure: save and redraw
  editAndRender() {
    this.edit();
    this.render();
  }

  reset() {
    if (!confirm(`Undo all changes to "${this.item.label}"?`)) return;
    const { key } = this.item.content;
    if (!key) delete this.project.content[this.path];
    else if (this.project.content[this.path]) this.project.content[this.path][key] = structuredClone(this.meta.content[this.path][key]);
    changed(this, "live");
    this.render();
  }

  // Heading of the editor with the reset button
  header() {
    return h("div", { class: "row content-head" },
      h("h3", { class: "grow" }, "Content"),
      h("button", { class: "small", onclick: () => this.reset() }, "Reset to original"),
    );
  }

  // Text input for object[key]
  textField(label, object, key, { multiline = false, oninput } = {}) {
    const props = {
      value: object[key] ?? "",
      oninput: (e) => {
        object[key] = e.target.value;
        oninput?.();
        this.edit();
      },
    };
    return h("label", { class: "field" },
      h("span", null, label),
      multiline ? h("textarea", { rows: 2, ...props }) : h("input", { type: "text", ...props }),
    );
  }

  // Rich text editor for object[key] (a div, not a label: a label would pass
  // clicks on to the first toolbar button)
  richField(label, object, key, headings = false) {
    return h("div", { class: "field" },
      h("span", null, label),
      h("rich-text", {
        value: object[key] ?? "",
        headings,
        "onrich-change": (e) => {
          object[key] = e.detail.html;
          this.edit();
        },
      }),
    );
  }
}
