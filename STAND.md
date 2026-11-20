# StreamFinder – Stand, Verlauf, Probleme, nächste Schritte

> Letzte Aktualisierung: 20.11.2026, HEAD `35df5c8` (lokal = `origin/main`, alles gepusht).
> Diese Datei ergänzt `EINWEISUNG.md` (Geräte, Befehle, eiserne Regeln – gelten weiter).
> Sie ist das Gedächtnis des Projekts: was gebaut wurde, wo es klemmt, was als Nächstes ansteht.

## 1. Projekt in Kürze (aus EINWEISUNG.md)

- **StreamFinder** – privater Haushalts-Finder für Filme & Serien (DE-only). Next.js App Router +
  TypeScript + Tailwind, PWA, Capacitor-Android-Hülle. **Kein Player**, keine Konten, keine Werbung.
- **Zielgerät:** Fire TV Cube 2. Gen (Fire OS 7.6.9.7, Android 9 / API 28) als installierte APK.
- **TV:** 1080p / 65 Zoll, Design schwarz-weiß hochwertig (Apple-TV-Gefühl), Single-Sidebar, App-Gefühl.
- **Repo:** `https://github.com/J0nas2254/yourstreams`, Arbeit direkt auf **`main`**.
- **Build-PC:** Windows, Ordner **`C:\Users\jonas\yourstreams`** (kein Leerzeichen – kein „lumi streams“!).
  Falscher Ordner `C:\WINDOWS\system32` war eine wiederkehrende Fehlerquelle (cd ohne Quotes).
- **Backend (Produktion):** `https://streamfinder-jrwh3e.freebuff.site` (Freebuff Sites).
  Vor jedem APK-Build prüfen, ob `published: true` – sonst zeigt die APK nur die Einrichtungsmeldung.
  **Wichtig:** Das Backend muss nach jedem Push neu **gepublish**t werden, sonst läuft es mit altem Code!
- **App-ID:** `de.streamfinder.app`. Node 26 LTS, JDK 21 (nicht 17!), `ANDROID_HOME` + Lizenzen.
- **Eiserne Regeln:** Keys nie in Chat/Repo/Bundle/APK (nur `.env.local` / Geräteeinstellungen /
  Hosting-Secrets); jede Änderung committen + pushen; `npm run typecheck` + `npm test` grün;
  echte TMDb-/OMDb-Daten oder ehrliche Einrichtungsmeldung – nie erfundene Inhalte.

## 2. Befehle (PowerShell, im Projektordner)

```powershell
cd C:\Users\jonas\yourstreams
git pull origin main
npm install
npm test                    # muss grün sein (derzeit 14/14)
npm run typecheck           # muss fehlerfrei sein
npm run dev -- -H 0.0.0.0 -p 3000   # lokal: http://localhost:3000 , TV: /tv , Top: /tv/top , HTML: /top120.html
```

**APK-Pipeline (Reihenfolge einhalten, erst Backend publishen!):**

```powershell
$env:NEXT_PUBLIC_API_BASE="https://streamfinder-jrwh3e.freebuff.site"
npm run build:android
npx cap sync android
cd android; .\gradlew assembleDebug; cd ..
adb install -r android\app\build\outputs\apk\debug\app-debug.apk
```

**Diagnose, wenn `git pull` scheinbar nichts Neues holt:**

```powershell
pwd
git branch --show-current
git log --oneline -5
git fetch origin
git log --oneline -5 origin/main
```

Zeigt `origin/main` oben neue Commits, die lokale Liste aber nicht → lokales `main` hängt fest.
Reparatur (verwirft lokale Änderungen – alles Wichtige liegt auf GitHub):

```powershell
git reset --hard origin/main
```

## 3. Verlauf – was seit der Einweisung gebaut wurde (älteste zuerst)

| Commit | Was |
|---|---|
| `53149fa` | Suche vereinfacht (Stand der EINWEISUNG.md) |
| `349f430` | Einweisung für neue Chats |
| `5c774c6` | Redesign monochrom-premium: Sidebar statt Top-Leiste, Genre-Filter ohne Text, TV-Fokus 1080p |
| `715f82a` | Single-Sidebar-App-Rail, Genre-Startseite, Suche-ohne-Text-Fix |
| `e65eb75` | TV: Filter-Panel ohne Text, kompakte App-Buttons |
| `c4bcb39` | TV/Suche: Filter lädt automatisch Top 220, kompaktere Optik |
| `43fccac` | TV: feste Genre-Schienen wie Netflix |
| `e45790f` | TV: Schienen laden erst bei Scrollnähe (IntersectionObserver) |
| `0b2f587` | TV: Genre + Filterkriterien gemeinsam in Top 220 |
| `2cdc9b9` | TV: Top 220 als eigene Unterseite (ersetzt) |
| `1cea169` | TV: echte Top-Unterseite `/tv/top` mit Filter + Mehr-laden |
| `955b1d5` | Detailansichten: Anbieter-Einträge sind echte Links (JustWatch-Titel-Link, sonst Suche) |
| `9edbd26` | 👍-Algorithmus: TMDb-`/similar`-Schienen + Genre-Gewichtung für „Filme für dich“ |
| `7f6de35` | Backspace-Fix: löscht wieder Zeichen statt zurückzuspringen (`lib/tv-focus.ts`) |
| `851e69e` | Android: Hardware-Zurück-Taste bleibt in der App (`@capacitor/app`-Listener) |
| `cdddaad` | **Top-Fix 1:** Discover liefert 40 statt 12 Titel/Abruf, Anreicherung parallel (10er-Blöcke) |
| `c734148` | **Top 120** statt Top 220: je 3 Discover-Seiten parallel (bis 120 sofort), Labels überall |
| `35df5c8` | **Top-120-Beweis:** Regressionstests + eigenständige verlinkte Seite `public/top120.html` |

Betroffene Kern-Dateien: `app/tv/page.tsx`, `app/tv/top/page.tsx`, `app/page.tsx`, `app/suche/page.tsx`,
`app/tv/tv.css`, `lib/tmdb.ts`, `lib/api.ts`, `lib/tv-focus.ts`, `components/tv-redirect.tsx`,
`components/title-actions.tsx`, `test/filter.test.mts`, `test/tmdb-discover.test.mts`,
`public/top120.html`.

## 4. Wo wir stehen (20.11.2026)

- **Code fertig und geprüft:** `typecheck` grün, `npm test` **14/14 grün** (12 Filter-Tests + 2 neue
  Discover-Tests, die 40 Titel/Abruf und 120 Titel aus 3 Seiten beweisen). Alles auf `main` gepusht.
- **Top 120 funktioniert im Code:** `/tv/top`, TV-Schienen, Filter-Stöbern und Web-Startseite laden je
  3 Discover-Seiten parallel → bis zu 120 Titel. Zusätzlich gibt es als unabhängigen Beweis die
  React-freie Seite **`public/top120.html`** (Genre-Dropdown, bis 120 verlinkte Karten nach `/titel`).
- **User-Seite abgeschlossen:** lokales `main` hing auf `0b2f587` fest → per `git reset --hard origin/main`
  auf `35df5c8` geholt. **Danach noch offen:** Dev-Server neu starten und
  `http://localhost:3000/top120.html` prüfen (Kopfzeile zeigt echte Titel-Anzahl).
- **Noch offen (Cube):** Backend publishen → APK-Pipeline → `adb install -r`.

## 5. Probleme – ehrlich benannt

1. **„Top zeigt nur 12“ (Hauptproblem).** Ursache im Code gefunden und behoben: `enrichWithProviders`
   schnitt jeden Discover-Abruf auf 12 Titel ab. Jetzt 40/Abruf, 3 Seiten parallel = bis 120.
   **Aber:** Der User sah weiter 12, weil (a) sein lokales `main` veraltet war und (b) das Backend
   auf dem Cube noch alten Code hatte. Stand der Prüfung: Code bewiesen (Tests), Anzeige beim User
   noch nicht bestätigt. **Nächster Schritt ist ein Sicht-Check, kein weiterer Code.**
2. **`git pull` holte scheinbar nie Neues.** Ursache: lokales `main` hing auf `0b2f587` fest
   (vermutlich früherer Abbruch/falscher Ordner). Gelöst per `reset --hard` (Abschnitt 2).
   Tritt es wieder auf → Diagnoseblock aus Abschnitt 2 schicken lassen.
3. **Falscher Ordner** (`C:\Users\jonas\your lumiStreams` mit Leerzeichen existiert nicht;
   `system32` als Fallback). Lösung: exakt `cd C:\Users\jonas\yourstreams` (ohne Quotes nötig).
4. **Backend-Publish vergessen** = APK läuft mit altem Code, egal was auf GitHub steht.
   Feste Regel: erst Dashboard-Publish, dann APK bauen.
5. **Stimmung:** User ist verärgert (0 Sterne, „dich benutz ich nie wieder“). Verständlich nach
   mehreren Runden ohne sichtbaren Fortschritt. Diese Datei ist die Antwort darauf: voller
   Überblick statt neuer Versprechen. Vertrauen zurückgewinnen geht nur über den Sicht-Check
   aus Abschnitt 4.

## 6. Nächste Schritte (Reihenfolge!)

1. [ ] Dev-Server neu starten, `http://localhost:3000/top120.html` öffnen → Zahl aus Kopfzeile melden.
2. [ ] `http://localhost:3000/tv` → Genre → Top 120 → Zahl prüfen.
3. [ ] Falls Zahl ≈ 120 (je nach Genre): Backend publishen, APK-Pipeline, Cube-Update.
4. [ ] Falls Zahl = 12: Screenshot + genaue URL/Genre schicken – dann wird an genau der Stelle
   weitergesucht (kein neues Raten).
5. [ ] Danach: User entscheidet, was als Nächstes kommt („need fixes“-Punkte sind ungeklärt –
   nie beantwortet, ob GitHub-Issues oder Geräte-Fehler gemeint waren).
