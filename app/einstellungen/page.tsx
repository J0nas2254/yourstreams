"use client";

import { useEffect, useState } from "react";
import { apiStatus } from "@/lib/api.ts";
import { usePrefs } from "@/lib/store";
import {
  clearLocalApiKeys,
  getLocalOmdbKey,
  getLocalTmdbKey,
  setLocalApiKeys
} from "@/lib/local-keys.ts";

export default function EinstellungenPage() {
  const { prefs, resetInterests } = usePrefs();
  const [status, setStatus] = useState<{ checked: boolean; configured: boolean; omdb: boolean }>({
    checked: false,
    configured: false,
    omdb: false
  });
  const [resetDone, setResetDone] = useState(false);
  const [tmdbInput, setTmdbInput] = useState("");
  const [omdbInput, setOmdbInput] = useState("");
  const [keysSaved, setKeysSaved] = useState(false);
  const [hasLocalKeys, setHasLocalKeys] = useState(false);

  function refreshStatus() {
    apiStatus()
      .then((d) => setStatus({ checked: true, configured: d.configured, omdb: d.omdbConfigured }))
      .catch(() => setStatus({ checked: true, configured: false, omdb: false }));
  }

  useEffect(() => {
    refreshStatus();
    setTmdbInput(getLocalTmdbKey());
    setOmdbInput(getLocalOmdbKey());
    setHasLocalKeys(Boolean(getLocalTmdbKey() || getLocalOmdbKey()));
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-black text-white">Einstellungen</h1>

      <section className="rounded-2xl border border-white/10 bg-ink-800 p-5" aria-label="Region">
        <h2 className="font-bold text-white">Region</h2>
        <p className="mt-1 text-sm text-slate-400">
          Feste Region: <strong className="text-white">Deutschland (DE)</strong>. Alle Verfügbarkeiten gelten für Deutschland.
        </p>
        <p className="mt-2 inline-block rounded-full bg-white px-3 py-1 text-xs font-black text-slate-900">DE</p>
      </section>

      <section className="rounded-2xl border border-white/10 bg-ink-800 p-5" aria-label="Datenquelle und API-Schlüssel">
        <h2 className="font-bold text-white">Datenquelle & API-Schlüssel</h2>
        {status.checked ? (
          <ul className="mt-2 space-y-1 text-sm text-slate-300">
            <li>TMDb: {status.configured ? "✓ konfiguriert" : "✕ fehlt (TMDB_API_KEY)"}</li>
            <li>OMDb (IMDb-Bewertungen): {status.omdb ? "✓ konfiguriert" : "✕ fehlt (OMDB_API_KEY, optional)"}</li>
          </ul>
        ) : (
          <p className="mt-2 text-sm text-slate-400">Status wird geprüft …</p>
        )}
        <div className="mt-4 space-y-3 rounded-xl border border-white/10 bg-ink-950 p-4">
          <h3 className="text-sm font-bold text-white">Schlüssel auf diesem Gerät eingeben (privat)</h3>
          <p className="text-xs text-slate-400">
            Nur auf diesem Gerät in <code className="rounded bg-ink-800 px-1">localStorage</code> gespeichert –
            nie in Git, nie im Bundle. Auf geteilten Geräten nicht verwenden.
          </p>
          <label className="block text-sm text-slate-300">
            TMDb-Schlüssel (Pflicht)
            <input
              type="password"
              autoComplete="off"
              value={tmdbInput}
              onChange={(e) => setTmdbInput(e.target.value)}
              placeholder="TMDB_API_KEY einfügen"
              data-tv="tmdb-key"
              className="mt-1 w-full rounded-lg border border-white/10 bg-ink-800 px-3 py-2 text-sm text-white placeholder:text-slate-500"
            />
          </label>
          <label className="block text-sm text-slate-300">
            OMDb-Schlüssel (optional, für IMDb-Bewertungen)
            <input
              type="password"
              autoComplete="off"
              value={omdbInput}
              onChange={(e) => setOmdbInput(e.target.value)}
              placeholder="OMDB_API_KEY einfügen (optional)"
              data-tv="omdb-key"
              className="mt-1 w-full rounded-lg border border-white/10 bg-ink-800 px-3 py-2 text-sm text-white placeholder:text-slate-500"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              data-tv="save-keys"
              onClick={() => {
                setLocalApiKeys(tmdbInput, omdbInput);
                setHasLocalKeys(Boolean(tmdbInput.trim() || omdbInput.trim()));
                setKeysSaved(true);
                refreshStatus();
              }}
              className="rounded-full bg-white px-5 py-2 text-sm font-extrabold text-slate-900"
            >
              Schlüssel auf diesem Gerät speichern
            </button>
            {hasLocalKeys && (
              <button
                type="button"
                onClick={() => {
                  clearLocalApiKeys();
                  setTmdbInput("");
                  setOmdbInput("");
                  setHasLocalKeys(false);
                  setKeysSaved(false);
                  refreshStatus();
                }}
                className="rounded-full border border-white/20 px-5 py-2 text-sm font-bold text-slate-200"
              >
                Geräte-Schlüssel löschen
              </button>
            )}
          </div>
          {keysSaved && <p className="text-sm text-emerald-300">Gespeichert – nur auf diesem Gerät.</p>}
        </div>
        <div className="mt-3 space-y-2 text-sm text-slate-300">
          <p><strong className="text-white">Alternative Einrichtung (Server):</strong></p>
          <ol className="list-decimal space-y-1 pl-5">
            <li><code className="rounded bg-ink-950 px-1">.env.example</code> nach <code className="rounded bg-ink-950 px-1">.env.local</code> kopieren.</li>
            <li>TMDb-Schlüssel eintragen (<code className="rounded bg-ink-950 px-1">TMDB_API_KEY</code>). Optional <code className="rounded bg-ink-950 px-1">OMDB_API_KEY</code> für IMDb-Bewertungen.</li>
            <li>Server neu starten. Schlüssel bleiben serverseitig und stehen in <code className="rounded bg-ink-950 px-1">.gitignore</code>.</li>
          </ol>
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-ink-800 p-5" aria-label="Empfehlungen zurücksetzen">
        <h2 className="font-bold text-white">Lokale Empfehlungen zurücksetzen</h2>
        <p className="mt-1 text-sm text-slate-400">
          Aktuell: {Object.keys(prefs.interests).length} Interessen, {prefs.notInterested.length} ausgeblendet,{" "}
          {prefs.seen.length} gesehen. Dienste und Merkliste bleiben erhalten.
        </p>
        <button
          type="button"
          onClick={() => {
            resetInterests();
            setResetDone(true);
          }}
          className="mt-3 rounded-full bg-white px-5 py-2.5 text-sm font-extrabold text-slate-900"
        >
          Interessen & Verlauf zurücksetzen
        </button>
        {resetDone && <p className="mt-2 text-sm text-emerald-300">Zurückgesetzt.</p>}
      </section>

      <section className="rounded-2xl border border-white/10 bg-ink-800 p-5" aria-label="Datenschutz">
        <h2 className="font-bold text-white">Datenschutz</h2>
        <p className="mt-1 text-sm text-slate-400">
          Gespeichert werden nur Dienste, Merkliste, gesehene Titel und Empfehlungsinteressen – lokal auf diesem Gerät.
          Keine Konten, keine Passwörter, kein Tracking. Suchanfragen für aktuelle Verfügbarkeiten gehen an die
          eingestellte Datenquelle (TMDb/OMDb).
        </p>
      </section>
    </div>
  );
}
