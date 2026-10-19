import { h } from "./dom-service.js";
import { ContentEditor } from "./content-service.js";
import { accordionList, followMove, moveItem } from "./reorder-service.js";

// Edit view of the wiki (knowledge base): topics, each with its entries.
// One topic and, inside it, one entry is open at a time.
class WikiEditor extends ContentEditor {

  openTopic = null;
  openEntry = null;
  topicDrag = { index: null };
  entryDrag = { index: null };

  render() {
    if (!this.project || !this.item) return;
    this.load();
    const topics = this.data;
    this.replaceChildren(
      this.header(),
      accordionList({
        items: topics,
        openIndex: this.openTopic,
        title: (topic) => topic.title,
        body: (topic, index, refreshTitle) => this.renderTopic(topic, refreshTitle),
        toggle: (index) => {
          this.openTopic = this.openTopic === index ? null : index;
          this.openEntry = null;
          this.render();
        },
        move: (from, to) => {
          if (!moveItem(topics, from, to)) return;
          this.openTopic = followMove(this.openTopic, from, to);
          this.editAndRender();
        },
        remove: (index) => {
          if (!confirm(`Delete the topic "${topics[index].title}" with all its entries?`)) return;
          topics.splice(index, 1);
          this.openTopic = null;
          this.editAndRender();
        },
        removeLabel: "Delete topic",
        state: this.topicDrag,
      }),
      h("button", { class: "small", onclick: () => this.addTopic() }, "＋ Add topic"),
    );
  }

  renderTopic(topic, refreshTitle) {
    const entries = (topic.items ??= []);
    return [
      this.textField("Topic title", topic, "title", { oninput: refreshTitle }),
      h("div", { class: "field" },
        h("span", null, "Entries"),
        accordionList({
          items: entries,
          openIndex: this.openEntry,
          title: (entry) => entry.title,
          body: (entry, index, refreshEntryTitle) => [
            this.textField("Title", entry, "title", { oninput: refreshEntryTitle }),
            this.richField("Content", entry, "fullText"),
          ],
          toggle: (index) => {
            this.openEntry = this.openEntry === index ? null : index;
            this.render();
          },
          move: (from, to) => {
            if (!moveItem(entries, from, to)) return;
            this.openEntry = followMove(this.openEntry, from, to);
            this.editAndRender();
          },
          remove: (index) => {
            if (!confirm(`Delete the entry "${entries[index].title}"?`)) return;
            entries.splice(index, 1);
            this.openEntry = null;
            this.editAndRender();
          },
          removeLabel: "Delete entry",
          state: this.entryDrag,
        }),
        h("button", { class: "small", onclick: () => this.addEntry(entries) }, "＋ Add entry"),
      ),
    ];
  }

  addTopic() {
    this.data.push({ title: "New topic", items: [] });
    this.openTopic = this.data.length - 1;
    this.openEntry = null;
    this.editAndRender();
  }

  addEntry(entries) {
    entries.push({ title: "New entry", fullText: "" });
    this.openEntry = entries.length - 1;
    this.editAndRender();
  }
}

customElements.define("wiki-editor", WikiEditor);
