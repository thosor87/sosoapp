# Changelog

Alle relevanten Änderungen an der SoSo-App werden in dieser Datei dokumentiert.

## [1.5.0] – 2026-03-03

### Bearbeitungslink auf Anfrage

**Neue Features**
- Direktes Bearbeiten von der Übersichtsseite entfernt – jeder bearbeitet nur noch über seinen persönlichen Link
- Neuer Briefumschlag-Button neben jedem Eintrag: sendet auf Anfrage einen Bearbeitungslink per E-Mail
- Bestätigungs-Modal vor dem Versand (mit Name und Ansprechpartner zur Kontrolle)
- Die gesendete Mail enthält die aktuelle Anmeldungszusammenfassung (wie Bestätigung/Update-Mails)
- Hinweis-Box auf der Übersichtsseite erklärt den neuen Ablauf

---

## [1.4.1] – 2026-03-02

### Tägliches CSV-Backup & erweiterter Export

**Neue Features**
- Automatisches tägliches Backup aller Anmeldungen als CSV in separates privates Repo
- GitHub Actions Workflow mit Firebase Admin SDK (täglich 08:00 MESZ + manuell auslösbar)
- CSV-Export (Admin + Backup) um E-Mail, Angemeldet am, Zuletzt geändert erweitert

---

## [1.4.0] – 2026-03-02

### E-Mail-Bestätigungen & Bearbeitungslinks

**Neue Features**
- E-Mail-Bestätigung nach Anmeldung mit Zusammenfassung und Bearbeitungslink
- E-Mail-Benachrichtigung bei Änderung einer Anmeldung (mit aktuellem Stand)
- E-Mail-Benachrichtigung bei Löschung/Abmeldung (mit vorherigen Daten)
- E-Mail-Feld im Anmeldeformular (Pflichtfeld)
- Bearbeitungslink in E-Mails: `?edit=ID` öffnet Modal direkt auf der LandingPage
- Hinweis-Box auf Übersichtsseite: „Bitte ändere nur deine eigene Anmeldung"

**Technik**
- E-Mail-Versand via EmailJS (Free Tier, 200 Mails/Monat, kein Blaze-Plan nötig)
- EmailJS-Keys als Umgebungsvariablen (nicht im Quellcode)
- GitHub Secrets für EmailJS-Credentials in CI/CD-Pipeline
- Firestore `mail`-Collection und zugehörige Rules entfernt
- `react-router-dom` als Dependency hinzugefügt

**Bugfixes**
- Zelten-Placeholder geändert (kein Strom verfügbar)
- Modal scrollbar auf Mobilgeräten (Overlay-Scroll statt max-height)
- Edit-Link liest URL-Parameter direkt via `window.location.search`
- Shape-Resize/Vertex-Edits werden jetzt korrekt gespeichert

---

## [1.3.0] – 2026-03-01

### Sicherheit & Infrastruktur

**Sicherheit**
- Firestore Security Rules verschärft: Typ-Validierung, Wertebegrenzung, Event-Löschung gesperrt
- Catch-all-Regel sperrt Zugriff auf unbekannte Collections
- Sensible Daten (Passwörter, Token) aus Git-History entfernt
- Seed-Script liest Firebase-Config aus `.env` statt hardcoded
- API-Key-Einschränkung in Google Cloud Console

**Infrastruktur**
- GitHub Actions CI/CD-Pipeline mit automatischem Firebase-Deploy
- Lizenz auf CC BY-NC 4.0 (privat ja, kommerziell nein)
- Branch Protection: Force-Push und Branch-Löschung blockiert

**Bugfixes**
- Datumsanzeige in Event-Einstellungen: Zeitzonen-Bug behoben (UTC → lokal)
- tsconfig.node.json: scripts/ für Node-Typen inkludiert

---

## [1.2.0] – 2026-03-01

### UX-Verbesserungen

**Neue Features**
- „Wieder abmelden"-Funktion: Beim Bearbeiten einer Anmeldung kann diese mit Bestätigungsdialog zurückgezogen werden
- Burger-Menü auf Mobile/Tablet statt fixierter Bottom-Tab-Bar (kein Overlap mehr mit Eingabefeldern)
- Animierter Hamburger-Button (3 Striche → X) mit Slide-Down-Dropdown

**Verbesserungen**
- „Familienname" umbenannt in „Haushalt/Familie" (Label, Validierung, Tabellen, CSV-Export)
- Essens-Übersicht: Kuchen/Salat-Beschreibung oben hervorgehoben, Haushalt-Name klein darunter
- Placeholder im Formular: „z.B. Sorings im Norden"

**Technik**
- `deleteRegistration()` im Registration-Store (Firestore deleteDoc)
- Einheitlicher Header für alle Breakpoints (Desktop: horizontale Nav, Mobile: Burger-Menü)
- Bottom-Padding und Margin-Hacks für Bottom-Bar entfernt

---

## [1.1.0] – 2026-03-01

### Karten-Feature komplett überarbeitet

**Bugfixes**
- Karten-Shapes werden jetzt korrekt in Firestore gespeichert (Firestore-Nested-Array-Limitation umgangen durch Koordinaten-Serialisierung)
- Gespeicherte Shapes werden beim Laden auf der Karte gerendert (vorher nur im State, nicht sichtbar)
- Stabile UUIDs statt Leaflets volatiler `_leaflet_id` für Shape-Tracking
- Rotation und Verschiebung von Shapes wird korrekt persistiert (`pm:rotateend`/`pm:dragend` Events)
- Kreise behalten ihren Radius nach Speichern/Laden (shapeType + radius in Properties)

**Neue Features**
- Permanente Labels mit Kategorie-Icon direkt auf den Shapes (Editor + öffentliche Ansicht)
- Backup-Wiederherstellung synchronisiert jetzt Kartenansicht korrekt
- „Karte zurücksetzen" rendert gespeicherte Shapes wieder auf der Karte

**Technik**
- Koordinaten-Serialisierung (`JSON.stringify`/`JSON.parse`) für Firestore-Kompatibilität
- Shapes werden als editierbare Leaflet-Layer geladen (mit `_persistentId` + `_shapeProps` Tagging)
- CSS `.shape-label` Klasse für transparente Labels mit Text-Shadow

---

## [1.0.0] – 2026-03-01

### Erstveröffentlichung

**Gäste-Bereich**
- Magic-Link-Zugang (`/?token=...`) mit Token-Validierung gegen Firestore
- Mehrstufiges Anmeldeformular (4 Schritte: Familie, Essen, Zelten, Zusammenfassung)
- Duplikat-Erkennung bei Kuchen/Salat mit Hinweis auf bereits gemeldete Beiträge
- Bestehende Kuchen/Salate werden inline im jeweiligen Toggle-Bereich angezeigt
- Personenzahl beim Zelten, vorausgefüllt aus Schritt 1
- Animierte Bestätigung mit Konfetti nach erfolgreicher Anmeldung
- Echtzeit-Übersichtsseite mit Statistik-Karten (Gesamt, Erwachsene, Kinder, Zelter/Zelte)
- Anmeldungsliste mit Suche und Bearbeiten-Funktion
- Essens-Übersicht (Kuchen & Salate) und Zelter-Liste mit Summen
- Ankündigungs-Karten auf der Landing Page
- Ablaufplan/Timeline mit Kategorien und animiertem Einblenden
- Öffentliche Timeline-Notizen (oben/unten)
- Interaktive Karte (read-only) mit eingezeichneten Bereichen
- Einladungslink-Kopieren-Button im Hero-Bereich
- Datum-Anzeige aus Event-Einstellungen

**Admin-Bereich**
- Passwort-Login (Session in sessionStorage)
- Ankündigungs-Editor (CRUD, Reihenfolge, Typ, Sichtbarkeit)
- Timeline-Editor mit Zeitpunkten, Kategorien, Drag & Drop, Sichtbarkeits-Toggle
- Öffentliche + interne Notizen vor/nach dem Ablaufplan
- Orga-Notizen pro Timeline-Eintrag (nur Admin-sichtbar)
- Anmeldungsverwaltung (Tabelle, Bearbeiten, Löschen, CSV-Export)
- Karten-Editor mit Leaflet + Geoman (Zeichnen, Kategorien, Farben, Labels)
- Adress-Suche via Nominatim-Geocoding
- Satellit/OSM-Umschaltung, Kartenrotation
- Karten-Backups und Veröffentlichen-Funktion
- Event-Einstellungen (Titel, Datum, Ort, Zugangscode, Anmeldung öffnen/schließen)
- Admin-Passwort ändern

**Technik**
- React 19 + TypeScript + Vite 7
- Tailwind CSS v4 mit warmem Sommer-Farbschema
- Zustand für State-Management
- Motion für Animationen (Seitenwechsel, Counter, Stagger)
- Firebase Firestore (Echtzeit-Listener) + Hosting
- GitHub Actions CI/CD (Auto-Deploy bei Push auf main)
- OG-Meta-Tags mit Vorschaubild für WhatsApp/Social Media
- Responsive Design (Mobile-Bottom-Nav, Desktop-Top-Nav)
