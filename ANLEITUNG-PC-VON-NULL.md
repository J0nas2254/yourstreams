# StreamFinder vom Windows-PC bis auf den Fire TV Cube (2. Gen, Fire OS 7.6.9.7)

Von Null bis zur laufenden App. Für Fire TV Cube 2. Gen (AFTR, Fire OS 7 = Android 9, API 28). Diese Anleitung baut eine Debug-APK per Capacitor und lädt sie per ADB auf den Cube.

## 0. Überblick

```
Windows-PC (bauen) ---> app-debug.apk ---> per adb ---> Fire TV Cube 2. Gen
                                           |
Backend (HTTPS, diese App selbst gehostet) -+-> echte TMDb-/OMDb-Daten
```

Wichtig aus `README.md` / `.env.example`:
- Die APK enthält **keinen Server**. Ohne erreichbares HTTPS-Backend zeigt sie nur die Einrichtungsmeldung, keine Titel.
- `TMDB_API_KEY` (Pflicht) und `OMDB_API_KEY` (optional) gehören lokal in `.env.local` und beim Hosting in Secrets. **Nie in Chat, Prompt oder Git.**
- `NEXT_PUBLIC_API_BASE` wird beim APK-Build eingebacken und zeigt auf das Backend. **APK nicht öffentlich verteilen**, weil URL / Verhalten auslesbar ist.
- Aktueller Stand: Produktion und Vorschau sind absichtlich `published: false` (privat / offline). Für echte Daten auf dem Cube muss erst wieder ein Backend online sein.

## 1. Was du auf dem PC brauchst

1. **Git für Windows** (mit Git Bash, aber Befehle unten sind für PowerShell)
2. **Node.js 22 oder neuer LTS** (z. B. 24 oder 26 LTS, inklusive npm)
   ```powershell
   node -v
   npm -v
   ```
   `node -v` muss `v22.x` oder höher zeigen: `@capacitor/cli` 8 und `wrangler` 4 verlangen mindestens Node 22, mit Node 20 bricht `npx cap sync` ab.
3. **JDK 17** (genau 17, kein 21 / 25 für diesen Build)
   ```powershell
   java -version
   ```
   Es muss `17.x` dastehen. Falls mehrere Java-Versionen da sind, `JAVA_HOME` auf JDK 17 zeigen lassen.
4. **Android SDK**: Am einfachsten **Android Studio** installieren, darin SDK Manager öffnen und installieren:
   - Android SDK Platform (API 33 oder neuer reicht zum Bauen)
   - Android SDK Build-Tools
   - Android SDK Platform-Tools (`adb`)
   - SDK-Lizenzen akzeptieren
5. `ANDROID_HOME` setzen (Beispiel, Pfad anpassen):
   ```powershell
   [Environment]::SetEnvironmentVariable("ANDROID_HOME", "$env:LOCALAPPDATA\Android\Sdk", "User")
   # Danach PowerShell neu starten
   $env:ANDROID_HOME
   adb version
   ```
6. Fire TV Cube und PC im **gleichen WLAN**. Kein Gast-WLAN, kein Hotspot.

## 2. Projekt holen (von noch nichts)

PowerShell öffnen:

```powershell
cd C:\Users\jonas
git clone https://github.com/J0nas2254/yourstreams.git
cd yourstreams
npm install
```

Prüfen, dass du im richtigen Ordner bist: Dort müssen `package.json`, `app/`, `android/`, `capacitor.config.ts` liegen (`webDir: "out-next"`, App-ID `de.streamfinder.app`).

Danach einmal Kontrolle aus `package.json`:
```powershell
npm test
npm run typecheck
```

`npm test` muss grün sein, `typecheck` (`tsc --noEmit`) ohne Fehler.

## 3. API-Keys für den lokalen Test eintragen

```powershell
copy .env.example .env.local
notepad .env.local
```

Eintragen:
- `TMDB_API_KEY=` von https://www.themoviedb.org/settings/api
- `OMDB_API_KEY=` von https://www.omdbapi.com/apikey.aspx (optional, nur für IMDb-Werte)

Speichern, schließen. `.env.local` wird nie committet (steht in `.gitignore`).

Kurzer Web-Test:
```powershell
npm run dev -- -H 0.0.0.0 -p 3000
```
Browser auf `http://localhost:3000` und `http://localhost:3000/tv`. Wenn Titel kommen, stimmen die Keys. Mit `Strg+C` wieder stoppen.

Für den reinen APK-Weg reicht auch der Geräte-Key später in der App unter `/einstellungen` (wird als Header `x-tmdb-key` / `x-omdb-key` mitgeschickt, Server-Env bleibt vorrangig). Trotzdem `.env.local` für den PC-Test anlegen.

## 4. Fire TV Cube 2. Gen vorbereiten

Auf dem Cube mit der Fernbedienung:

1. `Einstellungen > Mein Fire TV > Über > Fire TV Cube` -> **7x OK drücken**, bis "Entwickler" freigeschaltet ist
2. Zurück zu `Mein Fire TV > Entwickleroptionen`:
   - `ADB-Debugging` = **AN**
   - `Apps unbekannter Herkunft` = **AN**
3. IP notieren: `Einstellungen > Mein Fire TV > Info > Netzwerk`, z. B. `192.168.1.70`
4. Bei dir steht: Fire OS `7.6.9.7`, Startseite `7201001.1` -> das ist Fire OS 7 (Android 9), also APK-fähig. Kein Vega OS (Vega beginnt mit 1 oder 2).

Tipp fürs Tippen: **Fire TV App auf dem Handy** als Tastatur benutzen.

## 5. APK bauen (auf dem PC)

Jedes Mal im Projektordner `C:\Users\jonas\yourstreams`:

```powershell
cd C:\Users\jonas\yourstreams
git pull origin main
npm install

$env:NEXT_PUBLIC_API_BASE="https://streamfinder-jrwh3e.freebuff.site"
npm run build:android
npx cap sync android

cd android
.\gradlew assembleDebug
```

Ergebnis:
```
android\app\build\outputs\apk\debug\app-debug.apk
```

Was passiert dabei (`scripts/build-android.mjs`, `next.config.js`):
- `CAPACITOR_BUILD=1` legt `app/api` kurz beiseite (Server-Routen können nicht statisch exportiert werden)
- Statischer Export nach `out-next/` (`output: "export"`, `distDir: "out-next"`, Bilder `unoptimized`)
- Danach wird `app/api` wiederhergestellt und `.next`-Metadaten für `next start` repariert (`postbuild:android`)
- `npx cap sync android` kopiert `out-next` in das Android-Projekt

Falls `.\gradlew` meckert: JDK 17 prüfen, `ANDROID_HOME` prüfen, Android Studio einmal öffnen damit SDK-Pfade angelegt sind.

## 6. APK auf den Cube laden

In PowerShell (Pfad anpassen, IP durch deine Cube-IP ersetzen):

```powershell
cd C:\Users\jonas\yourstreams
adb connect 192.168.1.70:5555
adb devices
adb install -r android\app\build\outputs\apk\debug\app-debug.apk
```

Bei `adb connect` muss `already connected` oder `connected to ...` kommen. Bei `unauthorized` die Abfrage auf dem Cube mit der Fernbedienung bestätigen und nochmal versuchen.

Update später geht genauso: neu bauen, wieder `adb install -r ...` drüber. Kein Deinstallieren nötig.

Bei Problemen:
- `adb disconnect`, dann `adb connect IP:5555` neu
- Cube und PC wirklich im gleichen Netz? Cube neu starten, Router prüfen
- Windows-Firewall: `adb` zulassen
- Nur **diese** adb-Verbindung offen halten, keine zweite parallel

## 7. App auf dem Cube öffnen und einrichten

1. Cube: `Einstellungen > Anwendungen > Installierte Apps verwalten > StreamFinder > Öffnen`
2. Die App startet ohne Touchscreen automatisch auf `/tv`: Querformat, große Schrift, Overscan-Abstand, Fokus-Rahmen
3. Bedienung: Pfeiltasten = Fokus bewegen, OK = wählen, Zurück = Dialog schließen. Suche nutzt die Bildschirmtastatur
4. Zu `Einstellungen` gehen, TMDb-Key (Pflicht) und OMDb-Key (optional) eintippen, speichern. Kurz mit "Anzeigen" prüfen
5. Keys liegen nur lokal auf dem Cube (`localStorage`). Auf geteilten Geräten nach Benutzung wieder löschen

Wenn nur die Einrichtungsmeldung kommt: Backend ist offline oder `NEXT_PUBLIC_API_BASE` zeigt auf eine offline URL. Dann erst Backend wieder `published: true` deployen, danach APK mit genau dieser URL neu bauen.

## 8. Wenn es nicht geht

- Leere Seite / keine Titel -> Backend offline, falsche `NEXT_PUBLIC_API_BASE`, oder Key fehlt / falsch
- `adb connect` scheitert -> IP falsch, Cube nicht im gleichen WLAN, ADB-Debugging aus, Cube-Neustart nötig
- `assembleDebug` scheitert -> fast immer JDK (muss 17 sein) oder SDK-Lizenzen / `ANDROID_HOME`
- App da, aber winzig / abgeschnitten -> `/tv` öffnen, Overscan ist dort schon eingerechnet
- Neue Fire TV Sticks mit Vega OS (Version beginnt mit 1/2, Namen mit SELECT / HD 2. Gen / 4K 3. Gen) können **kein** APK. Dein Cube 2. Gen mit Fire OS 7.6.9.7 ist davon **nicht** betroffen

Quellen im Repo: `README.md` (Start, Android-APK & Fire TV, Hosting), `PROJEKT-PROMPTS.md` (Kontrolle), `package.json`-Skripte, `capacitor.config.ts`, `next.config.js`, `scripts/build-android.mjs`, `.env.example`.
