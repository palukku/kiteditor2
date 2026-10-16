import { h, emit, changed } from "./dom-service.js";
import { uploadAsset } from "./api-service.js";
import "./novel-graph-component.js";
import "./node-form-component.js";

// Right panel: settings of one novel, its node graph, and the selected node
class NovelEditor extends HTMLElement {

  project = null;
  novel = null;
  meta = null;
  selectedId = null;

  connectedCallback() {
    this.addEventListener("node-select", (event) => this.selectNode(event.detail.id));
    // A node's label/text/connections changed: redraw the graph only
    this.addEventListener("node-updated", () => this.graph?.render());
    this.render();
  }

  render() {
    const novel = this.novel;
    if (!novel) return this.replaceChildren(h("p", { class: "muted" }, "Create or select a novel in the “Novels” folder on the left."));
    if (!novel.nodes.some((n) => n.id === this.selectedId)) this.selectedId = novel.start;

    this.graph = h("novel-graph", { novel, selectedId: this.selectedId });
    this.form = h("node-form", { novel, meta: this.meta, node: this.selectedNode() });

    const field = (label, key, tag = "input", extra = {}) =>
      h("label", { class: "field" },
        h("span", null, label),
        h(tag, { ...extra, value: novel[key] ?? "", oninput: (e) => { novel[key] = e.target.value; changed(this); if (key === "title") emit(this, "novel-renamed"); } }),
      );

    this.replaceChildren(
      h("div", { class: "novel-head" },
        h("h2", null, novel.title || "(untitled)", novel.intro && h("span", { class: "badge" }, "intro")),
        h("button", { class: "primary", onclick: () => emit(this, "novel-play", { name: novel.intro ? "Einstieg" : novel.name }) }, "▶ Play in preview"),
      ),
      h("details", { class: "section" },
        h("summary", null, "Novel settings"),
        field("Title", "title", "input", { type: "text" }),
        field("Description (shown in the novel selection)", "description", "textarea", { rows: 2 }),
        field("Context (scenario description for the AI feedback)", "context", "textarea", { rows: 3 }),
        h("div", { class: "row" },
          h("label", { class: "row" }, h("input", { type: "color", value: novel.color, onchange: (e) => { novel.color = e.target.value; changed(this, true); } }), "Color"),
          h("label", { class: "row" }, h("input", { type: "color", value: novel.frameColor, onchange: (e) => { novel.frameColor = e.target.value; changed(this, true); } }), "Frame color"),
        ),
        h("label", { class: "field" },
          h("span", null, `Background image${novel.background ? " (custom)" : ""}`),
          h("div", { class: "row" },
            h("input", { type: "file", accept: "image/*", onchange: (e) => this.uploadBackground(e) }),
            h("button", { class: "small", onclick: () => { novel.background = null; changed(this); this.render(); } }, "Reset"),
          ),
        ),
      ),
      this.graph,
      this.form,
    );
  }

  selectedNode() {
    return this.novel.nodes.find((n) => n.id === this.selectedId) ?? null;
  }

  selectNode(id) {
    this.selectedId = id;
    this.graph.selectedId = id;
    this.graph.render();
    this.form.node = this.selectedNode();
    this.form.render();
  }

  async uploadBackground(event) {
    const file = event.target.files[0];
    if (!file) return;
    try {
      const { name } = await uploadAsset(`bg-${this.novel.name}`, file);
      this.novel.background = name;
      changed(this);
      this.render();
    } catch (error) {
      alert(`Upload failed: ${error.message}`);
    }
  }
}

customElements.define("novel-editor", NovelEditor);
