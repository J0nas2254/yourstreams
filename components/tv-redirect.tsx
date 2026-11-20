"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { App } from "@capacitor/app";
import { isCapacitorAndroid, isProbablyTV } from "@/lib/api";

// In der Android-Hülle ohne Touchscreen (Fire TV) direkt ins TV-Layout.
// Fängt zusätzlich die Hardware-Zurück-Taste ab: sonst beendet Android
// die App, statt Dialog/Unterseite zu schließen oder zurückzublättern.
export default function TvRedirect() {
  const pathname = usePathname();
  const router = useRouter();
  useEffect(() => {
    if (pathname === "/" && isProbablyTV()) {
      router.replace("/tv");
    }
  }, [pathname, router]);
  useEffect(() => {
    if (!isCapacitorAndroid()) return;
    let listener: { remove: () => Promise<void> } | null = null;
    (async () => {
      try {
        listener = await App.addListener("backButton", ({ canGoBack }) => {
          // Offener Dialog (Film-Info)? → schließen statt App verlassen.
          if (document.querySelector('[role="dialog"]')) {
            window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
            return;
          }
          // Unterseite (z. B. /tv/top)? → eine Seite zurück.
          if (canGoBack) {
            window.history.back();
            return;
          }
          // Auf der Startansicht: in den Hintergrund statt hart beenden.
          App.minimizeApp().catch(() => {});
        });
      } catch {
        // Kein natives Zurück verfügbar (Browser/Silk regeln das selbst).
      }
    })();
    return () => {
      listener?.remove().catch(() => {});
    };
  }, []);
  return null;
}
