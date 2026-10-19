import { getProject, getMeta, saveProject, buildApp, resetProject, projectFileActions } from "./api-service.js";
import { h, confirmButton } from "./dom-service.js";
import { PreviewInspector } from "./preview-inspector-handler.js";
import "./branding-panel-component.js";
import { GENERAL_ITEMS } from "./nav-tree-component.js";
import "./novel-editor-component.js";

const SAVE_DELAY_MS = 400;

// Root element: owns the project, saves it, and controls the preview
class EditorMain extends HTMLElement {

  project = null;
  meta = null;
  selectedNovel = null;
  saveTimer = null;
  pendingPreview = false;
  pendingImages = new Set(); // image slots replaced since the last save
  saved = null; // the project as the server has it (what the preview was built from)
  saving = Promise.resolve();

  async connectedCallback() {
    try {
      [this.project, this.meta] = await Promise.all([getProject(), getMeta()]);
      this.fileActions = await projectFileActions();
    } catch (error) {
      this.textContent = `Could not load the project: ${error.message}`;
      return;
    }
    this.saved = structuredClone(this.project);
    this.selectedNovel = this.project.novels[0] ?? null;
    this.renderShell();
    this.inspector = new PreviewInspector(this);
    this.selectItem(GENERAL_ITEMS[0]);

    this.addEventListener("project-change", (event) => this.scheduleSave(event.detail.preview));
    this.addEventListener("image-change", (event) => this.pendingImages.add(event.detail.key));
    this.addEventListener("novel-select", (event) => this.selectNovel(event.detail.novel));
    this.addEventListener("item-select", (event) => this.selectItem(event.detail.item));
    this.addEventListener("novel-renamed", () => this.tree.render());
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

    this.tree = h("nav-tree", { project: this.project });
    this.branding = h("branding-panel", { project: this.project, meta: this.meta });

    this.preview = h("iframe", { class: "phone", title: "App preview", src: "preview/index.html" });
    this.novelEditor = h("novel-editor", { project: this.project, novel: this.selectedNovel, meta: this.meta, hidden: true });

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
        confirmButton("Reset project", "Really reset everything?", () => this.resetProject(), 5, { class: "danger", title: "Back to the original app: removes all changes and novels you added" }),
        h("button", { onclick: () => this.reloadPreview() }, "↻ Restart preview"),
        h("button", { class: "primary", onclick: () => this.build() }, "Build app"),
      ),
      this.warnings,
      h("main", { class: "columns" },
        h("aside", { class: "panel left" }, this.tree),
        h("section", { class: "stage" },
          this.preview,
          this.stageHint = h("p", { class: "stage-hint" }),
        ),
        h("section", { class: "panel right" }, this.branding, this.novelEditor),
      ),
    );
  }

  // Shows the edit view of a tree item on the right and its screen in the preview
  selectItem(item) {
    this.branding.item = item;
    this.branding.render();
    this.showInTree(item, this.branding);
    this.setReadOnly(true);
    this.inspector.showScene(item.scene);
  }

  selectNovel(novel) {
    this.selectedNovel = novel;
    this.novelEditor.novel = novel;
    this.novelEditor.render();
    this.showInTree(novel, this.novelEditor);
    this.setReadOnly(false);
    if (novel) this.inspector.showNovel(novel);
  }

  // General items show their screen read-only; novels can be played
  setReadOnly(readOnly) {
    this.inspector.readOnly = readOnly;
    this.stageHint.textContent = readOnly
      ? "Preview only: scrolling and external links work. Right-click anything to edit it."
      : "Right-click anything in the app to edit it: texts, logos, backgrounds, novels.";
  }

  showInTree(selected, view) {
    this.tree.selected = selected;
    this.tree.render();
    this.branding.hidden = view !== this.branding;
    this.novelEditor.hidden = view !== this.novelEditor;
  }

  // Redraws the side panels after the project was changed from inside the preview
  refreshPanels() {
    this.branding.render();
    this.tree.render();
    this.novelEditor.render();
  }

  // Reloads the app in the middle; with a name it starts inside that novel
  reloadPreview(novelName) {
    const novel = novelName ? `&novel=${encodeURIComponent(novelName)}` : "";
    this.preview.src = `preview/index.html?t=${Date.now()}${novel}`;
  }

  // preview: true reloads the preview after the save (novels), "live" shows
  // the change in the running preview right away (General items)
  scheduleSave(preview) {
    if (preview === "live") this.inspector.live.update();
    this.pendingPreview ||= preview === true;
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
    const sent = structuredClone(this.project);
    const images = [...this.pendingImages];
    this.pendingImages.clear();
    try {
      const { warnings } = await saveProject(sent);
      const novelsChanged = JSON.stringify(sent.novels) !== JSON.stringify(this.saved.novels);
      this.saved = sent;
      this.status.textContent = "saved ✓";
      this.showWarnings(warnings);
      if (preview) {
        // Novel changes need a reload; the inspector returns to the same screen
        this.inspector.softReload();
      } else if (novelsChanged) {
        await this.inspector.refreshNovels();
      }
      // The server has the new images now, so the running app can load them
      if (images.length > 0) this.inspector.live.refreshImages(images);
      if (preview || images.length > 0) this.branding.refreshThumbnails();
    } catch (error) {
      images.forEach((key) => this.pendingImages.add(key));
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

  async resetProject() {
    try {
      // Pending edits must not be saved over the reset project
      await this.flush();
      await resetProject();
      location.reload();
    } catch (error) {
      alert(`Reset failed: ${error.message}`);
    }
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
