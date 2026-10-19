// Terms of use page: load nutzungsbedingungen from legal-content.json; shell uses drag-scrolling.js on main.
import "../../shared-components/headers/back-header-component.js";
import "../../shared-components/footer-component.js";
import {
  attachDocumentPageDragScroll,
  documentPageShell,
  escapeHtml,
  renderDocumentBody,
} from "../../shared-services/shared-document-page-service.js";
import { fetchFromJson } from "../../shared-services/fetch-service.js";


class TosScene extends HTMLElement {
  async connectedCallback() {
    // Fallback HTML if fetch fails or block missing
    let mainHtml = '<h1 class="mb-[4.8cqw] text-center text-[3.6cqw] font-bold tracking-tight text-[#0b1a2d]">Nutzungsbedingungen</h1><p class="text-[3cqw] leading-[1.55] text-[#0b1a2d]">Content could not be loaded.</p>';

    // Load the Terms of use block from the legal-content.json file
    try {
      const data = await fetchFromJson("assets/json/legal-content.json");
      const block = data.nutzungsbedingungen;
      if (block) {
        const title = escapeHtml(block.title || "Nutzungsbedingungen");
        const body = renderDocumentBody(block.html);
        mainHtml = `<h1 class="mb-[4.8cqw] text-center text-[4.8cqw] font-bold tracking-tight text-[#213a60]">${title}</h1>${body}`;
      }
    } catch (_) {
      // keep fallback
    }

    this.innerHTML = documentPageShell(mainHtml); // no overlay
    attachDocumentPageDragScroll(this);
  }
}

customElements.define("tos-scene", TosScene);
