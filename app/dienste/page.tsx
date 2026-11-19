"use client";

import { useEffect, useMemo, useState } from "react";
import type { Provider } from "@/lib/types";
import { ApiError, apiProviders } from "@/lib/api.ts";
import { usePrefs } from "@/lib/store";
import { FREE_TV_ID, FREE_TV_LABEL, filterFreeProviders } from "@/lib/free-tv";
import SetupNotice from "@/components/setup-notice";

export default function DienstePage() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [status, setStatus] = useState<"loading" | "ok" | "setup" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const { services, toggleService, clearServices, loaded } = usePrefs();

  useEffect(() => {
    apiProviders()
      .then((p) => {
        setProviders(p);
        setStatus("ok");
      })
      .catch((e) => {
        if (e instanceof ApiError && e.notConfigured) setStatus("setup");
        else {
          setStatus("error");
          setErrorMsg(e instanceof Error ? e.message : "Dienste konnten nicht geladen werden.");
        }
      });
  }, []);

  const paidProviders = useMemo(() => filterFreeProviders(providers), [providers]);
  const freeActive = services.includes(FREE_TV_ID);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-black text-white">Meine Dienste</h1>
      <p className="max-w-2xl text-sm text-slate-400">
        Wähle die Streaming-Abos deines Haushalts manuell aus. Rein kostenlose
        Angebote sind in einem Punkt zusammengefasst: {FREE_TV_LABEL}.
        Joyn und RTL+ bleiben einzeln sichtbar, weil sie zusätzlich Bezahl-Abos haben.
        Die Auswahl bleibt lokal auf diesem Gerät.
      </p>
      {status === "loading" && <p className="text-slate-300">Lädt …</p>}
      {status === "setup" && (
        <SetupNotice
          title="Anbieterliste nicht verfügbar"
          message="Die TMDb-API ist nicht konfiguriert (TMDB_API_KEY fehlt). Es wird keine Behelf-Liste angezeigt."
        />
      )}
      {status === "error" && <SetupNotice title="Fehler" message={errorMsg} showSettingsLink={false} />}
      {status === "ok" && loaded && (
        <div className="flex items-center justify-between rounded-2xl bg-ink-800 p-3 text-sm text-slate-200">
          <span><strong className="text-white">{services.length}</strong> ausgewählt</span>
          <button onClick={clearServices} className="rounded-full border border-white/20 px-3 py-1.5 font-semibold text-white">
            Auswahl löschen
          </button>
        </div>
      )}
      {status === "ok" && (
        <ul className="grid gap-2 sm:grid-cols-2" aria-label="Streaminganbieter">
          <li>
            <button
              type="button"
              onClick={() => toggleService(FREE_TV_ID)}
              aria-pressed={freeActive}
              className={`flex w-full items-center justify-between gap-3 rounded-2xl border p-4 text-left font-semibold ${
                freeActive ? "border-emerald-400 bg-emerald-400/10 text-white" : "border-white/10 bg-ink-800 text-slate-200"
              }`}
            >
              <span>{FREE_TV_LABEL} <span className="block text-xs font-normal text-slate-400">Rein kostenlose Anbieter – Joyn / RTL+ bleiben einzeln wählbar</span></span>
              <span aria-hidden className={`rounded-full px-3 py-1 text-xs font-bold ${freeActive ? "bg-emerald-400 text-slate-900" : "bg-white/10 text-slate-300"}`}>
                {freeActive ? "Ausgewählt ✓" : "Auswählen"}
              </span>
            </button>
          </li>
          {paidProviders.map((p) => {
            const active = services.includes(p.provider_id);
            return (
              <li key={p.provider_id}>
                <button
                  type="button"
                  onClick={() => toggleService(p.provider_id)}
                  aria-pressed={active}
                  className={`flex w-full items-center justify-between gap-3 rounded-2xl border p-4 text-left font-semibold ${
                    active ? "border-emerald-400 bg-emerald-400/10 text-white" : "border-white/10 bg-ink-800 text-slate-200"
                  }`}
                >
                  <span>{p.provider_name}</span>
                  <span aria-hidden className={`rounded-full px-3 py-1 text-xs font-bold ${active ? "bg-emerald-400 text-slate-900" : "bg-white/10 text-slate-300"}`}>
                    {active ? "Ausgewählt ✓" : "Auswählen"}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
