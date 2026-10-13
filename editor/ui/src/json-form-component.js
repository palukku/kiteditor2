import { h, emit } from "./dom-service.js";

// Deep copy with every string emptied; used as the template for new list items
function blankCopy(value) {
  if (typeof value === "string") return "";
  if (Array.isArray(value)) return value.map(blankCopy);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, blankCopy(v)]));
  return value;
}

// Generic form for any JSON value. Edits the value in place and emits
// "json-change". Set .value, then call render().
class JsonForm extends HTMLElement {

  value = null;

  connectedCallback() {
    this.render();
  }

  render() {
    if (this.value == null) return this.replaceChildren();
    this.replaceChildren(this.renderContainer(this.value));
  }

  // Renders the field for parent[key]
  renderField(parent, key) {
    const value = parent[key];
    const set = (next) => {
      parent[key] = next;
      emit(this, "json-change");
    };
    if (typeof value === "string") {
      const rows = Math.min(8, Math.max(1, Math.ceil(value.length / 38)));
      return h("textarea", { value, rows, oninput: (e) => set(e.target.value) });
    }
    if (typeof value === "number") return h("input", { type: "number", value, oninput: (e) => set(Number(e.target.value)) });
    if (typeof value === "boolean") return h("input", { type: "checkbox", checked: value, onchange: (e) => set(e.target.checked) });
    if (value && typeof value === "object") return this.renderContainer(value);
    return h("span", { class: "muted" }, "(empty)");
  }

  renderContainer(container) {
    if (!Array.isArray(container)) {
      return h("div", { class: "json-object" },
        Object.keys(container).map((key) => h("label", { class: "field" }, h("span", null, key), this.renderField(container, key))),
      );
    }
    const rerender = () => {
      emit(this, "json-change");
      this.render();
    };
    return h("div", { class: "json-array" },
      container.map((_, index) =>
        h("div", { class: "json-item" },
          this.renderField(container, index),
          h("button", { class: "icon", title: "Remove", onclick: () => { container.splice(index, 1); rerender(); } }, "✕"),
        ),
      ),
      container.length > 0 && h("button", { class: "small", onclick: () => { container.push(blankCopy(container.at(-1))); rerender(); } }, "＋ Add"),
    );
  }
}

customElements.define("json-form", JsonForm);
