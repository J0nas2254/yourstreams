"use client";

import { useEffect, useState } from "react";
import type { Title, TvEpisode } from "@/lib/types";
import { episodeKey } from "@/lib/prefs";

export async function apiSeasonEpisodes(tmdbId: number, season: number): Promise<TvEpisode[]> {
  const res = await fetch(`/api/tv/${tmdbId}/season/${season}`);
  if (!res.ok) throw new Error(`Staffel ${season} konnte nicht geladen werden`);
  return res.json();
}

export function useSeriesEpisodes(title: Title) {
  const [episodesBySeason, setEpisodesBySeason] = useState<Record<number, TvEpisode[]>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (title.kind !== "tv" || !title.tvInfo) return;
      setLoading(true);
      setError(null);
      try {
        const entries: Record<number, TvEpisode[]> = {};
        for (const s of title.tvInfo.seasons.slice(0, 6)) {
          // max. 6 Staffeln automatisch laden, Rest auf Abruf
          const eps = await apiSeasonEpisodes(title.tmdbId, s.season);
          entries[s.season] = eps;
        }
        if (!cancelled) setEpisodesBySeason(entries);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Fehler");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [title]);

  return { episodesBySeason, loading, error };
}

export function EpisodeTracker({
  title,
  seenEpisodes,
  onToggleEpisode,
  onSetSeason,
  onMarkAll,
  onUnmarkAll,
}: {
  title: Title;
  seenEpisodes: string[];
  onToggleEpisode: (season: number, episode: number) => void;
  onSetSeason: (season: number, episodes: TvEpisode[], seen: boolean) => void;
  onMarkAll: (allKeys: string[]) => void;
  onUnmarkAll: () => void;
}) {
  const { episodesBySeason, loading, error } = useSeriesEpisodes(title);
  const seenSet = new Set(seenEpisodes);

  const allLoaded: TvEpisode[] = Object.values(episodesBySeason).flat();
  const allKeys = allLoaded.map((e) => e.key ?? episodeKey(e.season, e.episode));
  const seenCount = allKeys.filter((k) => seenSet.has(k)).length;

  if (title.kind !== "tv") return null;

  return (
    <section aria-label="Episoden-Tracker" className="mt-6 rounded-xl border border-neutral-800 bg-neutral-900 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">
          Serien-Fortschritt {allLoaded.length > 0 && `(${seenCount}/${allLoaded.length})`}
        </h2>
        <div className="flex gap-2">
          <button
            type="button"
            data-tv
            onClick={() => onMarkAll(allKeys)}
            disabled={allLoaded.length === 0}
            className="rounded-lg bg-green-600 px-3 py-2 text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-green-400 disabled:opacity-50"
          >
            Alle Episoden als gesehen markieren
          </button>
          <button
            type="button"
            data-tv
            onClick={onUnmarkAll}
            className="rounded-lg bg-neutral-700 px-3 py-2 text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-green-400"
          >
            Serie zurücksetzen
          </button>
        </div>
      </div>
      <p className="mt-1 text-sm text-neutral-400">
        Markierungen sind manuell auf diesem Gerät gespeichert. Die App erkennt nicht automatisch,
        was du beim Streaminganbieter wirklich abgespielt hast.
      </p>
      {loading && <p className="mt-3 text-sm">Lade Episoden (echte Daten) …</p>}
      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
      {!loading &&
        Object.entries(episodesBySeason).map(([seasonStr, eps]) => {
          const season = Number(seasonStr);
          const seasonKeys = eps.map((e) => e.key);
          const seasonSeen = seasonKeys.filter((k) => seenSet.has(k)).length;
          return (
            <div key={season} className="mt-4 border-t border-neutral-800 pt-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">
                  Staffel {season} ({seasonSeen}/{eps.length} gesehen)
                </h3>
                <div className="flex gap-2">
                  <button
                    type="button"
                    data-tv
                    onClick={() => onSetSeason(season, eps, true)}
                    className="rounded bg-neutral-700 px-2 py-1 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-green-400"
                  >
                    Staffel als gesehen
                  </button>
                  <button
                    type="button"
                    data-tv
                    onClick={() => onSetSeason(season, eps, false)}
                    className="rounded bg-neutral-800 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-green-400"
                  >
                    Staffel zurücksetzen
                  </button>
                </div>
              </div>
              <ul className="mt-2 grid gap-1">
                {eps.map((ep) => {
                  const key = ep.key ?? episodeKey(ep.season, ep.episode);
                  const seen = seenSet.has(key);
                  return (
                    <li key={key}>
                      <button
                        type="button"
                        data-tv
                        onClick={() => onToggleEpisode(ep.season, ep.episode)}
                        aria-pressed={seen}
                        className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm focus:outline-none focus:ring-2 focus:ring-green-400 ${
                          seen ? "bg-green-900/40" : "bg-neutral-800"
                        }`}
                      >
                        <span>
                          {ep.season}x{String(ep.episode).padStart(2, "0")} – {ep.name}
                        </span>
                        <span aria-hidden>{seen ? "✓" : "○"}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
    </section>
  );
}
