import { getProject, getMeta, saveProject, buildApp, projectFileActions } from "./api-service.js";
import { h } from "./dom-service.js";
import "./branding-panel-component.js";
import "./novel-list-component.js";
import "./novel-editor-component.js";

const SAVE_DELAY_MS = 400;

// Root element: owns the project, saves it, and controls the preview
class EditorMain extends HTMLElement {

  project = null;
  meta = null;
  selectedNovel = null;
  saveTimer = null;
  pendingPreview = false;
  saving = Promise.resolve();

  async connectedCallback() {
    try {
      [this.project, this.meta] = await Promise.all([getProject(), getMeta()]);
      this.fileActions = await projectFileActions();
    } catch (error) {
      this.textContent = `Could not load the project: ${error.message}`;
      return;
    }
    this.selectedNovel = this.project.novels[0] ?? null;
    this.renderShell();

    this.addEventListener("project-change", (event) => this.scheduleSave(event.detail.preview));
    this.addEventListener("novel-select", (event) => this.selectNovel(event.detail.novel));
    this.addEventListener("novel-renamed", () => this.novelList.render());
    this.addEventListener("novel-play", async (event) => {
      await this.flush();
      this.reloadPreview(event.detail.name);
    });
    // Ask before closing while the last edit is not saved yet
    window.addEventListener("beforeunload", (event) => {
      if (this.saveTimer) event.preventDefault();
    });
  }

  renderShell() {
    this.status = h("span", { class: "status" }, "saved ✓");
    this.buildInfo = h("span", { class: "build-info" });
    this.warnings = h("details", { class: "warnings", hidden: true });

    this.branding = h("branding-panel", { project: this.project, meta: this.meta });
    this.novelList = h("novel-list", { project: this.project, selected: this.selectedNovel, hidden: true });
    this.tabs = [
      h("button", { class: "tab active", onclick: () => this.showTab(0) }, "Branding"),
      h("button", { class: "tab", onclick: () => this.showTab(1) }, "Novels"),
    ];

    this.preview = h("iframe", { class: "phone", title: "App preview", src: "preview/index.html" });
    this.novelEditor = h("novel-editor", { project: this.project, novel: this.selectedNovel, meta: this.meta });

    this.replaceChildren(
      h("header", { class: "topbar" },
        h("h1", null, "KITEditor"),
        this.status,
        this.buildInfo,
        h("span", { class: "spacer" }),
        // Online editor only: the project lives in this browser, so offer a file backup
        this.fileActions && h("button", { title: "Save the project as a file (backup, or to continue in another browser)", onclick: () => this.exportProject() }, "Export project"),
        this.fileActions && h("label", { class: "button", title: "Replace the project with an exported file" },
          "Import project",
          h("input", { type: "file", accept: "application/json,.json", hidden: true, onchange: (e) => this.importProject(e.target.files[0]) }),
        ),
        h("button", { onclick: () => this.reloadPreview() }, "↻ Restart preview"),
        h("button", { class: "primary", onclick: () => this.build() }, "Build app"),
      ),
      this.warnings,
      h("main", { class: "columns" },
        h("aside", { class: "panel left" }, h("nav", { class: "tabs" }, this.tabs), this.branding, this.novelList),
        h("section", { class: "stage" }, this.preview),
        h("section", { class: "panel right" }, this.novelEditor),
      ),
    );
  }

  showTab(index) {
    this.tabs.forEach((tab, i) => tab.classList.toggle("active", i === index));
    this.branding.hidden = index !== 0;
    this.novelList.hidden = index !== 1;
  }

  selectNovel(novel) {
    this.selectedNovel = novel;
    this.novelList.selected = novel;
    this.novelList.render();
    this.novelEditor.novel = novel;
    this.novelEditor.render();
  }

  // Reloads the app in the middle; with a name it starts inside that novel
  reloadPreview(novelName) {
    const novel = novelName ? `&novel=${encodeURIComponent(novelName)}` : "";
    this.preview.src = `preview/index.html?t=${Date.now()}${novel}`;
  }

  scheduleSave(preview) {
    this.pendingPreview ||= !!preview;
    this.status.textContent = "saving…";
    clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => this.flush(), SAVE_DELAY_MS);
  }

  // Saves now (if needed) and resolves when the server has the project
  flush() {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
      const preview = this.pendingPreview;
      this.pendingPreview = false;
      this.saving = this.saving.then(() => this.save(preview));
    }
    return this.saving;
  }

  async save(preview) {
    try {
      const { warnings } = await saveProject(this.project);
      this.status.textContent = "saved ✓";
      this.showWarnings(warnings);
      if (preview) {
        this.reloadPreview();
        this.branding.refreshThumbnails();
      }
    } catch (error) {
      this.status.textContent = `save failed: ${error.message}`;
    }
  }

  showWarnings(warnings) {
    this.warnings.hidden = warnings.length === 0;
    this.warnings.replaceChildren(
      h("summary", null, `${warnings.length} hint${warnings.length === 1 ? "" : "s"} about your novels`),
      h("ul", null, warnings.map((warning) => h("li", null, warning))),
    );
  }

  async exportProject() {
    await this.flush();
    const url = URL.createObjectURL(await this.fileActions.exportProject());
    h("a", { href: url, download: "kiteditor-project.json" }).click();
    URL.revokeObjectURL(url);
  }

  async importProject(file) {
    if (!file || !confirm("Replace the current project with this file? Export the current one first if you still need it.")) return;
    try {
      await this.flush();
      await this.fileActions.importProject(file);
      location.reload();
    } catch (error) {
      alert(`Import failed: ${error.message}`);
    }
  }

  async build() {
    this.buildInfo.textContent = "building…";
    try {
      await this.flush();
      const { files, dir, url, download } = await buildApp();
      const link = download ? h("a", { href: url, download }, "Download again") : h("a", { href: url, target: "_blank" }, "Open built app");
      this.buildInfo.replaceChildren(`Built ${files} files → ${dir} `, link);
      if (download) link.click();
    } catch (error) {
      this.buildInfo.textContent = `build failed: ${error.message}`;
    }
  }
}

customElements.define("editor-main", EditorMain);
