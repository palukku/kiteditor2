// Everything in the app that the editor can re-brand, and where it lives.
// The app itself is not changed: the overlay replaces these files/strings.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const APP_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../app");

const image = (key, label, file) => ({ key, label, path: `assets/Images/${file}` });

export const IMAGE_SLOTS = [
  image("logo.circle", "Logo (start screen)", "LoadingScreen/Kite_Logo_im_Kreis.png"),
  image("logo.lettering", "Lettering (start screen)", "IconsAndLogos/Logo_Kite_Lettering_White.png"),
  image("logo.sponsor", "Sponsor logo", "IconsAndLogos/Logo_Sponsor.png"),
  image("logo.favicon", "Browser icon", "IconsAndLogos/Logo_Kite.png"),
  image("bg.dark", "Dark background", "SceneBase/Background_Blue.png"),
  image("bg.darkFlipped", "Dark background (start screen)", "SceneBase/Background_Blue_upside_down.png"),
  image("bg.bright", "Bright background", "SceneBase/Background_Bright.png"),
  image("bg.panorama", "Novel selector panorama", "FoundersBubble/Panorama.png"),
  image("bg.landscape", "Novel selector landscape", "FoundersBubble/Panorama_Landschaft.png"),
];

export const COLOR_SLOTS = [
  { key: "dark", label: "Dark surfaces", default: "#0b1a2d" },
  { key: "primary", label: "Primary text", default: "#14305d" },
  { key: "heading", label: "Headings", default: "#284673" },
  { key: "accent", label: "Accent / progress bar", default: "#f26522" },
  { key: "bubblePlayer", label: "Player speech bubble", default: "#0c447f" },
  { key: "bubbleNpc", label: "Character speech bubble", default: "#393a39" },
  { key: "bubbleInfo", label: "Info speech bubble", default: "#0e7f90" },
];

export const CONTENT_FILES = [
  { path: "assets/json/legal-content.json", label: "Legal texts" },
  { path: "assets/json/links-scene-content.json", label: "Links" },
  { path: "assets/json/knowledge.json", label: "Knowledge base" },
];

// Short UI strings. "starts" is the beginning of the string in the source
// file; the full default is read from the file so long texts are not
// duplicated here. html: the string sits in an HTML template.
const TEXT_SLOT_SOURCES = [
  { key: "start.button", label: "Start button", file: "src/scenes/start-scene/start-scene.js", starts: "STARTEN", html: true },
  { key: "about.title", label: "About page title", file: "src/scenes/about-kite-scene/content-component.js", starts: "KITE - kurz erklärt", html: true },
  { key: "consent.tos", label: "Consent: terms checkbox", file: "src/scenes/terms-consent-scene/terms-consent-scene.js", starts: "Ich stimme den" },
  { key: "consent.privacy", label: "Consent: privacy checkbox", file: "src/scenes/terms-consent-scene/terms-consent-scene.js", starts: "Ich habe die Datenschutz" },
  { key: "archive.title", label: "Archive title", file: "src/scenes/archive-scene/archive-scene.js", starts: "SPIEL-ARCHIV", html: true },
  { key: "bookmarks.title", label: "Bookmarks title", file: "src/scenes/bookmarks-scene/bookmarks-scene.js", starts: "GEMERKTE NOVELS", html: true },
  { key: "knowledge.title", label: "Knowledge title", file: "src/scenes/knowledge-scene/knowledge-scene.js", starts: "Biases im" },
  { key: "knowledge.intro", label: "Knowledge intro", file: "src/scenes/knowledge-scene/knowledge-scene.js", starts: "Wirst du anders" },
  { key: "feedback.disclaimer", label: "Feedback disclaimer", file: "src/scenes/completion-scene/completion-scene.js", starts: "Hinweis: Analyse" },
  { key: "feedback.loading", label: "Feedback loading text", file: "src/scenes/completion-scene/completion-scene.js", starts: "Das Feedback wird gerade" },
  { key: "feedback.error", label: "Feedback unavailable text", file: "src/scenes/completion-scene/completion-scene.js", starts: "Leider ist aktuell" },
];

const ABOUT_FILE = "src/scenes/about-kite-scene/content-component.js";
const readApp = (rel) => fs.readFileSync(path.join(APP_DIR, rel), "utf8");
const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

let cache = null;

export function textSlots() {
  if (cache) return cache;
  const slots = [];
  for (const source of TEXT_SLOT_SOURCES) {
    const text = readApp(source.file);
    // Up to the end of the string literal, or of the line for HTML templates
    const match = text.match(new RegExp(escapeRegExp(source.starts) + (source.html ? "" : '[^"\\\\\\n]*')));
    if (!match) continue;
    slots.push({ key: source.key, label: source.label, file: source.file, default: match[0], html: !!source.html });
  }
  // Every heading and paragraph of the about page
  const about = readApp(ABOUT_FILE).match(/const ABOUT_KITE_SECTIONS = \[([\s\S]*?)\n\];/)?.[1] ?? "";
  let section = 0;
  let paragraph = 0;
  for (const m of about.matchAll(/(heading:\s*)?"([^"\\\n]+)"/g)) {
    if (m[1]) {
      section++;
      paragraph = 0;
      slots.push({ key: `about.${section}.heading`, label: `About ${section}: heading`, file: ABOUT_FILE, default: m[2], html: false });
    } else {
      paragraph++;
      slots.push({ key: `about.${section}.text${paragraph}`, label: `About ${section}: text ${paragraph}`, file: ABOUT_FILE, default: m[2], html: false });
    }
  }
  cache = slots;
  return slots;
}
