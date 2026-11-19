"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Title } from "@/lib/types";
import { ApiError, apiTitle } from "@/lib/api.ts";
import { loadSnapshots, usePrefs, type WatchSnapshot } from "@/lib/store";
import { posterUrl } from "@/lib/images";
import TitleActions from "@/components/title-actions";

export default function ListePage() {
  const { prefs, loaded, toggleWatch, removeWatch, seen, toggleSeen, setInterest, unmarkSeries } = usePrefs();
  const [details, setDetails] = useState<Map<string, Title & { imdbId?: string | null }>>(new Map());
  const [snaps, setSnaps] = useState<WatchSnapshot[]>([]);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setSnaps(loadSnapshots());
  }, [loaded, prefs.watchlist.length]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const missing = prefs.watchlist.map((w) => w.id).filter((id) => !details.has(id));
      if (missing.length === 0) return;
      const entries = await Promise.all(
        missing.map(async (id) => {
          try {
            const t = await apiTitle(id);
            return [id, t] as const;
          } catch (e) {
            if (!(e instanceof ApiError && e.notConfigured)) setFailed(true);
            return null;
          }
        })
      );
      if (cancelled) return;
      setDetails((prev) => {
        const next = new Map(prev);
        for (const e of entries) if (e) next.set(e[0], e[1]);
        return next;
      });
    }
    if (loaded) load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, prefs.watchlist.length]);

  const seenIds = useMemo(() => new Set(seen), [seen]);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-black text-white">Meine Liste</h1>
      <p className="text-sm text-slate-400">
        Lokal auf diesem Gerät gespeichert – auch offline verfügbar. Aktuelle Verfügbarkeit braucht Internet und kann
        veraltet sein.
      </p>
      {failed && (
        <p className="rounded-2xl border border-white/10 bg-ink-800 p-3 text-sm text-slate-300">
          Einige Details konnten nicht geladen werden (offline oder API-Fehler). Gespeicherte Einträge bleiben erhalten.
        </p>
      )}
      {!loaded ? (
        <p className="text-slate-300">Lädt …</p>
      ) : prefs.watchlist.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-ink-800 p-5 text-sm text-slate-300">
          <p>Deine Liste ist leer. Suche Titel und tippe auf „Merken“.</p>
          <p className="mt-3"><Link href="/suche" className="font-bold text-white underline">Zur Suche</Link></p>
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4" aria-label="Gemerkte Titel">
          {prefs.watchlist.map((w) => {
            const t = details.get(w.id);
            const snap = snaps.find((s) => s.id === w.id);
            const title = t?.title ?? snap?.title ?? w.id;
            const poster = t ? posterUrl(t.posterPath, "w342") : snap?.posterPath ? posterUrl(snap.posterPath, "w342") : null;
            return (
              <li key={w.id} className="overflow-hidden rounded-2xl border border-white/10 bg-ink-800">
                <Link href={`/titel?id=${encodeURIComponent(w.id)}`} aria-label={`${title} – Details`}>
                  <div className="relative aspect-[2/3] w-full bg-ink-700">
                    {poster ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={poster} alt={`Poster: ${title}`} loading="lazy" className="h-full w-full object-cover" />
                    ) : (
                      <div aria-hidden className="flex h-full items-center justify-center text-3xl font-black text-slate-500">
                        {String(title).slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    {seenIds.has(w.id) && (
                      <span className="absolute left-2 top-2 rounded-full bg-emerald-400 px-2 py-0.5 text-[11px] font-bold text-slate-900">
                        Gesehen
                      </span>
                    )}
                  </div>
                </Link>
                <div className="p-3">
                  <p className="truncate text-sm font-bold text-white">{title}</p>
                  {!t && <p className="text-[11px] text-slate-500">Offline-Kopie – Details beim nächsten Online-Besuch.</p>}
                  <div className="mt-2">
                    <TitleActions
                      title={{ id: w.id, mediaType: "movie", title: String(title), year: null, overview: "", genres: [], availability: [] }}
                      watched={seenIds.has(w.id)}
                      marked
                      interest={prefs.interests[w.id] ?? null}
                      onToggleWatch={() => removeWatch(w.id)}
                      onToggleSeen={() => {
                        // Serien: Rückgängig setzt Serie + alle Episoden zurück (wie auf der Detailseite)
                        const mt = details.get(w.id)?.mediaType ?? snaps.find((s) => s.id === w.id)?.mediaType;
                        if (mt === "tv" && seen.includes(w.id)) unmarkSeries(w.id);
                        else toggleSeen(w.id);
                      }}
                      onSetInterest={(dir) => setInterest(w.id, dir)}
                    />
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {prefs.notInterested.length > 0 && (
        <section aria-label="Ausgeblendete Titel" className="rounded-2xl border border-white/10 bg-ink-800 p-4">
          <h2 className="font-bold text-white">Ausgeblendet ({prefs.notInterested.length})</h2>
          <ul className="mt-2 space-y-1 text-sm text-slate-300">
            {prefs.notInterested.map((id) => (
              <li key={id} className="flex items-center justify-between gap-2">
                <span className="truncate font-mono text-xs">{details.get(id)?.title ?? id}</span>
                <button
                  type="button"
                  onClick={() => setInterest(id, null)}
                  className="shrink-0 rounded-full border border-white/20 px-3 py-1 font-bold text-white"
                >
                  Rückgängig
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
