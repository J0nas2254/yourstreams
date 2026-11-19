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
  const [stored, setStored] = useState({ tmdb: "", omdb: "" });
  const [showKeys, setShowKeys] = useState(false);

  function refreshStatus() {
    apiStatus()
      .then((d) => setStatus({ checked: true, configured: d.configured, omdb: d.omdbConfigured }))
      .catch(() => setStatus({ checked: true, configured: false, omdb: false }));
  }

  function refreshStored() {
    const t = getLocalTmdbKey();
    const o = getLocalOmdbKey();
    setStored({ tmdb: t, omdb: o });
    setHasLocalKeys(Boolean(t || o));
  }

  function mask(key: string): string {
    if (!key) return "";
    return "•".repeat(Math.min(Math.max(key.length - 4, 4), 20)) + key.slice(-4);
  }

  // Ein leeres Feld löscht nichts: bereits gespeicherte Schlüssel bleiben erhalten.
  function saveKeys() {
    const t = tmdbInput.trim() || getLocalTmdbKey();
    const o = omdbInput.trim() || getLocalOmdbKey();
    setLocalApiKeys(t, o);
    setTmdbInput(t);
    setOmdbInput(o);
    refreshStored();
    setKeysSaved(true);
    refreshStatus();
  }

  useEffect(() => {
    refreshStatus();
    setTmdbInput(getLocalTmdbKey());
    setOmdbInput(getLocalOmdbKey());
    refreshStored();
  }, []);

  // Kein type="password": Passwort-Manager halten die Felder sonst für Zugangsdaten
  // und leeren sie beim Verlassen der Seite.
  const keyInputCls =
    "mt-1 w-full min-w-0 max-w-full rounded-lg border border-white/10 bg-ink-800 px-3 py-2 font-mono text-xs text-white placeholder:font-sans placeholder:text-slate-500 sm:text-sm";

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-black text-white">Einstellungen</h1>

      <section className="rounded-2xl border border-white/10 bg-ink-800 p-4 sm:p-5" aria-label="Region">
        <h2 className="font-bold text-white">Region</h2>
        <p className="mt-1 text-sm text-slate-400">
          Feste Region: <strong className="text-white">Deutschland (DE)</strong>. Alle Verfügbarkeiten gelten für Deutschland.
        </p>
        <p className="mt-2 inline-block rounded-full bg-white px-3 py-1 text-xs font-black text-slate-900">DE</p>
      </section>

      <section className="rounded-2xl border border-white/10 bg-ink-800 p-4 sm:p-5" aria-label="Datenquelle und API-Schlüssel">
        <h2 className="font-bold text-white">Datenquelle und API-Schlüssel</h2>
        {status.checked ? (
          <ul className="mt-2 space-y-1 text-sm text-slate-300">
            <li>TMDb: {status.configured ? "✓ konfiguriert" : "✕ fehlt"}</li>
            <li>OMDb (IMDb-Bewertungen): {status.omdb ? "✓ konfiguriert" : "✕ fehlt (optional)"}</li>
            <li>
              Auf diesem Gerät gespeichert: TMDb {stored.tmdb ? `✓ ${mask(stored.tmdb)}` : "✕"} · OMDb{" "}
              {stored.omdb ? `✓ ${mask(stored.omdb)}` : "✕"}
            </li>
          </ul>
        ) : (
          <p className="mt-2 text-sm text-slate-400">Status wird geprüft …</p>
        )}
        <div className="mt-4 space-y-3 rounded-xl border-2 border-gold-400/60 bg-ink-950 p-4">
          <h3 className="text-base font-black text-white">Hier Schlüssel eingeben, ganz einfach:</h3>
          <ol className="list-decimal space-y-1 pl-5 text-sm text-slate-200">
            <li>Schlüssel bei TMDb / OMDb holen (einmalig, gratis).</li>
            <li>Unten einfügen und auf Speichern tippen.</li>
            <li>Fertig, die App lädt danach echte Filme und Serien.</li>
          </ol>
          <p className="text-xs text-slate-400">
            Bleibt nur auf diesem Gerät gespeichert. Nichts wird hochgeladen.
          </p>
          <form
            autoComplete="off"
            onSubmit={(e) => {
              e.preventDefault();
              saveKeys();
            }}
            className="space-y-3"
          >
            <label htmlFor="tmdb-key" className="block text-sm text-slate-300">
              TMDb-Schlüssel (Pflicht)
            </label>
            <input
              id="tmdb-key"
              name="tmdb-api-key"
              type="text"
              inputMode="text"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="none"
              spellCheck={false}
              data-lpignore="true"
              data-1p-ignore="true"
              data-bwignore="true"
              data-form-type="other"
              data-tv="tmdb-key"
              value={tmdbInput}
              onChange={(e) => {
                setTmdbInput(e.target.value);
                setKeysSaved(false);
              }}
              placeholder="TMDb-Schlüssel hier einfügen"
              className={`${keyInputCls} ${showKeys ? "" : "key-mask"}`}
            />
            <label htmlFor="omdb-key" className="block text-sm text-slate-300">
              OMDb-Schlüssel (optional, für IMDb-Bewertungen)
            </label>
            <input
              id="omdb-key"
              name="omdb-api-key"
              type="text"
              inputMode="text"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="none"
              spellCheck={false}
              data-lpignore="true"
              data-1p-ignore="true"
              data-bwignore="true"
              data-form-type="other"
              data-tv="omdb-key"
              value={omdbInput}
              onChange={(e) => {
                setOmdbInput(e.target.value);
                setKeysSaved(false);
              }}
              placeholder="OMDb-Schlüssel hier einfügen (optional)"
              className={`${keyInputCls} ${showKeys ? "" : "key-mask"}`}
            />
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="submit"
                data-tv="save-keys"
                className="w-full rounded-full bg-white px-5 py-2.5 text-sm font-extrabold text-slate-900 sm:w-auto"
              >
                Schlüssel auf diesem Gerät speichern
              </button>
              <button
                type="button"
                onClick={() => setShowKeys((v) => !v)}
                className="rounded-full border border-white/20 px-4 py-2 text-sm font-bold text-slate-200"
              >
                {showKeys ? "Verbergen" : "Anzeigen"}
              </button>
              {hasLocalKeys && (
                <button
                  type="button"
                  onClick={() => {
                    clearLocalApiKeys();
                    setTmdbInput("");
                    setOmdbInput("");
                    refreshStored();
                    setKeysSaved(false);
                    refreshStatus();
                  }}
                  className="rounded-full border border-white/20 px-4 py-2 text-sm font-bold text-slate-200"
                >
                  Geräte-Schlüssel löschen
                </button>
              )}
            </div>
          </form>
          <p className="text-xs text-slate-400">
            Das Feld ist bewusst kein Passwortfeld – sonst leeren Passwort-Manager den Schlüssel beim Verlassen der
            Seite. Ein leeres Feld löscht einen gespeicherten Schlüssel nicht mehr; dafür gibt es „Geräte-Schlüssel
            löschen“.
          </p>
          {keysSaved && <p className="text-sm text-emerald-300">Gespeichert, nur auf diesem Gerät.</p>}
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-ink-800 p-4 sm:p-5" aria-label="Empfehlungen zurücksetzen">
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
          className="mt-3 w-full rounded-full bg-white px-5 py-2.5 text-sm font-extrabold text-slate-900 sm:w-auto"
        >
          Interessen und Verlauf zurücksetzen
        </button>
        {resetDone && <p className="mt-2 text-sm text-emerald-300">Zurückgesetzt.</p>}
      </section>

      <section className="rounded-2xl border border-white/10 bg-ink-800 p-4 sm:p-5" aria-label="Datenschutz">
        <h2 className="font-bold text-white">Datenschutz</h2>
        <p className="mt-1 text-sm text-slate-400">
          Gespeichert werden nur Dienste, Merkliste, gesehene Titel und Empfehlungsinteressen, lokal auf diesem Gerät.
          Keine Konten, kein Tracking.
        </p>
      </section>
    </div>
  );
}
