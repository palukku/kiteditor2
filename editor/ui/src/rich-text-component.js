import { h, emit } from "./dom-service.js";
import { richTextNodes, serializeRichText, isSafeHref, normalizeHref } from "./rich-text-service.js";

// Formatting buttons: label, title, execCommand name and argument
const FORMATS = [
  { label: "B", title: "Bold (Ctrl+B)", command: "bold", class: "fmt-b" },
  { label: "I", title: "Italic (Ctrl+I)", command: "italic", class: "fmt-i" },
  { label: "U", title: "Underline (Ctrl+U)", command: "underline", class: "fmt-u" },
];
const BLOCK_FORMATS = [
  { label: "¶", title: "Normal text", block: "p" },
  { label: "H2", title: "Heading", block: "h2" },
  { label: "H3", title: "Subheading", block: "h3" },
];

// Small text editor for rich texts: bold, italic, underline, links and, with
// "headings", headings. Set .value (and .headings) before it is attached.
// Emits "rich-change" (detail.html) on every change.
class RichText extends HTMLElement {

  value = "";
  headings = false;
  area = null;
  range = null; // the selection the link form works on
  anchor = null; // the link being edited, if any

  connectedCallback() {
    if (this.area) return;
    this.area = h("div", {
      class: "rich-area",
      contenteditable: "true",
      oninput: () => this.changed(),
      // New lines should be paragraphs, not <div>s (Chrome's default)
      onfocus: () => document.execCommand("defaultParagraphSeparator", false, "p"),
      onpaste: (e) => {
        // Only the text: formatting from web pages or Word would be dropped anyway
        e.preventDefault();
        document.execCommand("insertText", false, e.clipboardData.getData("text/plain"));
      },
      onclick: (e) => {
        const link = e.target.closest("a");
        if (link) this.openLinkForm(link);
      },
      onkeyup: () => this.updateToolbar(),
      onmouseup: () => this.updateToolbar(),
    }, richTextNodes(this.value, this.headings));

    const tool = (props, label) => h("button", {
      type: "button",
      // Keep the selection in the text when a button is pressed
      onmousedown: (e) => e.preventDefault(),
      ...props,
    }, label);
    this.buttons = FORMATS.map((f) => {
      const button = tool({ class: `icon ${f.class}`, title: f.title, onclick: () => this.exec(f.command) }, f.label);
      button.command = f.command;
      return button;
    });
    const blocks = this.headings ? BLOCK_FORMATS.map((f) => tool({ class: "icon", title: f.title, onclick: () => this.exec("formatBlock", `<${f.block}>`) }, f.label)) : [];

    this.linkText = h("input", { type: "text", placeholder: "Link text" });
    this.linkHref = h("input", { type: "text", placeholder: "https://…" });
    this.removeLink = h("button", { type: "button", class: "small", onclick: () => this.unlink() }, "Remove link");
    this.linkForm = h("div", {
      class: "link-form",
      hidden: true,
      onkeydown: (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          this.applyLink();
        } else if (e.key === "Escape") {
          this.closeLinkForm();
        }
      },
    },
      h("label", { class: "field" }, h("span", null, "Link text"), this.linkText),
      h("label", { class: "field" }, h("span", null, "Address (URL)"), this.linkHref),
      h("div", { class: "row" },
        h("button", { type: "button", class: "small primary", onclick: () => this.applyLink() }, "Apply"),
        this.removeLink,
        h("button", { type: "button", class: "small", onclick: () => this.closeLinkForm() }, "Cancel"),
      ),
    );

    this.replaceChildren(
      h("div", { class: "rich-toolbar" },
        this.buttons,
        blocks.length > 0 && h("span", { class: "rich-sep" }),
        blocks,
        h("span", { class: "rich-sep" }),
        tool({ class: "icon", title: "Add or edit a link", onclick: () => this.openLinkForm() }, "🔗 Link"),
      ),
      this.area,
      this.linkForm,
    );
  }

  exec(command, argument) {
    this.area.focus();
    document.execCommand("styleWithCSS", false, false);
    document.execCommand(command, false, argument);
    this.changed();
    this.updateToolbar();
  }

  changed() {
    this.value = serializeRichText(this.area, this.headings);
    emit(this, "rich-change", { html: this.value });
  }

  // Marks the buttons of the formats at the caret
  updateToolbar() {
    for (const button of this.buttons) button.classList.toggle("active", document.queryCommandState(button.command));
  }

  // The current selection if it lies inside the text, else a caret at its end
  selectionRange() {
    const selection = getSelection();
    if (selection.rangeCount && this.area.contains(selection.getRangeAt(0).commonAncestorContainer)) return selection.getRangeAt(0).cloneRange();
    const range = document.createRange();
    range.selectNodeContents(this.area.lastElementChild ?? this.area);
    range.collapse(false);
    return range;
  }

  // Opens the link form for a link (clicked) or for the selected text
  openLinkForm(link) {
    this.range = this.selectionRange();
    const start = this.range.startContainer;
    this.anchor = link ?? (start.nodeType === Node.ELEMENT_NODE ? start : start.parentElement).closest("a");
    if (this.anchor && !this.area.contains(this.anchor)) this.anchor = null;
    this.linkText.value = this.anchor ? this.anchor.textContent : this.range.toString();
    this.linkHref.value = this.anchor ? this.anchor.getAttribute("href") : "";
    this.removeLink.hidden = !this.anchor;
    this.linkForm.hidden = false;
    (this.linkText.value ? this.linkHref : this.linkText).focus();
  }

  closeLinkForm() {
    this.linkForm.hidden = true;
    this.anchor = null;
    this.range = null;
  }

  applyLink() {
    const href = normalizeHref(this.linkHref.value);
    if (!isSafeHref(href)) {
      alert("Please enter a web address (https://…), an e-mail address or a phone number (tel:…).");
      return this.linkHref.focus();
    }
    const text = this.linkText.value.trim() || href;
    if (this.anchor) {
      this.anchor.textContent = text;
      this.anchor.setAttribute("href", href);
    } else {
      const link = h("a", { href }, text);
      this.range.deleteContents();
      this.range.insertNode(link);
      // Caret after the link, so typing goes on as normal text
      getSelection().collapse(link.parentNode, [...link.parentNode.childNodes].indexOf(link) + 1);
    }
    this.changed();
    this.closeLinkForm();
  }

  unlink() {
    if (this.anchor) this.anchor.replaceWith(...this.anchor.childNodes);
    this.changed();
    this.closeLinkForm();
  }
}

customElements.define("rich-text", RichText);
