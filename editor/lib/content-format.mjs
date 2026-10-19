// Rich texts in the content files, and the conversion of the older
// plain-text formats into them.
//
// A rich text is an HTML string with only p, h2, h3, br, b, i, u and
// a[href]. The app renders it with app/src/shared-services/rich-text-service.js,
// the editor edits it with ui/src/rich-text-component.js.
//
// Pure (no Node, no DOM): used by the local server, the browser backend and
// the tests.

export const LINKS = "assets/json/links-scene-content.json";
export const KNOWLEDGE = "assets/json/knowledge.json";
export const LEGAL = "assets/json/legal-content.json";
export const ABOUT = "assets/json/about-kite-content.json";

export const escapeHtml = (text) =>
  String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// A rich text always starts with a tag; anything else is old plain text
export const isRich = (value) => typeof value === "string" && (value === "" || /^\s*</.test(value));

// Blank lines start a new paragraph, single line breaks become <br>
export function plainToRich(text) {
  return String(text ?? "")
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => `<p>${block.split("\n").map(escapeHtml).join("<br>")}</p>`)
    .join("");
}

const isSafeHref = (href) => /^(https?:|mailto:|tel:)/i.test(String(href ?? "").trim());

const link = (href, text) => `<a href="${escapeHtml(href)}">${escapeHtml(text)}</a>`;

// One paragraph of the old legal format: a string, or text / link segments
function paragraphToRich(paragraph) {
  if (typeof paragraph === "string") return `<p>${escapeHtml(paragraph)}</p>`;
  if (!Array.isArray(paragraph)) return "";
  const inner = paragraph
    .map((seg) => {
      if (typeof seg === "string") return escapeHtml(seg);
      if (seg?.type === "text" && seg.text != null) return escapeHtml(seg.text);
      if (seg?.type === "link" && seg.text && isSafeHref(seg.href)) return link(seg.href, seg.text);
      return "";
    })
    .join("");
  return `<p>${inner}</p>`;
}

// Old legal / about format: [{ heading, lines?, paragraphs? }]
export function sectionsToRich(sections) {
  return (sections ?? [])
    .map((section) => {
      let html = section.heading ? `<h2>${escapeHtml(section.heading)}</h2>` : "";
      if (section.lines?.length) html += `<p>${section.lines.map(escapeHtml).join("<br>")}</p>`;
      if (section.paragraphs?.length) html += section.paragraphs.map(paragraphToRich).join("");
      return html;
    })
    .join("");
}

// Old wiki entry: the first "(Quelle)" in the text was linked to sourceUrl
export function knowledgeToRich(item) {
  const html = plainToRich(item.fullText);
  return isSafeHref(item.sourceUrl) ? html.replace("(Quelle)", link(item.sourceUrl, "(Quelle)")) : html;
}

// Content in the current format, or null when it already was
function migrateLinks(links) {
  if (!Array.isArray(links) || links.every((link) => isRich(link.desc ?? ""))) return null;
  return links.map((link) => ({ ...link, desc: isRich(link.desc ?? "") ? link.desc : plainToRich(link.desc) }));
}

function migrateKnowledge(topics) {
  const old = (item) => "sourceUrl" in item || !isRich(item.fullText ?? "");
  if (!Array.isArray(topics) || !topics.some((topic) => topic.items?.some(old))) return null;
  return topics.map((topic) => ({
    ...topic,
    items: (topic.items ?? []).map((item) => {
      if (!old(item)) return item;
      const { sourceUrl, ...rest } = item;
      return { ...rest, fullText: isRich(item.fullText ?? "") ? item.fullText : knowledgeToRich(item) };
    }),
  }));
}

function migrateLegal(legal) {
  if (!legal || !Object.values(legal).some((block) => block?.sections)) return null;
  return Object.fromEntries(Object.entries(legal).map(([key, block]) => {
    if (!block?.sections) return [key, block];
    const { sections, ...rest } = block;
    return [key, { ...rest, html: sectionsToRich(sections) }];
  }));
}

// The about page used to have one text slot per heading and paragraph
// ("about.title", "about.<n>.heading", "about.<n>.text<m>"); they are folded
// into the about content file, whose original HTML is one <h2> per section
// followed by its <p>s.
function migrateAboutTexts(project, original) {
  const keys = Object.keys(project.texts ?? {}).filter((key) => key.startsWith("about."));
  if (keys.length === 0 || !original) return;
  const about = project.content[ABOUT] ?? structuredClone(original);
  const texts = project.texts;
  if (texts["about.title"]) about.title = texts["about.title"];
  let section = 0;
  let paragraph = 0;
  about.html = original.html.replace(/<(h2|p)>(.*?)<\/\1>/g, (whole, tag) => {
    if (tag === "h2") {
      section++;
      paragraph = 0;
    } else {
      paragraph++;
    }
    const key = tag === "h2" ? `about.${section}.heading` : `about.${section}.text${paragraph}`;
    return texts[key] ? `<${tag}>${escapeHtml(texts[key])}</${tag}>` : whole;
  });
  project.content[ABOUT] = about;
  for (const key of keys) delete texts[key];
}

// Brings an older project to the current content format, in place.
// original: the app's content files (meta.content). Returns true if changed.
export function migrateProject(project, original = {}) {
  const before = JSON.stringify(project);
  project.content ??= {};
  const steps = [[LINKS, migrateLinks], [KNOWLEDGE, migrateKnowledge], [LEGAL, migrateLegal]];
  for (const [path, migrate] of steps) {
    const next = project.content[path] && migrate(project.content[path]);
    if (next) project.content[path] = next;
  }
  migrateAboutTexts(project, original[ABOUT]);
  return JSON.stringify(project) !== before;
}
