"use client";

import { useEffect } from "react";

export function SwRegister() {
  useEffect(() => {
    // Optional: Service Worker nur wenn vorhanden (keine PWA-Pflicht)
    if ("serviceWorker" in navigator) {
      // navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);
  return null;
}
