import { fetchFromJson } from "../../shared-services/fetch-service.js";
import { bindTapOnlyExternalLink } from "../../shared-services/tap-service.js";
import { renderRichText } from "../../shared-services/rich-text-service.js";

// Classes for the formatted description
const DESC_STYLES = {
  p: "mb-[2cqw] last:mb-0",
  a: "underline break-words",
};

class ListComponent extends HTMLElement {

  async connectedCallback() {
    const linksData = await fetchFromJson("assets/json/links-scene-content.json");

    // --- Container for the Links List ---
    const listContainer = document.createElement('div');
    listContainer.className = "flex flex-col w-full px-[6cqw] gap-[8cqw]";

    // --- Loop for generating entries ---
    linksData.forEach(item => {
      const itemContainer = document.createElement('div');
      itemContainer.className = "flex flex-col gap-[2cqw]";

      // title
      const itemTitle = document.createElement('h2');
      itemTitle.innerText = item.title;
      itemTitle.className = "text-[#14305d] text-[4.5cqw] font-bold";
      itemContainer.appendChild(itemTitle);

      // description (rich text)
      const itemDesc = document.createElement('div');
      itemDesc.innerHTML = renderRichText(item.desc, DESC_STYLES);
      itemDesc.className = "text-[#14305d] text-[3.5cqw] leading-[5.5cqw] mb-[2cqw]";
      itemContainer.appendChild(itemDesc);

      // Clickable Image
      const itemLink = document.createElement('a');
      itemLink.href = item.url;
      itemLink.target = "_blank"; // Öffnet den Link im neuen Tab/Browser
      itemLink.rel = "noopener noreferrer"; // Sicherheits-Standard für externe Links
      itemLink.className = "block w-full overflow-hidden rounded-[4cqw] shadow-lg bg-white transform transition-transform active:scale-95 aspect-[16/9] items-center justify-center";

      const itemImg = document.createElement('img');
      itemImg.src = item.imgSrc;
      itemImg.alt = `Link zu ${item.title}`;
      itemImg.className = `w-full h-full ${item.imgStyle || 'object-contain'}`;

      itemLink.appendChild(itemImg);
      bindTapOnlyExternalLink(itemLink, item.url);

      itemContainer.appendChild(itemLink);

      // Adding entry to the list
      listContainer.appendChild(itemContainer);
    });
    
    this.appendChild(listContainer);
  }
}

customElements.define("list-component", ListComponent);