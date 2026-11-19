"use client";

import { useEffect, useState } from "react";
import { apiStatus } from "@/lib/api.ts";

// Zeigt nur echte Zustände: fehlende Konfiguration, Offline, veraltete Daten.
export default function StatusBanner() {
  const [state, setState] = useState<{ checked: boolean; configured: boolean; offline: boolean }>({
    checked: false,
    configured: true,
    offline: false
  });

  useEffect(() => {
    apiStatus()
      .then((d) => setState((s) => ({ ...s, checked: true, configured: d.configured })))
      .catch(() => setState((s) => ({ ...s, checked: true, configured: false })));
    const update = () => setState((s) => ({ ...s, offline: !navigator.onLine }));
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  if (!state.checked) return null;
  return (
    <div aria-live="polite">
      {!state.configured && (
        <p className="bg-gold-400 px-4 py-2 text-center text-sm font-bold text-slate-900">
          TMDb ist nicht eingerichtet – richte einen API-Schlüssel ein (Einstellungen), um echte Daten zu sehen.
        </p>
      )}
      {state.offline && (
        <p className="bg-slate-900 px-4 py-2 text-center text-sm font-semibold text-white">
          Offline: Gespeicherte Liste wird gezeigt. Suche, Bilder und aktuelle Verfügbarkeit brauchen Internet und
          können veraltet sein.
        </p>
      )}
    </div>
  );
}
