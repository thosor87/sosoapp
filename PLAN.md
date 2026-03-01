# SoSo-App – Sorings Sommerfest-Planungs-App

## Kontext

Die Sorings-Familie organisiert jährlich ein Sommerfest mit ca. 80–90 Personen. Bisher fehlt ein zentrales Tool zur Planung: Anmeldungen, Essens-Mitbringsel, Übernachtungen (Zelten) und ein Geländeplan. Die SoSo-App löst das als moderne Web-App unter `party.soring.de`, gehostet auf Firebase.

---

## Tech Stack

| Bereich | Technologie | Begründung |
|---------|------------|------------|
| Framework | **React 19 + TypeScript** | Bestes Ökosystem für Leaflet, Motion, Zustand |
| Build | **Vite 6** | Schnell, TypeScript-nativ, Firebase-kompatibel |
| Styling | **Tailwind CSS v4** | Utility-first, CSS-first Config, kleiner Bundle |
| Animation | **Motion** (ex Framer Motion) | Deklarative React-API, AnimatePresence, Gesten |
| State | **Zustand** | ~1KB, kein Provider-Wrapping, TypeScript-first |
| Routing | **React Router v7** | Einfachste Lösung für 4 Routes |
| Karte/Zeichnen | **react-leaflet + leaflet-geoman** | Echte Satellitenkarte + Zeichenwerkzeuge |
| Geocoding | **Nominatim** (OpenStreetMap) | Kostenlos, kein API-Key nötig |
| Kartentiles | **OpenStreetMap** + **ESRI Satellite** | OSM Standard + Satellit umschaltbar, beides kostenlos |
| Backend | **Firebase** (Firestore, Hosting) | Serverless, Echtzeit, Free Tier reicht |
| CI/CD | **GitHub Actions** | Automatisches Deploy bei Push auf main |

**Keine Cloud Functions nötig** für den MVP – alles läuft client-seitig.

---

## Sprache

**Komplette App auf Deutsch** – alle UI-Texte, Buttons, Fehlermeldungen, Platzhalter.

---

## Authentifizierung

### Gäste-Zugang: Geteilter Magic Link
- Ein einziger Link für alle: `party.soring.de/?token=sommer2026`
- Token wird bei Aufruf gegen Firestore validiert
- Wird in `localStorage` gespeichert (Rückkehrer brauchen den Link nicht erneut)
- Ohne gültigen Token: freundlicher "Kein Zugang"-Hinweis

### Admin-Zugang: Passwort
- Unter `/admin` erreichbar
- Einfaches Passwort-Formular
- Passwort-Hash wird im `events`-Dokument gespeichert, client-seitig verglichen
- Admin-Session in `sessionStorage` (überlebt Refresh, nicht neue Tabs)

---

## Features & Seitenstruktur

### 1. Landing Page (`/`)
- **Hero-Sektion**: Animierter Titel "Sorings Sommerfest 2026", Datum, Ort
- **Ankündigungen**: Admin-editierbare Info-Karten (Hinweise, Neuigkeiten)
- **Anmeldeformular**: Mehrstufiges Formular (siehe unten)
- **Geländeplan**: Satellitenkarte mit eingezeichneten Bereichen (wenn veröffentlicht)

### 2. Anmeldeformular (Mehrstufig mit Animationen)
- **Schritt 1**: Familienname, Ansprechpartner, Anzahl Erwachsene, Anzahl Kinder
- **Schritt 2**: Mitbringsel – Kuchen (Checkbox + Beschreibung), Salat (Checkbox + Beschreibung)
- **Schritt 3**: Zelten (Toggle), Anzahl Zelte, Anmerkungen
- **Schritt 4**: Zusammenfassung & Absenden

### 3. Übersichtsseite (`/uebersicht`)
- **Statistik-Karten**: Gesamtzahl, Erwachsene, Kinder, Zelter (animierte Counter)
- **Anmeldungsliste**: Alle Familien mit Details, **Edit-Button pro Zeile**
- **Essens-Übersicht**: Kuchen-Liste, Salat-Liste
- **Zelter-Liste**: Wer übernachtet, wie viele Zelte

### 4. Bearbeitung von Anmeldungen
- In der Übersichtsliste hat jede Zeile einen **Bearbeiten-Button**
- Suchfeld oben zum schnellen Finden des eigenen Namens
- Klick auf Bearbeiten öffnet das Formular vorausgefüllt
- Änderungen werden in Firestore aktualisiert (kein neues Dokument)

### 5. Admin-Bereich (`/admin`)
- **Ankündigungs-Editor**: Texte hinzufügen/bearbeiten/löschen, Reihenfolge ändern, Sichtbarkeit toggeln
- **Ablaufplan / Timeline-Editor**: Vertikale Timeline mit Zeitpunkten + Beschreibungen (siehe unten)
- **Anmeldungs-Verwaltung**: Tabelle aller Anmeldungen, Bearbeiten, Löschen, CSV-Export
- **Notizen**: Freitextfelder für Orga-Notizen (neben/unter der Timeline)
- **Karten-Editor**: Adresse eingeben → Karte laden → Bereiche einzeichnen → Veröffentlichen
- **Event-Einstellungen**: Titel, Datum, Ort, Access-Token, Anmeldung öffnen/schließen

### 6. Ablaufplan / Timeline (Admin erstellt, alle sehen)

**Admin-Editor:**
- Vertikale Timeline mit eleganter Darstellung
- Zeitpunkte hinzufügen: Uhrzeit + Titel + Beschreibung (z.B. "14:00 – Ankommen & Aufbauen")
- Drag & Drop zum Umsortieren
- Zeitpunkte bearbeiten/löschen
- Notizfelder daneben/darunter für zusätzliche Orga-Infos (z.B. "Wer baut die Bühne auf?")
- Veröffentlichen-Toggle (sichtbar für Gäste oder nur intern)

**Öffentliche Ansicht (auf Landing Page):**
- Elegante vertikale Timeline mit animiertem Einblenden beim Scrollen
- Zeitpunkte als Knotenpunkte auf einer vertikalen Linie
- Abwechselnd links/rechts angeordnet (Desktop), untereinander (Mobile)
- Dezente Icons pro Kategorie (Essen, Musik, Spiele, etc.)
- Sanftes Stagger-Fade-In beim Scrollen

### 7. Karten-Feature (OpenStreetMap + Satellit + Zeichnen)

**Admin-Editor:**
1. Admin gibt Adresse ein (z.B. "Musterstraße 1, 12345 Musterstadt")
2. Nominatim-Geocoding wandelt Adresse in Koordinaten um
3. Leaflet zeigt Karte an der Position (OSM Standard oder Satellitenansicht, umschaltbar)
4. Admin kann zoomen/verschieben und zwischen Kartenansicht & Satellit wechseln
5. Zeichenwerkzeuge (via leaflet-geoman):
   - Rechtecke, Kreise, Polygone, Linien, Marker, Text-Labels
   - Vordefinierte Kategorien: Zelten, Essen, Bühne, Parkplatz, WC, Eingang, Spielplatz
   - Farbwahl, Beschriftungen
6. "Speichern" persistiert Shapes + Kartenposition in Firestore
7. "Veröffentlichen" macht die Karte für alle sichtbar

**Öffentliche Ansicht:**
- Dieselbe Leaflet-Karte, aber read-only
- Zoom/Pan möglich
- Klick auf Shapes zeigt Labels/Beschreibungen
- "Als Bild herunterladen" für WhatsApp-Sharing

---

## Datenmodell (Firestore)

### Collection: `events`
```typescript
interface EventConfig {
  id: string
  year: number                    // 2026
  title: string                   // "Sorings Sommerfest 2026"
  date: Timestamp
  location: string
  accessToken: string             // "sommer2026"
  adminPasswordHash: string
  announcements: Announcement[]
  isRegistrationOpen: boolean
  createdAt: Timestamp
  updatedAt: Timestamp
}

interface Announcement {
  id: string
  title: string
  content: string
  type: 'info' | 'warning' | 'highlight'
  order: number
  isVisible: boolean
}
```

### Collection: `registrations`
```typescript
interface Registration {
  id: string
  eventId: string
  familyName: string
  contactName: string
  adultsCount: number
  childrenCount: number
  food: {
    bringsCake: boolean
    cakeDescription: string
    bringsSalad: boolean
    saladDescription: string
  }
  camping: {
    wantsCamping: boolean
    tentCount: number
    notes: string
  }
  comments: string
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

### Collection: `timeline`
```typescript
interface TimelineItem {
  id: string
  eventId: string
  time: string                      // "14:00"
  title: string                     // "Ankommen & Aufbauen"
  description: string               // Detailtext
  category: 'general' | 'food' | 'music' | 'games' | 'ceremony' | 'other'
  order: number
  notes: string                     // Orga-Notizen (nur Admin sichtbar)
  isVisible: boolean                // Für Gäste sichtbar?
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

### Collection: `maps`
```typescript
interface MapDocument {
  id: string
  eventId: string
  name: string
  center: { lat: number; lng: number }  // Kartenposition
  zoom: number
  shapes: GeoJSONFeature[]              // Leaflet-geoman speichert als GeoJSON
  isPublished: boolean
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

---

## Projektstruktur

```
soso-app/
├── public/
│   └── favicon.svg
├── src/
│   ├── app/
│   │   ├── App.tsx                  # Root + Router
│   │   └── routes.tsx
│   ├── components/
│   │   ├── ui/                      # Button, Input, Card, Modal, Badge, Toggle
│   │   ├── layout/                  # Header, Footer, PageContainer
│   │   └── feedback/                # Toast, LoadingScreen
│   ├── features/
│   │   ├── auth/                    # MagicLinkGate, AdminLoginForm, useAuth, store
│   │   ├── registration/            # RegistrationForm (multi-step), validation, store
│   │   ├── overview/                # Dashboard, StatCards, Listen, store
│   │   ├── timeline/                # TimelineEditor, TimelineDisplay, store
│   │   ├── admin/                   # AdminDashboard, AnnouncementEditor, RegistrationManager
│   │   └── map/                     # MapEditor, MapDisplay, DrawingToolbar, store
│   ├── lib/
│   │   ├── firebase/                # config.ts, firestore.ts
│   │   └── utils/                   # cn.ts, formatters.ts
│   ├── pages/                       # LandingPage, OverviewPage, AdminPage, NotFoundPage
│   ├── styles/
│   │   └── globals.css
│   └── main.tsx
├── firebase.json
├── firestore.rules
├── .firebaserc
├── .env.example
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

---

## Design-Konzept

### Farbschema: Warme Sommerstimmung, elegant
- **Primär**: Sunset-Orange/Coral (`#F97316` Basis)
- **Sekundär**: Teal/Smaragd (`#14B8A6` Basis)
- **Akzent**: Warmes Gold (`#F59E0B`)
- **Hintergrund**: Warmes Off-White (`#FFFBF5`)
- **Neutrals**: Warm-Grau-Palette

### Animationen (dezent & professionell)
- Seitenwechsel: Fade + leichter Slide (Motion AnimatePresence)
- Statistik-Counter: Count-up beim Scrollen ins Sichtfeld
- Karten: Dezentes Hover-Lift + Schatten (Tailwind transitions)
- Formular-Schritte: Slide links/rechts
- Anmeldungsliste: Gestaffeltes Fade-in
- Submit-Button: Pulse bei Hover, Konfetti bei Erfolg

### Responsive
- **Mobile**: Bottom-Tab-Navigation (Home, Übersicht, Karte, Admin)
- **Desktop**: Top-Navigation
- Mobile-First Design mit Tailwind Breakpoints

---

## Implementierungsphasen

### Phase 1: Projekt-Setup & Grundgerüst
- Vite + React + TypeScript initialisieren
- Tailwind, Motion, Zustand, React Router, Firebase SDK installieren
- Firebase-Projekt erstellen (Firestore, Hosting)
- Ordnerstruktur anlegen, Routing-Skeleton
- Basis-UI-Komponenten (Button, Input, Card, Layout)
- Erster Deploy auf Firebase Hosting

### Phase 2: Auth + Landing Page
- Events-Dokument in Firestore anlegen
- MagicLinkGate mit Token-Validierung
- Hero-Sektion mit animiertem Titel
- Ankündigungs-Sektion (liest aus Firestore)
- Landing Page Styling

### Phase 3: Anmeldeformular
- Mehrstufiges Formular mit Step-Animationen
- Firestore Create/Update
- Validierung
- Bestätigungsscreen

### Phase 4: Übersichtsseite
- Echtzeit-Listener für Anmeldungen
- Statistik-Karten mit animierten Countern
- Anmeldungsliste mit Suche + Edit-Button pro Zeile
- Essens- und Zelter-Übersicht

### Phase 5: Admin-Bereich
- Passwort-Login
- Ankündigungs-Editor (CRUD + Reihenfolge + Sichtbarkeit)
- Anmeldungs-Verwaltung (Tabelle, Bearbeiten, Löschen, CSV-Export)
- Event-Einstellungen

### Phase 6: Timeline / Ablaufplan
- Timeline-Editor im Admin (Zeitpunkte CRUD, Drag & Drop Sortierung)
- Notizfelder für Orga-Infos neben Timeline-Einträgen
- Kategorien mit Icons (Essen, Musik, Spiele, etc.)
- Elegante öffentliche Timeline auf Landing Page (animiertes Einblenden)

### Phase 7: Karten-Feature
- Leaflet + react-leaflet + OSM Tiles + ESRI Satellite (umschaltbar)
- Nominatim-Geocoding (Adresse → Koordinaten)
- leaflet-geoman Zeichenwerkzeuge im Admin
- Speichern/Laden in Firestore (GeoJSON)
- Öffentliche Read-Only-Ansicht
- Download als Bild

### Phase 8: Polish & Launch
- Animations-Audit, Performance (Lazy Loading)
- Mobile-Testing, Accessibility
- Error Boundaries, Loading States
- SEO Meta-Tags, 404-Seite
- DNS-Konfiguration für party.soring.de

---

## Verifizierung / Testplan

1. `npm run dev` – lokaler Entwicklungsserver läuft
2. `party.soring.de/?token=sommer2026` – Zugang funktioniert
3. Ohne Token → "Kein Zugang" Seite
4. Anmeldung ausfüllen → Daten erscheinen in Firestore
5. Übersichtsseite zeigt Anmeldung in Echtzeit
6. Anmeldung per Edit-Button bearbeiten → Änderung in Firestore
7. `/admin` → Passwort-Eingabe → Admin-Dashboard
8. Ankündigung erstellen → erscheint auf Landing Page
9. Timeline-Editor: Zeitpunkt hinzufügen → erscheint auf Landing Page mit Animation
10. Karten-Editor: Adresse eingeben → Karte/Satellit → Zeichnen → Speichern → Veröffentlichen
11. Öffentliche Kartenansicht zeigt veröffentlichte Karte
12. `npm run build && firebase deploy` – erfolgreicher Deploy
13. Mobile-Test auf echtem Gerät (iOS Safari, Android Chrome)

---

> **Hinweis**: Dieser Plan wird nach Akzeptanz auch unter `soso-app/PLAN.md` im Projektverzeichnis abgelegt.
