import { ContentEditor } from "./content-service.js";

// Edit view of a text page (imprint, privacy, terms of use, about KITE):
// a title and a rich text with headings.
class DocumentEditor extends ContentEditor {

  render() {
    if (!this.project || !this.item) return;
    this.load();
    const { key } = this.item.content;
    const page = key ? this.data[key] : this.data;
    const toolbar = page.toolbar;
    const children = [
      this.header(),
      this.textField("Title", page, "title"),
      this.richField("Content", page, "html", true),
      // Privacy only: the button that resets the app
      toolbar && this.textField("Reset button label", toolbar, "resetLabel"),
      toolbar && this.textField("Reset button info text", toolbar, "infoText", { multiline: true }),
    ];
    this.replaceChildren(...children.filter(Boolean));
  }
}

customElements.define("document-editor", DocumentEditor);
