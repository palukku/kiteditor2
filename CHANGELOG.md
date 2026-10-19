# Changelog

All notable changes to this project will be documented in this file. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [Unreleased]

### Added
- **KITEditor**: Dedicated editors for Links (sortable rows that open one at a
  time: title, formatted content, picture upload, picture link; page title),
  Wiki (sortable topics with sortable entries: title, formatted content) and
  the text pages Imprint, Privacy, Terms of use and About KITE (title,
  formatted content with headings). Formatting: bold, italic, underline,
  links with link text and address, headings on the text pages
- **KITEditor**: *Reset project* button in the top bar; it only resets when
  clicked again during a 5-second countdown
- **KITEditor**: Live preview for all General items: content, texts, colors,
  images and the app name show in the running app within a moment, without
  reloading it (scroll position and open sections stay); only novel changes
  still reload
- **App**: Links, wiki entries, legal texts and the About KITE page render
  formatted text (safe whitelist in `rich-text-service.js`); About KITE now
  reads `assets/json/about-kite-content.json`; the privacy info popup uses
  `toolbar.infoText` from the legal content
- **CI**: New `Validate` GitHub Actions workflow that runs on every push to
  `main` (and on pull requests): regenerates and validates the asset
  manifests, checks all JS modules for syntax errors, and verifies that every
  relative import points to an existing file
- **Completion Scene**: The "KIT thinks" loop sound (`SFX_KIThinksLoop`) now
  plays while the AI feedback is being generated and stops once the result or
  error is shown

### Changed
- **Content JSON**: `links-scene-content.json` (`desc`), `knowledge.json`
  (`fullText`, "(Quelle)" is now an inline link, `sourceUrl` removed) and
  `legal-content.json` (`html` instead of `sections`) hold rich texts;
  older KITEditor projects are converted on load

### Removed
- **KITEditor**: the generic JSON form (`json-form-component.js`) and the
  `about.*` text slots (their overrides move into the About KITE content)

---

## [1.4.0] - 2026-10-08

### Changed
- **UI Assets**: All ~60 hardcoded image paths in components were replaced by
  logical keys (`button.home`, `icon.settings`, `arrow.left`, ...) that are
  resolved by a central `ui-asset-service.js`; the service file is generated
  and validated by `import_novel.py --generate-image-paths` (fails with a
  clear error list if a referenced asset file is missing)
---

## [1.3.1] - 2026-09-30

### Fixed
- **Settings Footer**: Unified the version display in Settings with the one on
  the Legal Information screen (now `text-[3cqw]`, `font-medium` and
  `text-[#0b1a2d]/70` instead of the smaller `text-[2cqw]`)

---

## [1.3.0] - 2026-09-30

### Added
- **Automatic image registration**: The import script now regenerates
  `app/assets/json/image-paths.json` on every run by scanning
  `app/assets/Images/` recursively; new flag `--generate-image-paths`
  regenerates the file without importing a novel

### Changed
- **Documentation**: `image-paths.json` removed from all manual import steps
  (README, import guide, student guide, architecture)

### Fixed
- **Interactive Objects**: Repointed the remaining `InvestorÜberzeugen` frame
  paths in `interactive-objects-info.json` to the `Investor` folder they were
  moved to in 1.1.0

### Removed
- **Legacy assets**: Deleted seven leftover pre-1.1.0 `EventAnimations` folders
  (`BüroAnmieten`, `ElternInformieren`, `InterviewAbklären`,
  `InvestorÜberzeugen`, `MitNotarinTelefonieren`, `HonorarVerhandeln`,
  `KreditBeantragen`) whose contents already exist in the renamed folders

---

## [1.2.5] - 2026-09-29

### Fixed
- **Novel Importer**: Novel-end events are now derived from the `>>End<<` macro
  in the twee source instead of rewriting the last choices event in the array,
  which could mark the wrong passage as the novel's end

---

## [1.2.4] - 2026-09-29

### Fixed
- **Settings Footer**: Removed a duplicated `text-[3cqw]` class that was overridden by `text-[2cqw]` in the version footer

### Removed
- **Novel Importer**: Removed the unused `BIAS_MAP` constant (dead code since the
  bias list moved to `biases.txt`)

---

## [1.2.3] - 2026-09-29

### Fixed
- **Version Display**: Settings and Legal Information now show the actual app version from a central `APP_VERSION` constant that is kept in sync with CHANGELOG.md; previously both screens showed leftover version numbers from the Unity development (1.5.1 / 1.6.2) that never existed in this app's changelog

---

## [1.2.2] - 2026-09-29

### Fixed
- **Knowledge Search**: Closing a knowledge card that was opened from search results now restores the full knowledge view — the search bar reappears and the search state resets; previously the search bar stayed hidden and the category view was not rebuilt

---

## [1.2.1] - 2026-09-29

### Fixed
- **Archive Sorting**: Archive entries are now sorted newest-first (by play
  date), matching the Unity original; previously the order depended on when
  a novel was first started, not last played

---

## [1.2.0] - 2026-09-29

### Added
- **AI Feedback via Kite2 Server**: The completion scene now requests AI feedback
  from the shared Kite2 backend (kite2.site), using the same protocol as the
  Unity original: HMAC-signed session auth with a temporary bearer token
- **Prompt Service**: New `prompt-service.js` assembles the feedback prompt from
  the shared template (`prompt.txt`), the novel context and the bias list
- **Novel Context**: Novels now carry a `context` field (sourced from
  `contextForPrompt` in the novel metadata) that frames the AI analysis;
  the importer emits it automatically for future imports
- **Deployment**: GitHub Pages workflow injects the HMAC passphrase into
  `index.html` from the `KITE_HMAC_SECRET` repository secret

### Changed
- **Dialogue Transcript**: The transcript now includes character names and
  inline bias hints from the novel events, giving the AI the full context
  the prompt template announces

### Removed
- **Local Gemini Server**: Removed the unused `server/` directory (localhost
  feedback proxy); all feedback requests go to the Kite2 server

---

## [1.1.3] - 2026-09-28

### Added
- **Mapping Files**: Added `app/assets/mappings/` with `event-types.json` and
  `face-expressions.txt` as single source of truth, shared between the JS app
  and the Python novel importer
- **Mapping Service**: Added `mapping-service.js` which loads and caches the
  mapping files at app start

### Changed
- **Magic Numbers Removed**: Replaced hardcoded event type and expression IDs
  with named constants in `event-resolver-component.js`, `novel-scene.js`,
  `date-heading-component.js` and `path-finding-service.js`
- **Character Path Resolution**: `path-finding-service.js` now resolves image
  folders via `folderName` from `character-info.json` instead of a hardcoded
  if/else chain — adding a new character no longer requires code changes
- **Novel Importer**: `import_novel.py` reads the shared `face-expressions.txt`
  instead of maintaining a duplicate expression map

### Removed
- **Debug Logging**: Removed leftover `console.log`/`console.debug` statements
- **Tests**: Removed non-functional `app/tests/` directory

---

## [1.1.2] - 2026-09-23
### Added

- **Lato Web Font Integration**: Added Lato font files (Regular 400 & Bold 700) in WOFF2 format under `app/assets/Fonts/` for consistent cross-browser text rendering

### Changed

- **Unity to Tailwind Text Style Migration**: Updated text styling in dialogue components to match original Unity settings (Font Size 35, Line Spacing 1.3, Lato Regular)
  - Updated `choice-container-component.js` with `user-font` and improved button styling
  - Updated `message-container-component.js` with `leading-neutral` and `user-font` classes
  - Updated `information-popup-component.js` for consistent text display
  - Updated `person-popup-component.js` for consistent text display
- **Tailwind CSS Configuration**: Added Lato as the primary sans-serif font in both `tailwind.css` and `style.css` via `@font-face` rules and `--font-sans` variable

---

## [1.1.1] - 2026-09-22
### Changed

- **Hilfeplanung Character Adjustments**: Updated Tochter character (ID 13) appearance and positioning
  - Set fixed head to `Einstieg_Head_1.png` for Hilfeplanung novel in `path-finding-service.js`
  - Set eyebrow type to "Strong" for consistent facial expressions in `character-info-loader-service.js`
  - Adjusted vertical position from 85 to 60 for proper alignment with lamp in `character-info.json`

---

## [1.1.0] - 2026-09-18
### Added

- **Repository Integration**: Initial team-04 repository integration from GitLab with minor adjustments
- **Novel Import System**: Added novel import functionality and imported Hilfeplanung novel
- **Novel Importer feature**: Implemented a new system to import novel content dynamically
- **Project Structure**: Adapted project structure to support the new NovelImporter functionality
- **GitHub Pages Workflow**: Added `.github/workflows/pages.yml` for automated deployment
- **Documentation**: Added `docs/import-guide.md` with novel import instructions
- **Novel Data**: Added Hilfeplanung novel files in `app/assets/novels_twee/Hilfeplanung/`
  - `visual_novel_event_list.txt`
  - `visual_novel_meta_data.txt`
- **New Novel Assets**: Added Hilfeplanung character and background images
  - `app/assets/Images/Background/Hilfeplanung_BG.png`
  - `app/assets/Images/Character/ClothesImages/Hilfeplanung/Hilfeplanung_Clothes_1.png`
  - `app/assets/Images/Character/HairImages/Hilfeplanung/Hilfeplanung_Hair_1.png`
- **Python Import Script**: Added `import_novel.py` for dynamic novel import
- **Tests**: Added test files for core functionality
  - `app/tests/fetch-test.js`
  - `app/tests/image-loading-test.js`
  - `app/tests/store-test.js`

### Changed

- **Configuration**: Updated `.gitignore` and `package-lock.json`
- **JSON Data**: Updated novel and asset configuration files
  - `app/assets/json/character-info.json`
  - `app/assets/json/interactive-objects-info.json`
  - `app/assets/json/novels.json`
- **Scene Components**: Updated 11 scene and service files for novel import compatibility

### Removed

- **GitLab CI**: Removed `.gitlab-ci.yml` (replaced by GitHub Pages workflow)

### Fixed

- **Fixed GitHub Pages deployment issues**
  - Reorganized `EventAnimations` directories to remove umlauts and group shared assets:
    - `BüroAnmieten` → `Bank`
    - `InterviewAbklären` → images moved to `Presse`, `Bank`, `Honorar` (shared across novels)
    - `InvestorÜberzeugen` → `Investor`
    - `MitNotarinTelefonieren` → `Notarin`
    - `ElternInformieren` → `Eltern`
    - `HonorarVerhandeln` → `Honorar`
  - Regenerated `image-paths.json` (276 paths) to match current directory structure
  - Repaired corrupted `LeaveScene.wav` (44 bytes → valid 8864 bytes WAV file)
  - Fixed `DOMException` when loading audio files on GitHub Pages
  - Fixed image loading errors (`Logo_BGA.png`, `logo_hhn_lab.png`, `Linkedin-Triffuns.png`) with corrected paths

---

## [1.0.0] - 2026-06-24
### Added
- Initial release of KITE-Rework application

