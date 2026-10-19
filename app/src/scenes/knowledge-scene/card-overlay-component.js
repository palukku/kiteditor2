import "./container-component.js";
import { renderRichText } from "../../shared-services/rich-text-service.js";

// Classes for the formatted text
const TEXT_STYLES = {
  h2: "font-bold mt-[4cqw] first:mt-0 mb-[2cqw]",
  h3: "font-bold mt-[3cqw] first:mt-0 mb-[2cqw]",
  p: "mb-[4cqw] last:mb-0",
  a: "text-[#F5944E] break-words",
};

class CardOverlayComponent extends HTMLElement {

  connectedCallback() {
    this.className = "w-full flex flex-col items-center shrink-0";
    this.cardOverlay();
  }

  /**
   * Creates the card overlay to display the full text
   */
  cardOverlay() {
    this.detailCard = document.createElement('div');
    this.detailCard.className = "w-full bg-white p-[5cqw] rounded-[3cqw] flex flex-col gap-[4cqw]";

    this.detailTitle = document.createElement('h2');
    this.detailTitle.className = "user-font text-[#14305d] font-bold text-center";
    this.detailTitle.innerText = this.args.title;

    // The full text is a rich text (bold, italic, underline, links)
    this.detailText = document.createElement('div');
    this.detailText.className = "user-font text-[#14305d] leading-[5cqw]";
    this.detailText.innerHTML = renderRichText(this.args.fullText, TEXT_STYLES);

    this.detailCard.appendChild(this.detailTitle);
    this.detailCard.appendChild(this.detailText);

    this.appendChild(this.detailCard);
  }
}

customElements.define("card-overlay-component", CardOverlayComponent);