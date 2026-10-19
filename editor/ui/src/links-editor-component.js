import { h } from "./dom-service.js";
import { uploadAsset } from "./api-service.js";
import { ContentEditor } from "./content-service.js";
import { accordionList, followMove, moveItem } from "./reorder-service.js";

// Uploaded pictures are served from here by the overlay (lib/overlay-core.mjs)
const UPLOADS = "assets/Images/Uploads/";
const DEFAULT_PICTURE = "assets/Images/IconsAndLogos/Logo_Kite.png";
const FITS = [
  { value: "object-contain", label: "Show the whole picture" },
  { value: "object-cover", label: "Fill the frame (crops the picture)" },
];

// Edit view of the links page: one row per link, only one open at a time.
class LinksEditor extends ContentEditor {

  openIndex = null;
  drag = { index: null };

  render() {
    if (!this.project || !this.item) return;
    this.load();
    const links = this.data;
    this.replaceChildren(
      this.header(),
      accordionList({
        items: links,
        openIndex: this.openIndex,
        title: (link) => link.title,
        body: (link, index, refreshTitle) => this.renderLink(link, refreshTitle),
        toggle: (index) => {
          this.openIndex = this.openIndex === index ? null : index;
          this.render();
        },
        move: (from, to) => {
          if (!moveItem(links, from, to)) return;
          this.openIndex = followMove(this.openIndex, from, to);
          this.editAndRender();
        },
        remove: (index) => {
          if (!confirm(`Delete the link "${links[index].title}"?`)) return;
          links.splice(index, 1);
          this.openIndex = null;
          this.editAndRender();
        },
        removeLabel: "Delete link",
        state: this.drag,
      }),
      h("button", { class: "small", onclick: () => this.addLink() }, "＋ Add link"),
    );
  }

  renderLink(link, refreshTitle) {
    return [
      this.textField("Title", link, "title", { oninput: refreshTitle }),
      this.richField("Content", link, "desc"),
      this.renderPicture(link),
      this.textField("Address opened by a click on the picture", link, "url"),
    ];
  }

  renderPicture(link) {
    const thumb = h("img", { class: "thumb wide", alt: "", src: `preview/${link.imgSrc}` });
    const upload = async (event) => {
      const file = event.target.files[0];
      if (!file) return;
      const name = `link-${Date.now().toString(36)}`;
      try {
        await uploadAsset(name, file);
        link.imgSrc = `${UPLOADS}${name}.png`;
        thumb.src = `preview/${link.imgSrc}`;
        this.edit();
      } catch (error) {
        alert(`Upload failed: ${error.message}`);
      }
      event.target.value = "";
    };
    const fit = h("select", { onchange: (e) => { link.imgStyle = e.target.value; this.edit(); } },
      FITS.map((option) => h("option", { value: option.value }, option.label)),
    );
    fit.value = link.imgStyle || "object-contain";
    return h("div", { class: "field" },
      h("span", null, "Picture"),
      h("div", { class: "slot" },
        thumb,
        h("div", { class: "slot-body" },
          h("input", { type: "file", accept: "image/*", onchange: upload }),
          fit,
        ),
      ),
    );
  }

  addLink() {
    this.data.push({ title: "New link", desc: "", imgSrc: DEFAULT_PICTURE, url: "https://", imgStyle: "object-contain" });
    this.openIndex = this.data.length - 1;
    this.editAndRender();
  }
}

customElements.define("links-editor", LinksEditor);
