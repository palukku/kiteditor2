// Rich texts from the content JSON files (links, knowledge, legal texts, about KITE).
// A rich text is an HTML string with only p, h2, h3, br, b, i, u and a[href].
// Everything else is dropped (its text is kept), so the JSON can never inject markup.

// Block tags and what they are rendered as
const BLOCKS = { p: "p", div: "p", h1: "h2", h2: "h2", h3: "h3", h4: "h3" };
// Inline tags and what they are rendered as
const INLINES = { b: "b", strong: "b", i: "i", em: "i", u: "u" };
// Tags whose content is not text
const DROPPED = new Set(["script", "style", "template"]);

/**
 * Escape HTML characters
 * @param {*} text
 * @returns
 */
export function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Check if the href is safe (web, mail or phone links only)
 * @param {*} href
 * @returns
 */
function isSafeHref(href) {
  return /^(https?:|mailto:|tel:)/i.test(String(href || "").trim());
}

// Parses the string without running anything (template content is inert)
function parse(html) {
  const template = document.createElement("template");
  template.innerHTML = String(html ?? "");
  return template.content;
}

// Inline content of a block: text, line breaks, bold, italic, underline and links
function renderInline(nodes, styles) {
  let out = "";
  for (const node of nodes) {
    if (node.nodeType === Node.TEXT_NODE) {
      out += escapeHtml(node.textContent);
      continue;
    }
    if (node.nodeType !== Node.ELEMENT_NODE || DROPPED.has(node.localName)) continue;
    const tag = node.localName;
    const inner = renderInline(node.childNodes, styles);
    const href = node.getAttribute("href");
    if (tag === "br") out += "<br>";
    else if (INLINES[tag]) out += `<${INLINES[tag]}>${inner}</${INLINES[tag]}>`;
    else if (tag === "a" && isSafeHref(href)) {
      out += `<a href="${escapeHtml(href.trim())}" class="${styles.a ?? ""}" target="_blank" rel="noopener noreferrer">${inner}</a>`;
    } else out += inner;
  }
  return out;
}

/**
 * Builds safe HTML for a rich text
 * @param {String} html the rich text from the JSON
 * @param {Object} styles Tailwind classes per tag: { h2, h3, p, a }
 * @returns HTML string
 */
export function renderRichText(html, styles = {}) {
  let out = "";
  let loose = [];
  // Text that is not inside a block becomes its own paragraph
  const flushLoose = () => {
    const inner = renderInline(loose, styles);
    if (inner.trim()) out += `<p class="${styles.p ?? ""}">${inner}</p>`;
    loose = [];
  };
  for (const node of parse(html).childNodes) {
    const block = node.nodeType === Node.ELEMENT_NODE && BLOCKS[node.localName];
    if (!block) {
      loose.push(node);
      continue;
    }
    flushLoose();
    out += `<${block} class="${styles[block] ?? ""}">${renderInline(node.childNodes, styles)}</${block}>`;
  }
  flushLoose();
  return out;
}

/**
 * The text of a rich text without formatting (for teasers and search)
 * @param {String} html the rich text from the JSON
 * @returns plain text, paragraphs separated by a blank line
 */
export function richTextToPlain(html) {
  const content = parse(html);
  content.querySelectorAll("br").forEach((br) => br.replaceWith("\n"));
  return [...content.childNodes]
    .map((node) => node.textContent.trim())
    .filter(Boolean)
    .join("\n\n");
}
