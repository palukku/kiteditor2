import { h } from "./dom-service.js";

// Rich texts (see lib/content-format.mjs): HTML strings with only p, h2, h3,
// br, b, i, u and a[href]. Stored strings and edited DOM are both rebuilt
// node by node with h(), so nothing from the user ever goes in as HTML.

const BLOCKS = { p: "p", div: "p", h1: "h2", h2: "h2", h3: "h3", h4: "h3" };
const INLINES = { b: "b", strong: "b", i: "i", em: "i", u: "u" };
// Tags whose content is not text
const DROPPED = new Set(["script", "style", "template"]);

export const isSafeHref = (href) => /^(https?:|mailto:|tel:)/i.test(String(href ?? "").trim());

// "www.x.de" → "https://www.x.de"; mail addresses get "mailto:"
export function normalizeHref(href) {
  const value = String(href ?? "").trim();
  if (!value || isSafeHref(value)) return value;
  return value.includes("@") && !value.includes("/") ? `mailto:${value}` : `https://${value}`;
}

// Browsers sometimes format with <span style> instead of tags
function inlineTag(el) {
  const tag = el.localName;
  if (INLINES[tag]) return INLINES[tag];
  if (tag !== "span") return null;
  const { fontWeight, fontStyle, textDecorationLine, textDecoration } = el.style;
  if (fontWeight === "bold" || Number(fontWeight) >= 600) return "b";
  if (fontStyle === "italic") return "i";
  if (`${textDecorationLine} ${textDecoration}`.includes("underline")) return "u";
  return null;
}

function cleanInline(nodes) {
  const out = [];
  for (const node of nodes) {
    if (node.nodeType === Node.TEXT_NODE) {
      // Typing in the editor leaves non-breaking spaces; in the app they would stop line wrapping
      out.push(node.textContent.replace(/\u00a0/g, " "));
      continue;
    }
    if (node.nodeType !== Node.ELEMENT_NODE || DROPPED.has(node.localName)) continue;
    const children = cleanInline(node.childNodes);
    const tag = inlineTag(node);
    const href = node.getAttribute("href");
    if (node.localName === "br") out.push(h("br"));
    else if (tag) out.push(h(tag, null, children));
    else if (node.localName === "a" && isSafeHref(href)) out.push(h("a", { href: href.trim() }, children));
    else out.push(...children);
  }
  return out;
}

// Whitelisted block elements for the given nodes; without headings h2/h3 become paragraphs
function cleanBlocks(nodes, headings) {
  const blocks = [];
  let loose = [];
  // Text that is not inside a block becomes its own paragraph
  const flushLoose = () => {
    const inline = cleanInline(loose);
    if (inline.some((n) => typeof n !== "string" || n.trim())) blocks.push(h("p", null, inline));
    loose = [];
  };
  for (const node of nodes) {
    const block = node.nodeType === Node.ELEMENT_NODE && BLOCKS[node.localName];
    if (!block) {
      loose.push(node);
      continue;
    }
    flushLoose();
    blocks.push(h(headings || block === "p" ? block : "p", null, cleanInline(node.childNodes)));
  }
  flushLoose();
  return blocks;
}

// Stored string → elements to show in the editor (parsed inert, then rebuilt)
export function richTextNodes(html, headings) {
  const doc = new DOMParser().parseFromString(String(html ?? ""), "text/html");
  return cleanBlocks(doc.body.childNodes, headings);
}

// Edited elements → string to store; "" when there is no text at all
export function serializeRichText(container, headings) {
  const holder = h("div", null, cleanBlocks(container.childNodes, headings));
  return holder.textContent.trim() ? holder.innerHTML : "";
}
