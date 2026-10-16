import { h, emit, changed } from "./dom-service.js";
import { createNovel, deleteNovel } from "./novel-model-service.js";

const LEGAL = "assets/json/legal-content.json";

// The "General" folder: each item names the slots its edit view shows
// (see branding-panel-component.js) and the app scene the preview jumps to.
// Every slot belongs to exactly one item.
export const GENERAL_ITEMS = [
  { label: "Start screen", scene: "start-scene", images: ["logo.circle", "logo.lettering", "logo.sponsor", "bg.darkFlipped"], texts: (key) => key === "start.button" },
  { label: "Links", scene: "links-scene", content: [{ path: "assets/json/links-scene-content.json" }] },
  { label: "Wiki", scene: "knowledge-scene", texts: (key) => key.startsWith("knowledge."), content: [{ path: "assets/json/knowledge.json" }] },
  { label: "Imprint", scene: "imprint-scene", content: [{ path: LEGAL, key: "impressum" }] },
  { label: "Privacy", scene: "dataprivacy-scene", texts: (key) => key === "consent.privacy", content: [{ path: LEGAL, key: "datenschutz" }] },
  { label: "Terms of use", scene: "tos-scene", texts: (key) => key === "consent.tos", content: [{ path: LEGAL, key: "nutzungsbedingungen" }] },
  { label: "About KITE", scene: "about-kite-scene", texts: (key) => key.startsWith("about.") },
  { label: "Design", scene: "novel-selector-scene", appName: true, images: ["logo.favicon", "bg.dark", "bg.bright", "bg.panorama", "bg.landscape"], colors: true },
  { label: "Other texts", scene: "archive-scene", texts: (key) => /^(archive|bookmarks|feedback)\./.test(key) },
];

// Left column: navigation tree like in a code editor. Folders "General" and
// "Novels"; a click on an item opens its edit view on the right. Novels can
// be reordered by drag and drop or with the arrow buttons.
class NavTree extends HTMLElement {

  project = null;
  selected = null; // a GENERAL_ITEMS entry or a novel
  closed = new Set();
  dragIndex = null;

  connectedCallback() {
    this.render();
  }

  render() {
    if (!this.project) return;
    this.replaceChildren(
      this.folder("General", GENERAL_ITEMS.map((item) =>
        h("li", { class: item === this.selected ? "selected" : "" },
          h("button", { class: "tree-item", onclick: () => emit(this, "item-select", { item }) }, item.label),
        ),
      )),
      this.folder("Novels", [
        this.project.novels.map((novel, index) => this.renderNovel(novel, index)),
        h("li", null, h("button", { class: "tree-item tree-add", onclick: () => this.addNovel() }, "＋ New novel")),
      ]),
    );
  }

  folder(label, rows) {
    return h("details", {
      class: "tree-folder",
      open: !this.closed.has(label),
      ontoggle: (e) => (e.target.open ? this.closed.delete(label) : this.closed.add(label)),
    }, h("summary", null, label), h("ul", { class: "tree" }, rows));
  }

  move(from, to) {
    const novels = this.project.novels;
    if (from === to || to < 0 || to >= novels.length) return;
    novels.splice(to, 0, novels.splice(from, 1)[0]);
    changed(this, true);
    this.render();
  }

  renderNovel(novel, index) {
    const last = this.project.novels.length - 1;
    const remove = () => {
      if (!confirm(`Delete the novel "${novel.title}"? This cannot be undone.`)) return;
      deleteNovel(this.project, novel);
      changed(this, true);
      emit(this, "novel-select", { novel: this.project.novels[0] ?? null });
    };
    const row = h("li", {
      class: novel === this.selected ? "selected" : "",
      draggable: true,
      ondragstart: (e) => {
        this.dragIndex = index;
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", novel.title); // Firefox only drags with data set
      },
      ondragover: (e) => {
        if (this.dragIndex === null) return;
        e.preventDefault();
        row.classList.add("drop-target");
      },
      ondragleave: () => row.classList.remove("drop-target"),
      ondrop: (e) => {
        e.preventDefault();
        const from = this.dragIndex;
        this.dragIndex = null;
        this.move(from, index);
      },
      ondragend: () => {
        this.dragIndex = null;
        this.querySelectorAll(".drop-target").forEach((el) => el.classList.remove("drop-target"));
      },
    },
      h("span", { class: "grip", "aria-hidden": "true" }, "⠿"),
      h("span", { class: "dot", style: `background:${novel.color}` }),
      h("button", { class: "tree-item", onclick: () => emit(this, "novel-select", { novel }) }, novel.title || "(untitled)"),
      novel.intro && h("span", { class: "badge", title: "Played after the start button; the others appear in the novel selection in this order" }, "intro"),
      h("button", { class: "icon", title: "Move up", disabled: index === 0, onclick: () => this.move(index, index - 1) }, "↑"),
      h("button", { class: "icon", title: "Move down", disabled: index === last, onclick: () => this.move(index, index + 1) }, "↓"),
      !novel.intro && h("button", { class: "icon", title: "Delete novel", onclick: remove }, "✕"),
    );
    return row;
  }

  addNovel() {
    const title = prompt("Title of the new novel:");
    if (!title?.trim()) return;
    const novel = createNovel(this.project, title.trim());
    changed(this, true);
    emit(this, "novel-select", { novel });
  }
}

customElements.define("nav-tree", NavTree);
