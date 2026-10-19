import {
  escapeHtml,
  renderDocumentBody,
} from "../../shared-services/shared-document-page-service.js";

/**
 * Build the HTML for the hexagon
 * @param {Object} novel The novel which defines the Hexes colour sceme
 * @returns The HTML Element
 */
function buildAboutKiteHexHtml(novel) {
  const fill = novel.novelColor ?? "#aa1c02";
  const stroke = novel.novelFrameColor ?? "#d04c03";
  const title = escapeHtml(novel.title ?? "Mehr zu KITE");
  return `
    <div class="relative mx-auto flex h-[26.6cqw] w-[29.6cqw] items-center justify-center">
      <svg viewBox="0 0 296 266" class="absolute inset-0 z-0 h-full w-full overflow-visible">
        <path
          d="M 96.5,0 L 209.5,0 Q 229.5,0 239.5,17.3 L 296,115.7 Q 306,133 296,150.3 L 239.5,248.7 Q 229.5,266 209.5,266 L 96.5,266 Q 76.5,266 66.5,248.7 L 10,150.3 Q 0,133 10,115.7 L 66.5,17.3 Q 76.5,0 96.5,0 Z"
          fill="${fill}"
          stroke="${stroke}"
          stroke-width="12"
        />
      </svg>
      <div class="relative z-10 w-[80%] select-none pointer-events-none text-center text-[3.6cqw] font-semibold text-white">
        ${title}
      </div>
    </div>
  `;
}
/**
 * Build the HTML for the content component
 * @param {Object} introNovel The Specification of the Intro Novel
 * @param {Object} about Title and rich text from about-kite-content.json
 * @returns The HTML Element
 */
export function buildAboutKiteContentComponent(introNovel, about) {
  return `
    <div class="flex w-full justify-center pb-[4cqw] pt-[4cqw]">
      ${buildAboutKiteHexHtml(introNovel)}
    </div>
    <p class="user-font mb-[3.2cqw] font-semibold text-[#0b1a2d]">
      ${escapeHtml(about?.title ?? "")}
    </p>
    ${renderDocumentBody(about?.html, { variant: "documentUserScalable" })}
    <div class="mt-[8cqw] flex w-full max-w-full flex-col items-center gap-[3.2cqw]">
      <button type="button" data-about-nav="novel-selector-scene"
        class="w-[62cqw] max-w-full rounded border-[0.1cqw] border-transparent bg-[#0B1A2D] px-[1.8cqw] py-[3.2cqw] text-center text-[3.2cqw] font-bold uppercase tracking-wider text-white transition-opacity active:opacity-80">
        ZUR NOVEL-AUSWAHL
      </button>
      <button type="button" data-about-nav="einstieg"
        class="w-[62cqw] max-w-full rounded border-[0.1cqw] border-[#0B1A2D] bg-transparent px-[1.8cqw] py-[3.2cqw] text-center text-[3.2cqw] font-bold uppercase tracking-wider text-[#0B1A2D] transition-opacity active:opacity-80">
        ZUR EINSTIEGSNOVEL
      </button>
      <button type="button" data-about-nav="knowledge"
        class="w-[62cqw] max-w-full rounded border-[0.1cqw] border-[#0B1A2D] bg-transparent px-[1.8cqw] py-[3.2cqw] text-center text-[3.2cqw] font-bold uppercase tracking-wider text-[#0B1A2D] transition-opacity active:opacity-80">
        ZUR WISSENSBASIS
      </button>
    </div>
  `;
}

/**
 * Connect functionalities to the buttons
 * @param {HTMLElement} hostEl the Element that contains the buttons
 * @param {Object} introNovel The Specification of the Intro Novel
 */
export function wireAboutKiteContentNavigation(hostEl, introNovel) {
  
  // Wire the novel selector button
  hostEl.querySelector('[data-about-nav="novel-selector-scene"]')?.addEventListener(
    "click",
    () => {
      hostEl.dispatchEvent(
        new CustomEvent("sm-switch-scene", {
          detail: { scene: "novel-selector-scene" },
          bubbles: true
        }),
      );
    },
  );

  // Wire the intro novel button
  hostEl.querySelector('[data-about-nav="einstieg"]')?.addEventListener(
    "click",
    () => {
      hostEl.dispatchEvent(
        new CustomEvent("sm-switch-scene", {
          detail: {
            scene: "novel-scene",
            args: { novel: introNovel, needBaseHeader: false},
          },
          bubbles: true
        }),
      );
    },
  );

  // Wire the knowledge button
  hostEl.querySelector('[data-about-nav="knowledge"]')?.addEventListener(
    "click",
    () => {
      hostEl.dispatchEvent(
        new CustomEvent("sm-switch-scene", {
          detail: { scene: "knowledge-scene" },
          bubbles: true
        }),
      );
    },
  );
}
