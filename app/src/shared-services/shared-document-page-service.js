// Shared helpers for scrollable document-style screens (legal, about KITE, etc.):
// safe HTML for the rich-text body, optional privacy toolbar, layout shell, drag scroll.
// Used by legal sub-scenes and terms-consent-scene (accordion bodies).

import { addDragScrolling } from "./drag-scrolling-service.js";
import { uiAsset } from "./ui-asset-service.js";
import { escapeHtml, renderRichText } from "./rich-text-service.js";

const LEGAL_JSON_URL = "assets/json/legal-content.json";

// Tailwind classes per tag of the rich text, for each document variant
const VARIANT_STYLES = {
  document: {
    h2: "mt-[5.6cqw] first:mt-0 mb-[3.2cqw] text-[3.6cqw] font-bold text-[#0b1a2d]",
    h3: "mt-[4cqw] first:mt-0 mb-[2.4cqw] text-[3.4cqw] font-bold text-[#0b1a2d]",
    p: "mb-[2.4cqw] text-[3.6cqw] leading-tight text-[#0b1a2d]",
    a: "text-blue-700 underline break-words",
  },
  documentUserScalable: {
    h2: "user-font mt-[5.6cqw] first:mt-0 mb-[3.2cqw] font-bold text-[#0b1a2d]",
    h3: "user-font mt-[4cqw] first:mt-0 mb-[2.4cqw] font-bold text-[#0b1a2d]",
    p: "user-font mb-[2.4cqw] leading-tight text-[#0b1a2d]",
    a: "text-blue-700 underline break-words",
  },
  consentAccordion: {
    h2: "mt-[4cqw] first:mt-0 mb-[2cqw] text-[3cqw] font-bold text-white",
    h3: "mt-[3cqw] first:mt-0 mb-[2cqw] text-[2.9cqw] font-bold text-white",
    p: "mb-[2cqw] text-[2.85cqw] leading-snug text-white/90",
    a: "text-sky-200 underline break-words",
  },
};

export { escapeHtml };

/**
 * Build HTML for a document body (a rich text, see rich-text-service.js)
 * @param {String} html the rich text
 * @param {Object} options { variant: "document" | "documentUserScalable" | "consentAccordion" }
 * @returns
 */
export function renderDocumentBody(html, options = {}) {
  // Own wrapper, so the first heading has no top margin (first:mt-0)
  return `<div>${renderRichText(html, VARIANT_STYLES[options.variant] ?? VARIANT_STYLES.document)}</div>`;
}

/**
 * Build HTML for the privacy toolbar in the DataprivacyScene
 * @param {Object} toolbar the specifications of the toolbar
 * @returns HTML Code for the toolbar
 */
export function renderPrivacyToolbar(toolbar) {
  if (!toolbar || !toolbar.resetLabel) return "";
  return `
    <div class="mb-[6cqw] mt-[6cqw] flex w-full flex-row items-center justify-between">
      <div class="h-[6cqw] w-[6cqw] shrink-0"></div>

      <button type="button" tabindex="-1" id="reset-button" class="cursor-default select-none rounded border-[0.1cqw] border-[#0b1a2d] bg-transparent px-[4cqw] py-[3.2cqw] text-center text-[2.4cqw] font-bold uppercase tracking-wider text-[#0b1a2d]">
        ${escapeHtml(toolbar.resetLabel)}
      </button>

      <button type="button" data-info-open aria-label="Info" class="flex shrink-0 items-center justify-center transition-opacity active:opacity-70">
        <img src="${uiAsset('button.info')}" alt="" class="h-[6cqw] w-[6cqw] object-contain pointer-events-none select-none" />
      </button>
    </div>
  `;
}

/**
 * Build the HTML for the document page shell
 */
export function documentPageShell(mainColumnHtml) {
  return `
      <div class="relative flex h-full min-h-0 w-full flex-col overflow-hidden font-sans text-[#0b1a2d]">
        <div class="pointer-events-none absolute inset-0 bg-bright bg-cover"></div>
        <div class="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/40 to-transparent"></div>
        <div class="relative z-10 flex min-h-0 w-full flex-1 flex-col">
          <back-header class="w-full shrink-0"></back-header>
          <main id="document-scroll-container" class="min-h-0 flex-1 w-full overflow-x-hidden overflow-y-scroll no-scrollbar">
            <div data-document-content class="w-full text-left px-[9.6cqw] py-[4cqw] pb-[19.2cqw]">
              ${mainColumnHtml}
            </div>
          </main>
        </div>
        <div id="document-popup-container" class="pointer-events-none absolute inset-0 z-50"></div>
      </div>
    `;
}

/**
 * Attach the document page drag scroll
 * @param {*} rootEl The root Element where scrolling is added
 */
export function attachDocumentPageDragScroll(rootEl) {
  const scrollBox = rootEl.querySelector("#document-scroll-container");
  if (scrollBox) addDragScrolling(scrollBox);
}

/**
 * Fetch the legal content
 * @returns the json contents of the fetched resource
 */
export async function fetchLegalContent() {
  try {
    const res = await fetch(LEGAL_JSON_URL);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}
