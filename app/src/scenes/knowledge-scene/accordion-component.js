import "./card-overlay-component.js";
import { addOpenOnTapOnly } from "../../shared-services/tap-service.js";
import { fetchFromJson } from "../../shared-services/fetch-service.js";
import { uiAsset } from "../../shared-services/ui-asset-service.js";
import { richTextToPlain } from "../../shared-services/rich-text-service.js";

class Accordion extends HTMLElement {

  connectedCallback() {
    this.className = "w-full";
    this.data = this.args;
    this.cardElements = this.data.cards;
    this.categoryElements = this.data.categories; 
    this.buildAccordionList();
  }

  /**
   * Builds the entries of the accordion
   */
  async buildAccordionList() {
    this.listContainer = document.createElement('div');
    this.listContainer.className = "flex flex-col w-full gap-[3cqw]";

    const knowledgeData = await fetchFromJson("assets/json/knowledge.json");

    knowledgeData.forEach((category, catIndex) => {
      // Kategorie-Container
      const categoryWrapper = document.createElement('div');
      categoryWrapper.className = "flex flex-col w-full";
      this.categoryElements.push(categoryWrapper);

      // Der orange Button
      const catBtn = document.createElement('button');
      catBtn.className = "user-font w-full bg-[#F5944E] flex justify-between items-center p-[2cqw] rounded-[2cqw] text-white text-left";
      
      const catTitle = document.createElement('span');
      catTitle.innerText = category.title;
      catTitle.className = "w-[90%]";
      
      // Chevron Icon (Pfeil)
      const chevron = document.createElement('img');
      chevron.className = "w-[5cqw] h-[5cqw] object-contain";
      chevron.src = uiAsset('arrow.left')

      catBtn.appendChild(catTitle);
      catBtn.appendChild(chevron);

      // Container für die Karten (Initial versteckt)
      const cardsWrapper = document.createElement('div');
      cardsWrapper.className = "flex-col gap-[3cqw] mt-[3cqw] hidden";

      // Toggle-Logik
      catBtn.addEventListener('click', () => {
        const isHidden = cardsWrapper.classList.contains('hidden');
        if (isHidden) {
          cardsWrapper.classList.remove('hidden');
          cardsWrapper.classList.add('flex');
          chevron.src = uiAsset('arrow.down')
        } else {
          cardsWrapper.classList.add('hidden');
          cardsWrapper.classList.remove('flex');
          chevron.src = uiAsset('arrow.left')
        }
      });

      // Die Karten generieren
      category.items.forEach(item => {
        const plainText = richTextToPlain(item.fullText);
        const card = document.createElement('div');
        card.className = "w-full bg-white p-[3cqw] rounded-[2cqw] flex flex-col gap-[1cqw] active:bg-gray-50 transition-colors hover:bg-gray-200";
        
        const title = document.createElement('h3');
        title.innerText = item.title;
        title.className = "user-font text-[#14305d] font-bold";

        const teaser = document.createElement('p');
        teaser.innerText = plainText;
        teaser.className = "user-font text-[#14305d]/80 leading-[4.5cqw] line-clamp-4"; // line-clamp kürzt den Text mit "..."

        card.appendChild(title);
        card.appendChild(teaser);

        addOpenOnTapOnly(card, () => {
          const cardOverlay = document.createElement('card-overlay-component');
          cardOverlay.args = {
            title: item.title,
            fullText: item.fullText
          };

          this.classList.add('hidden');
          const introText = document.getElementById("intro-text");
          const subIntro = document.getElementById("sub-intro");
          const searchBar = document.querySelector("searchbar-component");
          searchBar.classList.add("hidden");
          introText.classList.add("hidden");
          subIntro.classList.add("hidden");
          this.parentElement.appendChild(cardOverlay);
        });

        cardsWrapper.appendChild(card);

        // Speichern der Karte für die Suchfunktion (Memory-Referenzierung)
        this.cardElements.push({
          domElement: card,
          parentCategory: categoryWrapper,
          cardsWrapper: cardsWrapper,
          searchText: (item.title + " " + plainText).toLowerCase() // Such-Index
        });
      });

      categoryWrapper.appendChild(catBtn);
      categoryWrapper.appendChild(cardsWrapper);
      this.listContainer.appendChild(categoryWrapper);
    });
    this.appendChild(this.listContainer);
  }
}

customElements.define("accordion-element", Accordion);