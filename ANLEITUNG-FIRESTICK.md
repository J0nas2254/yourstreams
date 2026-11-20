# StreamFinder: Vom MacBook oder PC auf den Fire TV Stick

Zwei Wege, vom einfachen Test bis zur festen App. Nichts davon macht die Seite öffentlich.

## Weg A: Schnell testen (empfohlen für den Anfang)

MacBook **oder** Windows-PC bleibt der Server, der Fire TV Stick öffnet die Seite nur im Silk-Browser im gleichen WLAN.

### 1a. MacBook vorbereiten

```bash
cd yourstreams
git pull origin main
npm install
npm run dev -- -H 0.0.0.0 -p 3000
```

Terminal offen lassen. Test auf dem Mac: `http://localhost:3000` muss laden.

### 1b. Windows-PC vorbereiten (statt MacBook)

PowerShell im Projektordner öffnen (dort, wo `package.json` liegt, z. B. `C:\Users\jonas\yourstreams`):

```powershell
cd C:\Users\jonas\yourstreams
git pull origin main
npm install
npm run dev -- -H 0.0.0.0 -p 3000
```

PowerShell-Fenster offen lassen. Test auf dem PC: `http://localhost:3000` muss laden.

Beim ersten Start fragt Windows evtl. nach Firewall-Zugriff -> `Zugriff zulassen` (private Netzwerke).

### 2. IP vom Mac / PC finden

- Mac: `Systemeinstellungen > WLAN > Details` beim verbundenen WLAN, z. B. `192.168.1.50`. Aufschreiben.
- Windows-PC: PowerShell `ipconfig` eingeben, bei WLAN-Adapter nach `IPv4-Adresse` schauen, z. B. `192.168.1.60`. Alternativ `Einstellungen > Netzwerk und Internet > WLAN > Hardwareeigenschaften`.

### 3. Fire TV Stick öffnen

1. Stick und MacBook / PC ins gleiche WLAN (kein Gast-WLAN, kein Hotspot).
2. App **Silk Browser** öffnen (vorinstalliert, sonst aus dem Amazon Appstore laden).
3. In die Adresszeile eingeben (eigene IP einsetzen):

```text
http://192.168.1.50:3000
```

Port `:3000` nicht vergessen. Für das TV-Layout hinten `/tv` anhängen:

```text
http://192.168.1.50:3000/tv
```

4. Im Silk-Menü (3 Punkte) als **Lesezeichen** speichern, dann muss die IP nicht jedes Mal neu getippt werden.

Tipp: Tippen mit der Fernbedienung ist mühsam. Die **Fire TV App auf dem Handy** als Tastatur / zum Einfügen benutzen.

### 4. API-Keys auf dem Stick eingeben

Keys liegen nur in dem Browser, wo sie eingetippt werden. Auf dem Fire TV also einmal neu:

1. Auf dem Stick zu `/einstellungen` gehen.
2. TMDb-Key (Pflicht) und OMDb-Key (optional) eintippen, speichern.
3. Kurz mit „Anzeigen“ prüfen, Status muss „gespeichert“ sagen.

Keys niemals in den Chat, in E-Mails oder in Git schreiben.

### Wenn es nicht lädt

- Gleiches WLAN? Auf beiden Geräten prüfen.
- Mac schläft ein? `Systemeinstellungen > Energie` bzw. Deckel offen lassen. PC schläft ein? `Einstellungen > System > Energie` auf `Nie` für den Test.
- Mac-Firewall blockt? `Systemeinstellungen > Netzwerk > Firewall` testweise aus, dann erneut versuchen.
- Windows-Firewall blockt? `Windows-Sicherheit > Firewall` -> Node.js zulassen, oder testweise privates Netzwerk freigeben.
- Anderer Port belegt? Dann z. B. `-p 3100` nehmen und auf dem Stick `http://IP:3100` öffnen.

Nachteil von Weg A: MacBook / PC muss an und im gleichen WLAN bleiben.

---

## Weg B: Feste App als APK (ohne MacBook / PC schauen)

Die Web-App wird per Capacitor als Hülle (WebView) verpackt. Die APK enthält **keinen Server**: Für echte Daten braucht sie ein erreichbares HTTPS-Backend (diese App selbst gehostet) und beim Build `NEXT_PUBLIC_API_BASE`.

Aktuell sind beide Freebuff-Umgebungen auf Wunsch **offline / privat**:

- Produktion: `https://streamfinder-jrwh3e.freebuff.site` (`published: false`)
- Vorschau: `https://streamfinder-jrwh3e-preview.freebuff.site` (`published: false`)

Solange das Backend offline ist, zeigt die APK nur die Einrichtungsmeldung, keine Titel. Erst Backend wieder publishen (oder eigenes Heim-Backend), dann APK bauen.

### 1. Voraussetzungen auf Mac oder PC (einmalig)

- Node.js 22+ LTS (Mac zusätzlich: Xcode Command Line Tools)
- **JDK 21** (`@capacitor/android` 8 kompiliert mit Java 21), Android SDK (Platform, Build-Tools, Platform-Tools / `adb`), `ANDROID_HOME` gesetzt, SDK-Lizenzen akzeptiert

Prüfen mit (Mac: Terminal, PC: PowerShell):

```bash
java -version
adb version
```

```bash
# nur Mac:
echo $ANDROID_HOME
```

```powershell
# nur Windows-PC:
$env:ANDROID_HOME
```

### 2. APK bauen

```bash
cd yourstreams
git pull origin main
npm install

# Backend-URL einbacken (Beispiel Produktion):
NEXT_PUBLIC_API_BASE=https://streamfinder-jrwh3e.freebuff.site npm run build:android
npx cap sync android

cd android
./gradlew assembleDebug      # Mac/Linux
.\gradlew assembleDebug     # Windows-PC (PowerShell)
# Ergebnis: android/app/build/outputs/apk/debug/app-debug.apk
```

Hinweise:

- `npm run build:android` legt `app/api` kurz beiseite und exportiert statisch nach `out-next/`. Danach wird der Server-Build automatisch wiederhergestellt (`postbuild:android`).
- `NEXT_PUBLIC_API_BASE` wird in die APK eingebacken. **APK nicht öffentlich verteilen**, URLs / Keys lassen sich auslesen.
- Schlüssel gehören **nicht** in die APK und nicht in Git: lokal in `.env.local`, beim Hosting unter Secrets (`TMDB_API_KEY` Pflicht, `OMDB_API_KEY` optional).

### 3. APK auf den Stick laden (Sideloading)

1. Fire TV: `Einstellungen > Mein Fire TV > Entwickleroptionen > ADB-Debugging` an. IP unter `Info > Netzwerk` notieren.
2. Auf dem Mac / PC (Terminal bzw. PowerShell):

```bash
adb connect <fire-tv-ip>:5555
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

3. Auf dem Stick öffnen unter `Einstellungen > Anwendungen > Installierte Apps verwalten`.
4. Bedienung: Pfeiltasten = Fokus bewegen (`/tv` startet auf Geräten ohne Touchscreen automatisch), OK = wählen, Zurück = Dialog schließen.

Einschränkung: Ein APK läuft nur auf kompatiblen **Fire-OS-Geräten**, nicht auf Vega OS. Hier gab es bisher **keinen Test auf echtem Fire-TV-Gerät**, nur Tastatur-Test im Desktop-Browser.

---

## Welchen Weg nehmen?

- Heute Abend schauen: **Weg A** (Mac oder PC, was gerade da ist).
- Dauerhaft ohne MacBook / PC: Backend wieder online nehmen + **Weg B**.

Quellen: `README.md` (Abschnitte Start, Android-APK & Fire TV, Hosting), `capacitor.config.ts` (`webDir: out-next`), `scripts/build-android.mjs`, `package.json`-Skripte.
