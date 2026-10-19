import {
  escapeHtml,
  fetchLegalContent,
  renderDocumentBody,
} from "../../shared-services/shared-document-page-service.js";
import { uiAsset } from "../../shared-services/ui-asset-service.js";

// Accordion configuration for the terms consent scene
const ACCORDION_CONFIG = [
  { key: "nutzungsbedingungen", label: "Nutzungsbedingungen" },
  { key: "datenschutz", label: "Datenschutzerklärung" },
  { key: "impressum", label: "Impressum" },
];

// Fallback body for the accordion
const FALLBACK_BODY =
  `<p class="mb-[2cqw] text-[2.85cqw] leading-snug text-white/90">` +
  `Inhalt konnte nicht geladen werden. Du findest die Texte später unter „Rechtliche Informationen“.</p>`;

// Build the body HTML for the accordion
function buildBody(block) {
  if (!block?.html) return FALLBACK_BODY;
  return renderDocumentBody(block.html, { variant: "consentAccordion" });
}

// Build the accordion item HTML
function buildAccordionItem(label, bodyHtml) {
  return `
    <details data-terms-acc class="group w-full">
      <summary
        class="flex w-full select-none list-none items-center justify-between gap-[3cqw] py-[3.2cqw] pr-[0.5cqw] text-left text-[4cqw] font-medium text-white outline-none [&::-webkit-details-marker]:hidden"
      >
        <span>${escapeHtml(label)}</span>
        <img
          src="${uiAsset('arrow.right')}"
          alt=""
          aria-hidden="true"
          class="pointer-events-none h-[6cqw] w-[6cqw] shrink-0 object-contain group-open:hidden"
        />
        <img
          src="${uiAsset('arrow.down')}"
          alt=""
          aria-hidden="true"
          class="pointer-events-none hidden h-[6cqw] w-[6cqw] shrink-0 object-contain group-open:block"
        />
      </summary>
      <div class="pb-[3.6cqw] pt-[0.6cqw]">${bodyHtml}</div>
    </details>
  `;
}

// Mount the terms accordion into the given slot
export async function mountTermsAccordion(slotEl) {
  if (!slotEl) return;
  const data = await fetchLegalContent();
  slotEl.innerHTML = ACCORDION_CONFIG
    .map(({ key, label }) => buildAccordionItem(label, buildBody(data?.[key])))
    .join("");
}
