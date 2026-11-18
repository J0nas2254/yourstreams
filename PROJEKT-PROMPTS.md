# StreamFinder – Projekt-Prompts & Kontrolle

Diese Datei sammelt alle Arbeitsaufträge (Prompts) dieses Projekts in
chronologischer Reihenfolge, damit ein frischer Chat den vollen Kontext hat.
Projekt-Repo: https://github.com/J0nas2254/yourstreams

---

## Prompt 1 (Hauptauftrag): Gesehen-Status für Filme und Serien

> Ergänzung zum bestehenden Projekt: Filme und Serien als gesehen markieren.
>
> Setze die folgenden Änderungen im bestehenden StreamFinder-Projekt um.
> Das ist eine Ergänzung, kein Neubau:
> - Prüfe zuerst den aktuellen Stand des Projekts.
> - Behalte die vorhandene Architektur, das Design und alle bisherigen
>   Anforderungen bei.
> - Baue die App nicht von vorne neu und entferne keine bestehenden Funktionen.
> - Behalte insbesondere echte Daten statt Demo-Inhalten, IMDb-Bewertungen,
>   Bilder, den personalisierten Feed, das private Haushaltsprofil und die
>   Fire-TV-Bedienung bei.
>
> ### Filme und Serien
> Filme und Serien müssen gleichwertig unterstützt werden: in Suche,
> Empfehlungen, Detailansichten, Verfügbarkeitsfiltern und Merkliste.
> Verwende dafür die vorhandenen echten Datenquellen; erfinde keine Titel,
> Episoden oder Bewertungen.
>
> ### Gesehen-Status
> - Füge auf Filmkarten und Film-Detailseiten eine gut erreichbare Aktion
>   „Als gesehen markieren“ hinzu.
> - Nach dem Markieren wird der Status sichtbar, zum Beispiel durch ein
>   Häkchen und „Gesehen“. Die Aktion muss auch rückgängig gemacht werden können.
> - Für Serien gibt es ebenfalls „Als gesehen markieren“ und
>   „Als ungesehen markieren“.
> - Wenn die verwendeten echten Serien- und Episodendaten es ermöglichen,
>   kann der Haushalt zusätzlich einzelne Staffeln oder Episoden als gesehen
>   markieren.
> - Zeige bei teilweise gesehenen Serien eine Liste „Weiterschauen“ mit der
>   nächsten noch nicht als gesehen markierten Episode. Zeige dabei nicht so,
>   als würde die App den tatsächlichen Wiedergabefortschritt beim
>   Streaminganbieter erkennen.
> - „Alle Episoden als gesehen markieren“ soll die Serie als gesehen
>   kennzeichnen. Das Rückgängigmachen muss nachvollziehbar funktionieren.
>
> ### Lokale Speicherung und Feed
> - Speichere den Gesehen-Status lokal auf dem Gerät und passend zum
>   bestehenden Haushalts-/Profilkonzept.
> - Bereits gesehene Filme sollen nicht ständig erneut in „Für dich“
>   empfohlen werden.
> - Vollständig gesehene Serien sollen ebenfalls aus normalen Empfehlungen
>   ausgeblendet werden; teilweise gesehene Serien dürfen in „Weiterschauen“
>   erscheinen.
> - Ergänze bei Bedarf einen Filter für „Gesehen“ und „Noch nicht gesehen“.
> - Der Status soll auch nach einem Neustart der App erhalten bleiben.
>
> ### Fire-TV-Bedienung und Tests
> - Alle neuen Aktionen müssen mit der Fire-TV-Fernbedienung erreichbar und
>   klar fokussiert sein.
> - Teste Markieren, Rückgängigmachen, lokale Speicherung, Filterung und den
>   Fortschritt bei Serien.
> - Aktualisiere die README nur dort, wo die neue Gesehen-Funktion erklärt
>   werden muss.
> - Ändere nur die Teile des Projekts, die für diese Ergänzung nötig sind.

### Umsetzungsstand (bereits erledigt, Stand 18.11.2026)

- Typen `TvSeasonInfo`, `TvEpisode`, `Title.tvInfo`, `Prefs.seenEpisodes`
  (lib/types.ts, lib/prefs.ts).
- Neue Server-Route `app/api/tv/[tmdbId]/season/[n]` (echte TMDb-Daten,
  API-Schlüssel bleibt serverseitig); Titel-IDs der Form `tmdb-tv-<id>`.
- `apiSeasonEpisodes`, Prefs-Helper `countSeenEpisodes` / `nextUnseenEpisode`,
  `SearchFilters.seenFilter` / `seenIds`.
- Store-Aktionen: `toggleEpisodeSeen`, `setSeasonSeen`, `markSeriesSeen`,
  `unmarkSeries`; Reset löscht auch `seenEpisodes`.
- `components/episode-tracker.tsx` (+ `useSeriesEpisodes`), `TitleActions`
  mit `tvMode`, Detailseite mit Serien-Fortschritt, „Weiterschauen“ auf
  Start- und TV-Seite, Gesehen-Filter, Gesehen-Badges auf Suche/Karten/TV/Liste.
- Tests: 11/11 bestanden (`npm test`), `tsc` sauber.
- Statischer Export landet in `out-next/` (Capacitor `webDir: "out-next"`);
  `scripts/build-android.mjs` versteckt `app/api` während des Exports;
  `postbuild:android` baut danach automatisch wieder den Server-Build.
- WICHTIG: Ohne `.env.local` mit `TMDB_API_KEY` zeigen Routen Setup-Hinweise
  und 503-JSON (keine Demo-Daten). Befehle: `npm test`, `npx tsc --noEmit`,
  `npm run build`, `npm run build:android`, `npx cap sync android`,
  `npm run start -- -p 3100`.

---

## Prompt 2: Ausführen zum Testen

> Wie führe ich es zum Testen aus?

Antwort war: `npm install` (einmalig), `npm run dev -- -p 3100`, Browser auf
http://localhost:3100; Tests mit `npm test`; Gesehen-Funktion über
Detailseiten, Filter in `/suche`, Persistenz per Reload prüfen;
Produktions-Build mit `npm run build` + `npm run start -- -p 3100`;
Android via `npm run build:android` + `npx cap sync android`.

---

## Prompt 3: Alles in ein neues GitHub-Repo

> Füge alle Dateien in ein neues GitHub-Repo.

Ergebnis: öffentliches Repo **https://github.com/J0nas2254/yourstreams**
(`streamfinder` war bereits vergeben). Enthält `.gitignore` (keine Secrets,
kein `node_modules`, keine Build-Artefakte). Hinweis: Der Cloud-Arbeitsbereich
wurde am 18.11.2026 zurückgesetzt – der vollständige Quellcode liegt auf dem
lokalen Windows-PC und muss von dort gepusht werden (siehe Prompt 6).

---

## Prompt 4: PWA öffnen

> Wie öffne ich jetzt die PWA?

Antwort war: Aktuell keine installierbare PWA (kein Web-App-Manifest, nur
Service-Worker-Anmelder `sw-register.tsx`). Nutzung über Dev-Server-URL;
Handy im gleichen WLAN über Rechner-IP. Offene Option: Manifest, Icons und
Offline-Caching nachrüsten.

---

## Prompt 5: Wo Befehle ausführen / Mac-Anleitung

> Wo muss ich den Befehl ausführen? / Ich machs am Mac.

Antwort war: Im Terminal im Projektordner (dort, wo `package.json` liegt);
auf dem Mac: Xcode-Command-Line-Tools/Node.js LTS, dann
`git clone https://github.com/J0nas2254/yourstreams.git`,
`cd yourstreams`, `npm install`, `npm run dev -- -p 3100`,
Browser http://localhost:3100.
Feststellung dabei: Der Klon enthielt nur 2 Dateien (Folge des
Arbeitsbereich-Resets) – erst den vollständigen Stand vom Win-PC pushen.

---

## Prompt 6: Stand auf dem Win-PC (aktuell)

> Der Quellcode scheint auf dem Windows-PC noch da zu sein.

Anleitung: In Freebuff Desktop bzw. im Explorer den Projektordner prüfen
(`package.json`, `app/`-Ordner). Wenn vorhanden, im Terminal dort:

```powershell
gh auth login
git remote add origin https://github.com/J0nas2254/yourstreams.git
git add -A
git commit -m "Kompletter Projektstand"
git push -u origin main
```

(Falls origin schon existiert: `git remote set-url origin ...` verwenden.)
Danach vom Mac neu klonen.

---

## Kontrolle am Ende (Checkliste für den frischen Chat)

Vor Abschluss jeder Änderung prüfen:

- [ ] `npm test` → 11/11 bestanden (Markieren, Rückgängigmachen, Filter,
      Serien-Fortschritt, Migration).
- [ ] `npx tsc --noEmit` → keine Fehler.
- [ ] `npm run build` → erfolgreich (Server-Build, API-Routen enthalten).
- [ ] Stichprobe im Browser (http://localhost:3100): Gesehen markieren,
      rückgängig machen, Reload → Status bleibt (`sf:prefs:v2`);
      Episoden/Staffel/„Alle als gesehen“ inkl. Undo; Gesehen-Filter;
      „Weiterschauen“ zeigt nächste offene Episode.
- [ ] Ohne API-Schlüssel: Setup-Hinweise + 503-JSON, keine Demo-Daten.
- [ ] README nur im Gesehen-Abschnitt geändert; keine Architektur- oder
      Design-Brüche; Fire-TV-Fokus (`data-tv`) auf allen neuen Aktionen.
- [ ] Falls Android-Build lief: `npm run build:android` +
      `npx cap sync android` erfolgreich; danach `.next` wieder Server-Build
      (wird automatisch via `postbuild:android` hergestellt).
- [ ] **Jede Code-Änderung sofort committen und pushen**, damit kein Stand
      mehr verloren gehen kann.
