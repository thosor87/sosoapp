# Changelog

Alle relevanten Änderungen an der SoSo-App werden in dieser Datei dokumentiert.

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
