import { h, emit, changed } from "./dom-service.js";
import { createNovel, deleteNovel } from "./novel-model-service.js";

// Left panel tab "Novels": select, add, delete and reorder novels
class NovelList extends HTMLElement {

  project = null;
  selected = null;

  connectedCallback() {
    this.render();
  }

  render() {
    if (!this.project) return;
    this.replaceChildren(
      h("ul", { class: "novel-list" }, this.project.novels.map((novel, index) => this.renderRow(novel, index))),
      h("button", { class: "primary", onclick: () => this.addNovel() }, "＋ New novel"),
      h("p", { class: "muted" }, "The intro novel is played after the start button. The others appear in the app's novel selection in this order."),
    );
  }

  renderRow(novel, index) {
    const novels = this.project.novels;
    const move = (delta) => (event) => {
      event.stopPropagation();
      novels.splice(index + delta, 0, novels.splice(index, 1)[0]);
      changed(this, true);
      this.render();
    };
    const remove = (event) => {
      event.stopPropagation();
      if (!confirm(`Delete the novel "${novel.title}"? This cannot be undone.`)) return;
      deleteNovel(this.project, novel);
      changed(this, true);
      emit(this, "novel-select", { novel: this.project.novels[0] ?? null });
    };
    return h("li", { class: novel === this.selected ? "selected" : "", onclick: () => emit(this, "novel-select", { novel }) },
      h("span", { class: "dot", style: `background:${novel.color}` }),
      h("span", { class: "grow" }, novel.title || "(untitled)"),
      novel.intro && h("span", { class: "badge" }, "intro"),
      h("button", { class: "icon", title: "Move up", disabled: index === 0, onclick: move(-1) }, "↑"),
      h("button", { class: "icon", title: "Move down", disabled: index === novels.length - 1, onclick: move(1) }, "↓"),
      !novel.intro && h("button", { class: "icon", title: "Delete novel", onclick: remove }, "✕"),
    );
  }

  addNovel() {
    const title = prompt("Title of the new novel:");
    if (!title?.trim()) return;
    const novel = createNovel(this.project, title.trim());
    changed(this, true);
    emit(this, "novel-select", { novel });
  }
}

customElements.define("novel-list", NovelList);
