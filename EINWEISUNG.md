# Einweisung für einen neuen Chat (StreamFinder)

Diese Datei ist der Startpunkt, wenn ein neuer Chat / eine neue KI-Sitzung an diesem Projekt
weiterarbeitet. Alles lesen, dann erst handeln.

## 1. Worum geht es

- **Projekt:** StreamFinder – privater Haushalts-Finder für Filme & Serien (Deutschland, DE-only).
  Next.js App Router + TypeScript + Tailwind, PWA, Capacitor-Android-Hülle. **Kein Player**,
  keine Konten, keine Werbung, keine Tracker.
- **Ziel:** Echte TMDb-/OMDb-Daten auf dem **Fire TV Cube 2. Gen (AFTR, Fire OS 7 = Android 9,
  API 28, Fire OS 7.6.9.7)** als installierte APK. Danach TV-Bedienung und App-Gefühl reparieren.
- **Repo:** `https://github.com/J0nas2254/yourstreams`, Arbeit direkt auf **`main`**.
  Letzter Stand beim Schreiben: `53149fa` („Suche vereinfacht …").
- **Grundsatz:** Echte Daten, niemals Demo-/Beispielinhalte. Ohne TMDb-Key → Einrichtungsmeldung,
  keine Titel.

## 2. Geräte & Umgebung

| Was | Stand |
|---|---|
| Build-PC (User) | Windows, Ordner **`C:\Users\jonas\yourstreams`** |
| Zielgerät | Fire TV Cube 2. Gen, Fire OS 7.6.9.7 (APK-fähig, **kein** Vega OS) |
| Node.js | **26 LTS** (`@capacitor/cli` 8.6.2 + `wrangler` 4.148.0 brauchen ≥ 22) |
| Java | **JDK 21** (nicht 17! `@capacitor/android` 8 kompiliert mit 21) |
| Android | SDK (Platform, Build-Tools, Platform-Tools/`adb`), `ANDROID_HOME` gesetzt, Lizenzen akzeptiert |
| App-ID | `de.streamfinder.app`, Name „StreamFinder" (`capacitor.config.ts`, `webDir: out-next`) |
| Backend (Produktion) | `https://streamfinder-jrwh3e.freebuff.site` (Freebuff Sites, OpenNext/Cloudflare Workers). **Achtung:** Diese URL gibt es in zwei Schreibweisen im Umlauf (`freebuff.site` vs. Tippfehler `freebuck.site`) – immer `freebuff.site` verwenden. Vor APK-Build prüfen, ob das Backend `published: true` ist, sonst zeigt die APK nur die Einrichtungsmeldung. |

## 3. Ordner & wichtige Dateien

```
C:\Users\jonas\yourstreams        ← Projektwurzel (package.json, capacitor.config.ts, .env.local)
app/                              ← Seiten: page.tsx (Start), suche/, tv/ (TV-Layout), titel/, dienste/,
                                    liste/, einstellungen/, ueber/, api/ (Server-Routen, NUR Server-Build)
components/                       ← poster-card.tsx, badges.tsx, hero.tsx, title-actions.tsx, …
lib/                              ← api.ts, local-keys.ts, api-cors.ts, prefs.ts, store.ts, types.ts,
                                    tv-focus.ts (Fokus-Falle + geometrische Fokusbewegung),
                                    free-tv.ts, provider-groups.ts, filter.ts, tmdb.ts, images.ts
scripts/build-android.mjs         ← APK-Export: legt app/api kurz beiseite, exportiert nach out-next/,
                                    stellt danach alles wieder her (inkl. .next-Metadaten)
test/filter.test.mts              ← 12 Logik-Tests (node --test, keine Zusatzabhängigkeit)
android/                          ← natives Android-Projekt (Gradle). Ausgabe:
                                    android\app\build\outputs\apk\debug\app-debug.apk
```

**Anleitungs-Dateien im Repo (beachten!):** `README.md`, `ANLEITUNG-PC-VON-NULL.md`
(von Null bis Cube-App), `ANLEITUNG-FIRESTICK.md` (Weg A Silk-Browser / Weg B APK),
`PROJEKT-PROMPTS.md`, `MERGE-PROMPT.md`, `.env.example`.

**Zuletzt umgesetzt (Stand dieser Datei):**
- TV als App: linke ausklappbare Glas-Rail (Liquid-Glass wie Apple TV), Ansichten
  Entdecken/Serien/Filme/Dienste/Liste, **kein** „TV"-Punkt. Entdecken mit Genre-Rails,
  Tages-Rotation + Dedupe über alle Rails (`app/tv/page.tsx`, `app/tv/tv.css`).
- „Interessiert mich"-Algorithmus repariert: `Prefs.interestGenres`-Schnappschuss beim
  Bewerten (`lib/types.ts`, `lib/prefs.ts`, `lib/store.ts`, `app/titel/detail.tsx`).
- TV-Dialog: Fokus-Falle (`lib/tv-focus.ts`), kein Hero-Banner, Anbieter als Info-Chips
  + ein ehrlicher Titel-Link-Button.
- Suche vereinfacht (`app/suche/page.tsx`): **ein** Button (Suchen/Filtern), jedes Feld
  optional, **Anbieter-Dropdown entfernt** – Dienste laufen über Checkbox
  „Auf meinen Diensten" bzw. „Nur inklusive" (Free TV).
- CORS per Route (`lib/api-cors.ts` + OPTIONS-Handler), kein `middleware.ts`
  (schützt den statischen Capacitor-Export).
- Backend-Keys liegen auf dem Gerät (`localStorage`, Header `x-tmdb-key`/`x-omdb-key`);
  Produktion hat 0 Secrets.

## 4. Befehle (PowerShell, im Projektordner)

```powershell
cd C:\Users\jonas\yourstreams
git pull origin main
npm install            # bzw. npm ci (Lockfile beachten, nie von Hand editieren)
npm test               # muss 12/12 grün sein
npm run typecheck      # = tsc --noEmit, muss fehlerfrei sein (braucht node_modules)
npm run build          # Server-Build mit API-Routen
npm run dev -- -H 0.0.0.0 -p 3000   # lokaler Test: http://localhost:3000 und /tv
```

**APK-Pipeline (jedes Mal in dieser Reihenfolge):**

```powershell
$env:NEXT_PUBLIC_API_BASE="https://streamfinder-jrwh3e.freebuff.site"
npm run build:android      # statischer Export nach out-next/ (app/api wird automatisch beiseite gelegt + wiederhergestellt)
npx cap sync android       # kopiert out-next/ ins Android-Projekt
cd android
.\gradlew assembleDebug    # Ergebnis: android\app\build\outputs\apk\debug\app-debug.apk
adb connect <cube-ip>:5555
adb install -r android\app\build\outputs\apk\debug\app-debug.apk   # Update geht per -r drüber, kein Deinstallieren nötig
```

**Fehlerbilder:** `invalid source release: 21` → Gradle läuft nicht mit JDK 21 (`java -version`,
`JAVA_HOME` prüfen). `adb connect` scheitert → gleiche WLAN?, ADB-Debugging am Cube an?
Cube-IP unter Einstellungen → Mein Fire TV → Info → Netzwerk (Entwickleroptionen ggf. per
7× OK auf „Fire TV Cube" freischalten).

## 5. Eiserne Regeln (immer einhalten)

1. **Schlüssel nie in Chat, Prompt, Repo, Bundle oder APK.** Lokal nur `.env.local`
   (steht in `.gitignore`), auf dem Cube nur in der App unter `/einstellungen`
   (`localStorage`). Server-Keys nur als Hosting-Secrets.
2. **Jede Änderung sofort committen und nach `main` pushen**, damit nichts verloren geht.
3. **`.md`-Dateien im Repo beachten** (s. Abschnitt 3) – sie sind Teil der Absprache.
4. Handy-Layout und API-Key-Felder vor Passwort-Managern schützen
   (kein Autofill in Schlüsselfeldern).
5. Echte TMDb-/OMDb-Daten oder ehrliche Einrichtungsmeldung – niemals erfundene
   Titel, Bilder oder Bewertungen.
6. Nach Code-Änderungen: `npm run typecheck` + `npm test` (12/12) grün, dann committen/pushen.

## 6. Typischer Einstieg für den nächsten Auftrag

1. `git pull origin main`, `npm install`, Stand prüfen (`git log --oneline -5`).
2. Betroffene Dateien lesen ( erst `app/…`, `lib/…`, dann Rest) – nichts raten.
3. Klein ändern, gezielt prüfen (`typecheck` + `test`, ggf. `npm run build`),
   **committen + pushen**.
4. Betrifft es die Cube-App? Dann APK-Pipeline (Abschnitt 4) nennen und dem User
   die 6 Cube-Befehle (`pull` → `install` → `build:android` → `cap sync` →
   `assembleDebug` → `adb install -r`) zum Selbstbauen geben oder selbst bauen lassen.
5. Am Ende kurz berichten: was geändert, welche Checks grün, was der User noch
   auf dem Cube testen soll.
