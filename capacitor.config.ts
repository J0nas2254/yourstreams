import type { CapacitorConfig } from "@capacitor/cli";

// Keine Abhängigkeit von Google Play Services: nur @capacitor/core,
// keine Push-/Maps-/Standort-Plugins.
const config: CapacitorConfig = {
  appId: "de.streamfinder.app",
  appName: "StreamFinder",
  webDir: "out-next",
  backgroundColor: "#101c3d",
  android: {
    // Erlaubt gemischte Inhalte nur falls nötig; Standard bleibt HTTPS.
    allowMixedContent: false
  },
  server: {
    // Kein Live-Reload gegen einen Dev-Server im ausgelieferten APK.
    cleartext: false
  }
};

export default config;
