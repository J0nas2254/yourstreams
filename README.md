# StreamFinder

Filme und Serien finden – mit echten TMDb-Daten, Merkliste, Haushaltsprofil und Fire-TV-Bedienung.

## Schnellstart

```bash
npm install
npm run dev -- -p 3100
# Browser: http://localhost:3100
```

Tests / Typen / Build:

```bash
npm test
npx tsc --noEmit
npm run build
npm run start -- -p 3100
```

Android (Capacitor, statischer Export nach `out-next/`):

```bash
npm run build:android
npx cap sync android
```

> `postbuild:android` baut danach automatisch wieder den Server-Build (`.next`).

## Echte Daten (keine Demo-Inhalte)

Ohne `.env.local` mit `TMDB_API_KEY` zeigen Routen Setup-Hinweise und 503-JSON:

- Lege `.env.local` an (siehe `.env.example`).
- TMDb-Bilder, Bewertungen (TMDb ★), Verfügbarkeit (TMDb watch/providers) und Episoden sind echt.
- Es werden keine Titel, Episoden oder Bewertungen erfunden.

## Gesehen-Status (Neu)

- Auf Filmkarten und Detailseiten: **„Als gesehen markieren“** → danach ✓ **„Gesehen“**, jederzeit **„Als ungesehen markieren“**.
- Serien zusätzlich: einzelne Episoden toggeln, **„Staffel als gesehen“**, **„Alle Episoden als gesehen markieren“** (markiert die Serie als gesehen), **„Serie zurücksetzen“** als nachvollziehbares Undo.
- **Weiterschauen** (Start + Serien-Seite): teilweise gesehene Serien mit nächster noch nicht markierter Episode. Manuelle Markierung – die App erkennt keinen echten Wiedergabefortschritt beim Anbieter.
- Filter in Suche/Serien: **Alle / Nur gesehene / Noch nicht gesehen**.
- **„Für dich“** blendet gesehene Filme und vollständig gesehene Serien aus; teilweise gesehene bleiben in Weiterschauen.
- Speicherung lokal pro Haushaltsprofil, Schlüssel `sf:prefs:v2`, bleibt nach Neustart erhalten.
- Alle Aktionen haben `data-tv`-Fokus für die Fire-TV-Fernbedienung (Pfeiltasten + OK).

## TMDb-Titel-IDs

- Filme: `tmdb-movie-<id>`, Serien: `tmdb-tv-<id>`
- Serien-Episoden: `app/api/tv/[tmdbId]/season/[n]` (echte TMDb-Daten, API-Schlüssel bleibt serverseitig).
