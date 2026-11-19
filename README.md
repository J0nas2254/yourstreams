# StreamFinder

Privater Haushalts-Finder für Filme & Serien (Next.js App Router + TypeScript + Tailwind, PWA, Capacitor-Android-Hülle).
Zeigt echte Titel, Bilder, IMDb-Bewertungen und Streaming-Verfügbarkeiten in **Deutschland (DE)** – niemals Demo- oder
Beispieldaten.

- **Kein Player:** Nichts wird in der App abgespielt. Weiterleitung zum Anbieter nur über echte Links aus der API.
- **Privat:** Keine Konten, Zahlungen, Werbung oder Tracker. Dienste, Merkliste, Gesehen-Status und Interessen liegen
  nur lokal auf dem Gerät (`localStorage`). Keine Cloud-Synchronisierung in Version 1.
- **Echte Quellen:** TMDb (Titel, Bilder, Verfügbarkeit), OMDb (IMDb-Bewertung anhand der TMDb-IMDb-ID), JustWatch-Daten
  über TMDb. TMDb-Bewertungen werden immer als „TMDb“, IMDb-Werte immer als „IMDb“ beschriftet.

## Voraussetzungen

- Node.js 18+
- Für echte Daten: TMDb-Schlüssel (Pflicht), OMDb-Schlüssel (optional, für IMDb-Bewertungen)

## API-Schlüssel einrichten (lokal, privat)

Schlüssel **niemals** in den Chat, in Prompts oder in Git schreiben.

1. `.env.example` nach `.env.local` kopieren.
2. `TMDB_API_KEY` eintragen (https://www.themoviedb.org/settings/api).
3. Optional `OMDB_API_KEY` eintragen (https://www.omdbapi.com/apikey.aspx) – ohne ihn entfällt nur die IMDb-Anzeige.
4. Server neu starten.

`.env.local` steht in `.gitignore` und wird nie committet. Ohne `TMDB_API_KEY` zeigt die App eine
Einrichtungsmeldung und **keine Titel** (kein Demo-Feed). Die lokal gespeicherte Liste bleibt trotzdem sichtbar.

## Starten

```bash
npm install
npm run dev        # http://localhost:3000 (TV-Layout: /tv)
npm run build
npm start -- -p 3100
npm run typecheck  # Typprüfung
npm test           # Logik-Tests (Provider-Filter, Merklisten-Migration, Empfehlungen)
```

## Feed & Personalisierung

- **Start:** Hero-Empfehlung (echtes Backdrop), „Für meinen Haushalt“ (TMDb-Discover, auf Haushalts-Anbieter gefiltert,
  nur echte Provider-IDs), „Für dich“ (lokal berechnete Empfehlungen mit Begründung, z. B. „Weil du dich für Thriller
  interessierst“), „Im Trend“, Merkliste, „Überrasch mich“ (nur echte verfügbare Treffer).
- **Detail & Karten:** Merken, Gesehen, „Interessiert mich“ (stärkt ähnliche Genres), „Nicht interessiert“
  (blendet aus, jederzeit rückgängig). Gesehene Titel erscheinen nicht mehr als Empfehlung.
- **Gesehen-Status (Film & Serie):** Auf Karten und Detailseiten gibt es „Als gesehen markieren“ mit Häkchen und Gesehen-Badge – jederzeit per „Als ungesehen markieren“ rückgängig. Serien lassen sich zusätzlich pro Staffel oder Episode markieren (echte TMDb-Episodendaten, Staffelwahl per Pills): „Alle Episoden als gesehen markieren“ kennzeichnet die Serie als gesehen, „Als ungesehen markieren“ setzt Serie und alle Episoden nachvollziehbar zurück. Teilweise gesehene Serien erscheinen in „Weiterschauen“ mit der nächsten offenen Episode. Der Fortschritt wird nur lokal gespeichert – die App erkennt nicht, was beim Anbieter tatsächlich angesehen wurde.
- **Suche:** Filter für Film/Serie, Genre, Jahr, Anbieter, „Auf meinen Diensten“, Gesehen-Status (Alle/Nur ungesehene/Nur gesehene), „Nur inklusive“
  (Abo/kostenlos/Werbung, ohne Zusatzkosten pro Titel) und Mindest-IMDb-Bewertung. IMDb-Werte werden pro Titel
  gecacht (höchstens 1×/Tag neu abgerufen).
- **Einstellungen:** Region DE, Schlüssel-Status, Zurücksetzen lokaler Interessen.

## PWA / Offline

- Manifest (`display: "standalone"`), Icons, Service Worker für App-Shell.
- Gespeicherte Liste ist offline sichtbar; Suche, Bilder und aktuelle Verfügbarkeit brauchen Internet. Die App weist
  darauf hin, dass Offline-Daten veraltet sein können.

## Android-APK & Fire TV (Capacitor)

Die Web-App ist die einzige Codebasis; für Fire TV wird sie per Capacitor als Hülle (WebView) verpackt – kein
Rewrite, keine Google-Play-Services nötig (einziges natives Plugin: `@capacitor/browser`).

TV-Layout `/tv`: Querformat, große Schrift, Overscan-Abstand, horizontale Reihen, starker Fokus-Rahmen, Karten
vergrößern sich bei Fokus. Vollständig mit der Fire-TV-Fernbedienung bedienbar (Pfeiltasten = geometrische
Fokusbewegung in `lib/tv-focus.ts`, OK = wählen, Zurück = Dialog schließen). Suche nutzt die Bildschirmtastatur.
In der APK ohne Touchscreen startet die App automatisch auf `/tv`.

**Backend für die APK:** Die APK enthält keinen Server. Für echte Daten ein öffentlich erreichbares HTTPS-Backend
(diese App selbst gehostet) und beim Build `NEXT_PUBLIC_API_BASE` setzen. **Achtung: Schlüssel bzw. Backend-URLs
können aus einer APK ausgelesen werden – APK nicht öffentlich verteilen.**

```bash
npm run build:android   # statischer Export nach out/ (API-Routen bleiben auf dem Backend)
npx cap sync android
```

### APK bauen (Build-Rechner)

Benötigt: **JDK 17**, Android SDK (Platform, Build-Tools, Platform-Tools/`adb`), `ANDROID_HOME`, SDK-Lizenzen.
**Stand auf diesem Rechner (geprüft): JDK 25, kein Android SDK, kein `adb` – daher wurde hier kein APK gebaut.**
Sobald die Umgebung steht:

```bash
cd android
.\gradlew assembleDebug   # Windows (macOS/Linux: ./gradlew assembleDebug)
# Ergebnis: android/app/build/outputs/apk/debug/app-debug.apk
```

### Auf Fire TV installieren (Sideloading)

1. Fire TV: Einstellungen → Mein Fire TV → Entwickleroptionen → ADB-Debugging an; IP unter Info → Netzwerk notieren.
2. `adb connect <fire-tv-ip>:5555`, dann `adb install -r <apk-datei>`.
3. Öffnen unter Einstellungen → Anwendungen → Installierte Apps verwalten.

> Ein Android-APK läuft nur auf kompatiblen **Fire-OS-Geräten** und **nicht auf Vega OS**. Es gab hier **keinen Test
> auf einem echten Fire-TV-Gerät oder Emulator** – das TV-Layout wurde nur mit Tastatur im Desktop-Browser geprüft.

## Hosting (Web-Backend für Web und APK)

Die App läuft als echter Next.js-Server (OpenNext-Adapter, Cloudflare Workers) auf Freebuff Sites – inklusive aller
`/api`-Routen, damit die APK echte TMDb-Daten bekommt:

- Produktion: https://streamfinder-jrwh3e.freebuff.site (derzeit offline, privat – `published: false`)
- Vorschau: https://streamfinder-jrwh3e-preview.freebuff.site (derzeit offline)

**Server-Variablen** (Projekt → Einstellungen → Secrets, jeweils für Produktion und Vorschau):

- `TMDB_API_KEY` – Pflicht, ohne ihn antworten die API-Routen mit `503` und Einrichtungshinweis.
- `OMDB_API_KEY` – optional, nur für die IMDb-Bewertungen.

Nach dem Eintragen einmal neu deployen, damit der Wert im laufenden Worker ankommt. Schlüssel stehen nie im
Browser-Bundle, nie in der APK und nie in Git.

`NEXT_PUBLIC_API_BASE` gehört **nicht** in die Secrets: Die Variable wird beim APK-Build eingebacken und zeigt auf
das Backend.

```bash
NEXT_PUBLIC_API_BASE=https://streamfinder-jrwh3e.freebuff.site npm run build:android
npx cap sync android
```

## Tests

`npm test` (Node-Testrunner, keine Zusatzabhängigkeit): Provider-Filter (`isOnMyServices`), Suchfilter
(`applySearchFilters`), Empfehlungslogik (`scoreTitles`, `genreWeights`) und Legacy-Migration (`migrateLegacy`).

## Bewusst nicht enthalten (V1)

Keine Nutzerkonten, Zahlungen, Werbung, Tracker, Videowiedergabe, Anbieter-Logins, Scraping, inoffizielle
Streaming-APIs, erfundene Links/Bewertungen/Bilder oder Geräte-Synchronisierung.
