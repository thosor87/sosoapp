# SoSo-App – Sorings Sommerfest

Web-App zur Planung und Organisation des jährlichen Sorings-Sommerfests mit ca. 80–90 Gästen. Deployed unter **[party.soring.de](https://party.soring.de)**.

## Features

- **Magic-Link-Zugang** – Ein geteilter Link für alle Gäste (`party.soring.de/?token=...`)
- **Mehrstufiges Anmeldeformular** – Familie, Essen (Kuchen/Salat), Zelten mit Duplikat-Erkennung
- **E-Mail-Bestätigungen** – Anmeldebestätigung, Änderungs- und Löschungsbenachrichtigung via EmailJS
- **Bearbeitungslink per E-Mail** – Direktlink zum Editieren der eigenen Anmeldung
- **Echtzeit-Übersicht** – Statistik-Karten, Anmeldungsliste, Essens- & Zelter-Listen mit Summen
- **Admin-Dashboard** – Ankündigungen, Ablaufplan, Anmeldungsverwaltung, Event-Einstellungen
- **Ablaufplan/Timeline** – Kategorien, Drag & Drop, öffentliche + interne Notizen
- **Interaktiver Karteneditor** – Leaflet + Geoman mit Satellit/OSM, Zeichenwerkzeuge, Kategorien
- **Social-Media-Vorschau** – OG-Meta-Tags für WhatsApp, Telegram etc.

## Tech Stack

| Bereich | Technologie |
|---------|------------|
| Framework | React 19 + TypeScript |
| Build | Vite 7 |
| Styling | Tailwind CSS v4 |
| Animation | Motion (ex Framer Motion) |
| State | Zustand |
| Routing | React Router v7 |
| Karte | react-leaflet + leaflet-geoman |
| E-Mail | EmailJS (SMTP via Goneo) |
| Backend | Firebase (Firestore + Hosting) |
| CI/CD | GitHub Actions |

## Projektstruktur

```
src/
  app/              # App-Root + Router
  components/       # Wiederverwendbare UI-Komponenten
    ui/             # Button, Input, Card, Modal, Toggle, Badge
    layout/         # Header, Footer, PageContainer
    feedback/       # Toast, LoadingScreen, ErrorBoundary
  features/
    auth/           # Magic-Link-Gate, Admin-Login, Auth-Store
    registration/   # Mehrstufiges Formular, Validierung, Store
    overview/       # Dashboard, StatCards, Listen
    timeline/       # Timeline-Editor, Timeline-Display, Store
    admin/          # Admin-Dashboard, Ankündigungen, Einstellungen
    map/            # Karten-Editor, Karten-Anzeige, Store
  pages/            # LandingPage, OverviewPage, AdminPage, NotFoundPage
  lib/
    firebase/       # Config, Firestore-Types, E-Mail-Versand
    utils/          # cn (classnames)
```

## Setup

```bash
# Dependencies installieren
npm install

# .env anlegen (siehe .env.example)
cp .env.example .env
# Firebase-Credentials eintragen

# Entwicklungsserver starten
npm run dev

# Bauen
npm run build

# Deployen
npx firebase deploy --only hosting
```

## Umgebungsvariablen

Siehe `.env.example` – benötigt Firebase- und EmailJS-Credentials:

```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_EMAILJS_SERVICE_ID=
VITE_EMAILJS_TEMPLATE_ID=
VITE_EMAILJS_PUBLIC_KEY=
```

## Firestore-Datenmodell

- **`events`** – Event-Konfiguration (Titel, Datum, Ort, Token, Ankündigungen, Timeline-Notizen)
- **`registrations`** – Anmeldungen (Familie, Essen, Zelten)
- **`timeline`** – Ablaufplan-Einträge (Zeit, Titel, Kategorie, Sichtbarkeit)
- **`maps`** – Karten-Dokumente (Shapes als GeoJSON, Kartenposition, Backups)

## Scripts

| Befehl | Beschreibung |
|--------|-------------|
| `npm run dev` | Lokaler Entwicklungsserver |
| `npm run build` | TypeScript-Check + Vite-Build |
| `npm run lint` | ESLint ausführen |
| `npm run preview` | Build-Vorschau lokal |
