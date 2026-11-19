# Prompt: Alte und neue Version sauber zusammenführen

Kopiere den folgenden Prompt in einen frischen Chat (die Dateipfade und der
Link sind bereits eingetragen):

---

## Merge-Auftrag: StreamFinder – alte und neue Version zusammenführen

### Ausgangslage

Es gibt **zwei Stände** derselben App (StreamFinder, Next.js + Capacitor):

1. **Alte Version (Referenz, vollständig):** Google-Drive-ZIP:
   `https://drive.google.com/file/d/12N28K1VedRCEoSYF88etVcqkwXphCUYm/view?usp=drive_link`
   Diese ZIP enthält den kompletten Projektstand vom 18.11.2026 **inklusive
   der fertigen Gesehen-Funktion** (Filme/Serien als gesehen markieren,
   Staffel-/Episoden-Tracking, „Weiterschauen“, Gesehen-Filter, Fire-TV-Fokus).
   Lade sie herunter und entpacke sie (ohne `node_modules/`, `.next/`,
   `out-next/`, `out/`, `android/app/build/`, `android/.gradle/` – das sind
   nur Build-Artefakte und werden neu erzeugt).

2. **Neue Version:** der aktuelle Stand in diesem Arbeitsbereich / Repo
   (`https://github.com/J0nas2254/yourstreams`).

### Auftrag

- Vergleiche beide Stände **Datei für Datei** (insbesondere `app/`, `lib/`,
  `components/`, `scripts/`, `test/`, `package.json`, `README.md`).
- Entscheide **pro Funktion**, welche Umsetzung besser ist (korrekter,
  vollständiger, sauberer, besser testbar), und übernimm jeweils die bessere.
- Führe beide Stände so zusammen, dass am Ende **nichts doppelt** vorhanden
  ist: keine doppelten Komponenten, Helper, Routen, Store-Aktionen oder
  CSS-Klassen. Doppelte Funde auflösen, nicht nebeneinander liegen lassen.
- Die App muss danach **perfekt und lauffähig** sein:
  - Gesehen-Funktion vollständig erhalten (Markieren/Rückgängig, Staffeln/
    Episoden, „Weiterschauen“, Filter, Persistenz in `localStorage`,
    Fire-TV-Bedienung mit sichtbarem Fokus).
  - Bestehendes behalten: echte TMDb-/OMDb-Daten (keine Demo-Inhalte),
    IMDb-Bewertungen, Bilder, personalisierter Feed, Haushaltsprofil.
  - Keine erfundenen Titel, Episoden oder Bewertungen.
  - README nur dort anpassen, wo die Gesehen-Funktion erklärt wird.
- Baue nichts von vorne neu und entferne keine bestehenden Funktionen.

### Kontrolle am Ende (Pflicht, alles muss grün sein)

- [ ] `npm install` läuft ohne Fehler (`package.json` und
      `package-lock.json` synchron – Lockfile ggf. mit `npm install`
      regenerieren, nicht von Hand editieren).
- [ ] `npm test` → alle Tests bestanden.
- [ ] `npx tsc --noEmit` → keine Fehler.
- [ ] `npm run build` → erfolgreich, API-Routen im Server-Build enthalten
      (`.next/required-server-files.json` zeigt Server-Modus, kein `export`).
- [ ] Browser-Stichprobe auf http://localhost:3100: Gesehen markieren +
      rückgängig, Reload → Status bleibt; Episode/Staffel/„Alle als gesehen“
      inkl. Undo; Filter „Gesehen“/„Noch nicht gesehen“; „Weiterschauen“.
- [ ] Ohne API-Schlüssel: Setup-Hinweise + 503-JSON, niemals Demo-Daten.
- [ ] `npm run build:android` + `npx cap sync android` erfolgreich.
- [ ] **Sofort committen und nach GitHub pushen**, damit kein Stand mehr
      verloren gehen kann.

Berichte am Ende kurz: Welche Version hat bei welchen Funktionen gewonnen,
was wurde als Duplikat entfernt, und welche Checks gelaufen sind.

---
