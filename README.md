# KITE Rework

KITE Rework ist eine webbasierte Visual-Novel-Anwendung, mit der interaktive
Lern-Dialoge („Novels") ohne JavaScript-Kenntnisse erstellt und gespielt werden
können. Novels werden im einfachen **Twee-Textformat** geschrieben und mit einem
Python-Skript in die App importiert — die App selbst läuft ohne Frameworks in
jedem Browser, auch auf dem Smartphone.

## Features

- **Novels spielen**: Dialoge mit Charakterbildern, Mimik, Animationen und Sound
- **Novels erstellen**: Twee-Textdateien schreiben, Bilder ablegen, `python import_novel.py` — fertig
- **Archive & Lesezeichen**: Fortschritt speichern, Novels jederzeit fortsetzen
- **Wissensbereich**: Nachschlagewerk mit Suche
- **KI-Feedback**: Analyse des gespielten Dialogs über den Kite2-Server

## Schnellstart (lokal testen)

Voraussetzungen: [Node.js](https://nodejs.org) und Python 3.x.

```bash
# 1. Abhängigkeiten installieren (nur Tailwind CSS)
npm install

# 2. CSS bauen
npx @tailwindcss/cli -i ./style.css -o ./app/tailwind.css

# 3. App starten (beliebiger statischer Server, z. B. VS Code "Live Server")
#    und app/index.html im Browser öffnen
```

## KITEditor (White-Label-Konfigurator)

Mit dem KITEditor lässt sich die App ohne Programmierkenntnisse anpassen: Die
echte KITE-App läuft in der Mitte, drumherum werden Logos, Farben, Texte und
Novels bearbeitet. Novels entstehen in einem eigenen Knoten-Editor (kein Twee).
Der Editor läuft lokal und offline und braucht nur Node.js – kein `npm install`.

```bash
node editor/server.mjs              # Editor starten: http://127.0.0.1:4173
node editor/server.mjs --build      # App ohne Oberfläche nach dist/ bauen
node dist/serve.mjs                 # gebaute App spielen: http://127.0.0.1:4174
node --test editor/test/*.test.mjs  # Tests
```

Das eigene Projekt liegt in `editor/project/` und wird mit eingecheckt: Bei jedem
Push auf `main` baut GitHub Actions daraus die App und veröffentlicht sie auf
GitHub Pages. Aufbau und
Plan: [docs/kiteditor/](docs/kiteditor/README.md).

## Ein eigenes Novel erstellen (Kurzfassung)

1. Twee-Dateien `visual_novel_meta_data.txt` und `visual_novel_event_list.txt` anlegen
2. Bilder unter `app/assets/Images/` ablegen
3. Charakter in `app/assets/json/character-info.json` eintragen (Bildpfade werden automatisch registriert)
4. `python import_novel.py <quellordner> --append` ausführen
5. App im Browser testen

Die ausführliche Anleitung für Autoren findet sich im **[Studenten-Guide](docs/student-guide.md)**,
technische Details im **[Import-Guide](docs/import-guide.md)** und der
[Architektur-Doku](docs/architecture.md).

## Projektstruktur (Überblick)

```
kite-rework/
├── app/
│   ├── index.html            # Einstiegspunkt der App
│   ├── tailwind.css          # Generiertes CSS (nicht manuell editieren)
│   ├── src/
│   │   ├── spa-main.js       # Root-Element der App
│   │   ├── scene-manager.js  # Navigation zwischen den Szenen
│   │   ├── scenes/           # Eine App-Seite = ein Ordner (Scene)
│   │   └── shared-services/  # Übergreifende Services (Laden, Speichern, Audio …)
│   └── assets/               # Bilder, Audio, Novel-Daten (JSON), Twee-Quellen
├── docs/                     # Dokumentation
├── import_novel.py           # Twee → KITE-Importer
├── style.css                 # Tailwind-Quelle (@layer utilities)
└── CHANGELOG.md              # Versionierung
```

## Deployment

Die App wird automatisch über GitHub Pages deployt (`.github/workflows/pages.yml`)
— bei jedem Push auf `main`. Die Workflow-Datei injiziert die Version aus der
`CHANGELOG.md` und die HMAC-Passphrase aus dem Repository-Secret `KITE_HMAC_SECRET`.

## Mitwirken

- Nur **vanilla JavaScript** mit Standard Custom Elements (`customElements.define`) — keine Frameworks oder externen Bibliotheken
- Styling ausschließlich über **Tailwind CSS**-Klassen; nach neuen Klassen `npx @tailwindcss/cli -i ./style.css -o ./app/tailwind.css` ausführen
- Ordner-/Namenskonventionen für Scenes, Services, Components und Handler siehe [Architektur](docs/architecture.md) bzw. `AGENT.md`
- Alle Änderungen mit einem Eintrag in der `CHANGELOG.md` dokumentieren

## Versionsgeschichte

Siehe [CHANGELOG.md](CHANGELOG.md).
