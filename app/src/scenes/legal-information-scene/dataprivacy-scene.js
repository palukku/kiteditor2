// Datenschutz (privacy) page: JSON content; drag scroll + shared information popup.
import "../../shared-components/headers/back-header-component.js";
import "../../shared-components/footer-component.js";
import { hideSwapModal, showSwapModal, createInformationPopup, setInformationText } from "../../shared-services/information-popup-service.js";
import {
  attachDocumentPageDragScroll,
  documentPageShell,
  escapeHtml,
  renderDocumentBody,
  renderPrivacyToolbar,
} from "../../shared-services/shared-document-page-service.js";
import { fetchFromJson } from "../../shared-services/fetch-service.js";
import { PersonPopUp } from "../../shared-components/person-popup-component.js";

const DATAPRIVACY_INFO_TEXT = "Mit diesem Button kannst du deine App zurücksetzen. Sämtliche Daten, welche durch dein Spielen entstanden sind, werden gelöscht.";
const RESET_INFO_TEXT = "Die App wurde erfolgreich zurückgesetzt";

class DataprivacyScene extends HTMLElement {

  async connectedCallback() {
    // Fallback HTML if fetch fails or block missing
    let mainHtml = '<h1 class="mb-[4.8cqw] text-center text-[4.8cqw] font-bold tracking-tight text-[#0b1a2d]">Datenschutz</h1><p class="text-[3cqw] leading-[1.55] text-[#0b1a2d]">Content could not be loaded.</p>';

    let toolbar = null;
    // data.datenschutz: title, toolbar (reset + info), html
    try {
      const data = await fetchFromJson("assets/json/legal-content.json");
      const block = data.datenschutz;
      if (block) {
        const title = escapeHtml(block.title || "Datenschutz");
        const toolbarRow = renderPrivacyToolbar(block.toolbar);
        const body = renderDocumentBody(block.html);
        mainHtml = `<h1 class="mb-[4.8cqw] text-center text-[4.8cqw] font-bold tracking-tight text-[#213a60]">${title}</h1>${toolbarRow}${body}`;
        toolbar = block.toolbar;
      }
    } catch (_) {
      // keep fallback
    }
    

    this.innerHTML = documentPageShell(mainHtml);
    attachDocumentPageDragScroll(this);
    this.attachToolbarInfoPopup(toolbar);

    this.personPopUp = PersonPopUp.create();
    this.personPopUp.config = {
      novelColor: "#132034",
      title: 'Wenn du fortfährst, wird die App zurückgesetzt.\n\nWenn du dies möchtest, drücke auf "DATEN LÖSCHEN". Falls nicht, drücke auf "ABBRECHEN".',
      descriptions: [],
      buttons: [
          { text: "ABBRECHEN", isPrimary: true, onClick: () => {
              this.personPopUp.toggle(false)
          }},
          { text: "DATEN LÖSCHEN", isPrimary: false, onClick: () => {
            this.personPopUp.toggle(false);
            const popupContainer = this.querySelector('#document-popup-container');
            localStorage.clear();
            setInformationText(this.infoPopup, RESET_INFO_TEXT);
            showSwapModal(popupContainer, this.infoPopup);
          }}
      ],
      overlayClass: "absolute inset-0 bg-black/50 z-[100] hidden p-[4cqw] transition-opacity duration-300",
    };
    this.classList = "flex flex-col w-full h-full relative"
    this.appendChild(this.personPopUp);
    document.querySelector('#reset-button').addEventListener("click", () => {
      this.personPopUp.toggle(true);
    });

  }

  /**
   * Creates an Information Pop-Up and attaches it to its container.
   * @param {Object} toolbar the toolbar from the JSON (its infoText is shown)
   */
  attachToolbarInfoPopup(toolbar) {

    this.infoPopup = createInformationPopup();

    const popupContainer = this.querySelector("#document-popup-container");
    if (!popupContainer) return;

    this.infoPopup.addEventListener("information-popup-close", () => {
      hideSwapModal(popupContainer);
    });

    const openBtn = this.querySelector("[data-info-open]");
    if (openBtn) {
      openBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        setInformationText(this.infoPopup, toolbar?.infoText || DATAPRIVACY_INFO_TEXT);
        showSwapModal(popupContainer, this.infoPopup);
      });
    }

  }
}

customElements.define("dataprivacy-scene", DataprivacyScene);
