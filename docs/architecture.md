# Architektur

Diese Seite erklärt, wie die KITE-App aufgebaut ist — für alle, die am
JavaScript-Code arbeiten oder verstehen wollen, wie die Teile zusammenspielen.

## Grundprinzipien

1. **Keine Frameworks, keine externen Bibliotheken.** Die App benutzt nur
   Vanilla JavaScript und Standard-Web-Plattform-APIs. UI-Bausteine sind
   **Custom Elements** (`customElements.define(...)`) — die native
   Komponenten-Schnittstelle des Browsers.
   Warum: Die App muss in jedem Browser und auf jedem Smartphone laufen,
   der Build-Aufwand soll minimal bleiben und der Code soll ohne
   Framework-Wissen lesbar sein.
2. **Tailwind CSS für das gesamte Styling.** Alle Klassen stehen im
   HTML/JavaScript; eigene Wrapper (Animationen, Buttons, Panorama …)
   liegen in `@layer utilities` in der Wurzel-`style.css`.
3. **Deklarative Daten.** Novel-Inhalte, Charaktere und Mappings liegen als
   JSON/TXT-Dateien in `app/assets/` und werden zur Laufzeit geladen —
   Inhalte ändern, ohne JS anzufassen.

## Einstiegspunkt und Navigation

- `app/index.html` lädt `app/src/spa-main.js` und das generierte `tailwind.css`.
- `<spa-main>` (in `spa-main.js`) ist das Root-Element: Es initialisiert
  Einstellungen, Schriftgröße und erzeugt den `<scene-manager>`.
- `scene-manager.js` importiert alle Szenen und verwaltet den
  Navigations-Stack (`sceneHistory`). Szenen werden nicht per URL gewechselt,
  sondern über Custom Events:
  - `sm-switch-scene` → zu einer Szene wechseln (`event.detail.scene`, `event.detail.args`)
  - `sm-clear-scene` → Historie leeren

## Ordner- und Namenskonventionen

Jede App-Seite ist ein **Scene-Ordner** unter `app/src/scenes/`. Pro Ordner
gibt es genau vier Rollen von Dateien, benannt nach ihrem Zweck:

| Suffix | Rolle | Beispiel |
|---|---|---|
| `…-scene.js` | Genau eine pro Ordner; die Seite selbst | `novel-scene.js` |
| `…-service.js` | Funktionsmodul ohne Klasse; exportierte Methoden, die von der Szene getrennt bleiben sollen | `scroll-service.js` |
| `…-component.js` | Wiederverwendbares UI-Element (Custom Element) | `honeycomb-component.js` |
| `…-handler.js` | Klasse mit eigenem Konstruktor und eigenen Methoden | `animation-handler.js` |

Unterordner sind erlaubt und üblich, wenn eine Szene viele Bausteine hat
(z. B. `novel-scene/character-box-component/animation-handler/`).

## Die Szenen

| Szene | Aufgabe |
|---|---|
| `loading-scene` | Startbildschirm; lädt alle Assets vorab (Fortschrittsbalken) |
| `terms-consent-scene` | Nutzungsbedingungen + Einverständnis (erster Start) |
| `start-scene` | Startmenü |
| `novel-selector-scene` / `novel-selector-sidebar-scene` | Novel-Auswahl |
| `novel-scene` | Das eigentliche Spiel: Dialoge, Charaktere, interaktive Objekte |
| `completion-scene` | Abschluss eines Novels inkl. KI-Feedback |
| `archive-scene` / `bookmarks-scene` | Gespielte Novels (neu zuerst) / Lesezeichen |
| `knowledge-scene` | Wissensbereich mit Suche und Karten |
| `settings-scene`, `links-scene`, `about-kite-scene`, `legal-information-scene` | Einstellungen, Links, Über KITE, Impressum/Datenschutz/ToS |

## Zentrale Dienste (`app/src/shared-services/`)

- **`image-loading-service.js`** — liest `assets/json/image-paths.json` und
  lädt alle Bilder vorab in Batches zu 25 in den Browser-Cache (Grundlage
  des Lade-Fortschritts). Fehler einzelner Bilder blockieren den Start nicht.
- **`store-service.js`** — zentrale Datenschicht (Novels, Einstellungen).
- **`fetch-service.js`** — lädt JSON-Dateien aus `app/assets/json/`.
- **`mapping-service.js`** — lädt und cached die Mapping-Dateien aus
  `app/assets/mappings/` (`event-types.json`, `face-expressions.txt`) und
  ersetzt magische Zahlen durch benannte Konstanten.
- **`prompt-service.js` / `ai-feedback-service.js`** — bauen das
  Feedback-Prompt aus der Vorlage (`prompt.txt`), Novel-Kontext und
  Bias-Liste (`biases.txt`) und reden mit HMAC-Authentifizierung mit dem
  Kite2-Server.
- **`novel-session-service.js`, `progress-tracking-service.js`,
  `archive-data-service.js`, `app-settings-session-service.js`,
  `user-font-size-service.js`, `audio-playing-service.js`,
  `dialogue-skip-service`, `tap-service.js`, `drag-scrolling-service.js`** —
  Spielstand, Fortschritt, Archiv, Einstellungen, Audio und Eingabehilfen.

## Daten- und Asset-Dateien

| Pfad | Inhalt |
|---|---|
| `app/assets/json/novels.json` | Alle Novels als Event-Listen (generiert vom Importer) |
| `app/assets/json/character-info.json` | Charaktere: ID, Ordnername, Position, glasses/headset, `maxHair`/`maxClothes` |
| `app/assets/json/image-paths.json` | Pfadliste aller vorab zu ladenden Bilder (wird vom Import-Skript automatisch aus `app/assets/Images/` erzeugt) |
| `app/assets/json/knowledge.json`, `interactive-objects-info.json`, `links-scene-content.json`, `legal-content.json`, `about-kite-content.json` | Inhalte der jeweiligen Szenen; formatierte Texte sind Rich Texts (HTML mit nur `p, h2, h3, br, b, i, u, a`), dargestellt über `shared-services/rich-text-service.js` |
| `app/assets/mappings/` | `event-types.json`, `face-expressions.txt`, `biases.txt`, `prompt.txt` — gemeinsame Quelle für App **und** Python-Importer |
| `app/assets/novels_twee/` | Twee-Quelltexte der importierten Novels |
| `app/assets/Images/`, `app/assets/AudioResources/`, `app/assets/Fonts/` | Bilder, Sounds, Lato-Webfont |

Charakterbilder werden über `folderName` aus `character-info.json` aufgelöst
(`path-finding-service.js`) — ein neuer Charakter benötigt **keine**
Code-Änderung mehr, nur neue Daten- und Bilddateien.

## Novel-Datenmodell (Kurzform)

Ein Novel ist eine Liste verketteter Events in `novels.json`. Jedes Event hat
eine `id`, eine `nextId`, einen `eventType` (Bedeutungen siehe
`app/assets/mappings/event-types.json`, z. B. Dialog, Choice, Charakter
betritt die Szene …) sowie typspezifische Felder (`character`, `text`,
`expressionType`, Positionen, Audio …). Das `>>End<<`-Makro in der
Twee-Quelle markiert das Novel-Ende.

Wie Novels aus Twee-Quelltexten erzeugt werden, beschreibt der
[Import-Guide](import-guide.md); das Autorinnen-Handbuch ist der
[Studenten-Guide](student-guide.md).

## Build und Deployment

- CSS: `npx @tailwindcss/cli -i ./style.css -o ./app/tailwind.css`.
  Tailwind sucht Klassen in `./app/index.html` und `./app/src/**/*.js`
  (`@source` in `style.css`).
- Deploy: `.github/workflows/pages.yml` (GitHub Pages bei Push auf `main`);
  injiziert die App-Version aus `CHANGELOG.md` in `app-version.js` und die
  HMAC-Passphrase aus dem Secret `KITE_HMAC_SECRET` in `index.html`.
