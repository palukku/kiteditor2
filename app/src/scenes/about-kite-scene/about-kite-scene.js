import "../../shared-components/headers/back-header-component.js";
import {
  attachDocumentPageDragScroll,
  documentPageShell,
} from "../../shared-services/shared-document-page-service.js";
import {
  buildAboutKiteContentComponent,
  wireAboutKiteContentNavigation,
} from "./content-component.js";
import { fetchFromJson } from "../../shared-services/fetch-service.js";

export class AboutKiteScene extends HTMLElement {

  async connectedCallback() {
    this.classList.add(
      "flex",
      "h-full",
      "w-full",
      "min-h-0",
      "flex-col",
      "overflow-hidden",
    );

    // Fetch the Intro Novel and the texts, then initialize the content component
    const [introNovel, about] = await Promise.all([
      this.fetchIntroNovel(),
      fetchFromJson("assets/json/about-kite-content.json").catch(() => null),
    ]);
    this.innerHTML = documentPageShell(
      buildAboutKiteContentComponent(introNovel, about),
    );
    attachDocumentPageDragScroll(this);
    wireAboutKiteContentNavigation(this, introNovel);
  }

  /**
   * Fetches Information for the Hexagon in this scene
   * @returns An Object with all required Information
   */
  async fetchIntroNovel() {
    const data = await fetchFromJson("assets/json/novels.json");
    const novel = data.visualNovels?.find((n) => n.name === "Einstieg");

    return novel;
  }
}

customElements.define("about-kite-scene", AboutKiteScene);
