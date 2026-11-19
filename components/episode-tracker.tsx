"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { TvEpisode, TvSeasonInfo } from "@/lib/types";
import { apiSeasonEpisodes } from "@/lib/api.ts";
import { countSeenEpisodes } from "@/lib/prefs.ts";

/**
 * Lädt echte TMDb-Episodendaten pro Staffel (bei Bedarf + „alle laden“).
 * Gibt nur echte API-Titel/Episoden zurück, erfindet nichts.
 */
export function useSeriesEpisodes(titleId: string, tmdbId: number | undefined, seasons: TvSeasonInfo[]) {
  const [bySeason, setBySeason] = useState<Map<number, TvEpisode[]>>(new Map());
  const [loading, setLoading] = useState<Set<number>>(new Set());
  const [failed, setFailed] = useState(false);

  const loadSeason = useCallback(
    async (seasonNumber: number) => {
      if (tmdbId === undefined) return [];
      let cached: TvEpisode[] | undefined;
      setBySeason((prev) => {
        cached = prev.get(seasonNumber);
        return prev;
      });
      if (cached) return cached;
      setLoading((prev) => new Set(prev).add(seasonNumber));
      try {
        const eps = await apiSeasonEpisodes(titleId, seasonNumber);
        setBySeason((prev) => new Map(prev).set(seasonNumber, eps));
        return eps;
      } catch {
        setFailed(true);
        return [];
      } finally {
        setLoading((prev) => {
          const next = new Set(prev);
          next.delete(seasonNumber);
          return next;
        });
      }
    },
    [titleId, tmdbId]
  );

  const loadAll = useCallback(async (): Promise<TvEpisode[]> => {
    const all: TvEpisode[] = [];
    for (const s of seasons) {
      const eps = await loadSeason(s.season_number);
      all.push(...eps);
    }
    return all;
  }, [seasons, loadSeason]);

  return { bySeason, loading, failed, loadSeason, loadAll };
}

export default function EpisodeTracker({
  title,
  seasons,
  seenEpisodeIds,
  fullySeen,
  episodesBySeason,
  loadingSeasons,
  loadFailed,
  onLoadSeason,
  onToggleEpisode,
  onMarkSeason,
  onMarkAll,
  onUnmarkAll,
  tvMode = false
}: {
  title: string;
  seasons: TvSeasonInfo[];
  seenEpisodeIds: number[];
  fullySeen: boolean;
  episodesBySeason: Map<number, TvEpisode[]>;
  loadingSeasons: Set<number>;
  loadFailed: boolean;
  onLoadSeason: (seasonNumber: number) => void;
  onToggleEpisode: (episodeId: number) => void;
  onMarkSeason: (episodeIds: number[], seenValue: boolean) => void;
  onMarkAll: () => void;
  onUnmarkAll: () => void;
  tvMode?: boolean;
}) {
  // Staffeln sortiert: reguläre aufsteigend, „Specials“ (0) ans Ende
  const ordered = useMemo(
    () => [...seasons].sort((a, b) => (a.season_number === 0 ? 1 : 0) - (b.season_number === 0 ? 1 : 0) || a.season_number - b.season_number),
    [seasons]
  );
  const [active, setActive] = useState<number | null>(ordered.find((s) => s.season_number > 0)?.season_number ?? ordered[0]?.season_number ?? null);

  useEffect(() => {
    if (active !== null) onLoadSeason(active);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  const seenSet = useMemo(() => new Set(seenEpisodeIds), [seenEpisodeIds]);
  const totalKnown = ordered.reduce((sum, s) => sum + s.episode_count, 0);
  const loadedEps = useMemo(() => [...episodesBySeason.values()].flat(), [episodesBySeason]);
  const seenLoaded = countSeenEpisodes(loadedEps.map((e) => e.id), seenEpisodeIds);

  const focus = tvMode ? { "data-tv": true } : {};
  const btn = tvMode
    ? "tv-focusable rounded-2xl px-6 py-3 text-xl font-bold"
    : "rounded-full px-3 py-1.5 text-xs font-bold";

  const activeEps = active !== null ? episodesBySeason.get(active) ?? [] : [];
  const activeAllSeen = activeEps.length > 0 && activeEps.every((e) => seenSet.has(e.id));

  if (seasons.length === 0) return null;

  return (
    <section aria-label={`Gesehen-Status und Episoden von ${title}`} className={tvMode ? "mt-6" : "mt-4 rounded-2xl border border-white/10 bg-ink-950/60 p-4"}>
      <h3 className={tvMode ? "text-2xl font-extrabold text-white" : "text-base font-extrabold text-white"}>
        Gesehen-Status: Serie & Episoden
      </h3>
      <p className={tvMode ? "mt-1 text-lg text-slate-400" : "mt-1 text-xs text-slate-400"}>
        {fullySeen
          ? "✓ Als ganz gesehen markiert."
          : totalKnown > 0
            ? `${seenEpisodeIds.length} von ca. ${totalKnown} Episoden gesehen.`
            : `${seenEpisodeIds.length} Episoden gesehen.`}{" "}
        Fortschritt wird nur lokal auf diesem Gerät gespeichert – die App erkennt nicht, was du beim Anbieter
        tatsächlich angesehen hast.
      </p>
      {!fullySeen && (
        <div className={tvMode ? "mt-3 flex flex-wrap gap-3" : "mt-2 flex flex-wrap gap-2"}>
          <button
            type="button"
            {...focus}
            onClick={onMarkAll}
            className={`${btn} bg-emerald-400 ${tvMode ? "text-slate-900" : "text-slate-900"}`}
          >
            Alle Episoden als gesehen markieren
          </button>
        </div>
      )}
      {fullySeen && (
        <div className={tvMode ? "mt-3" : "mt-2"}>
          <button
            type="button"
            {...focus}
            onClick={onUnmarkAll}
            className={`${btn} bg-white/15 text-white`}
          >
            Als ungesehen markieren (Serie + alle Episoden)
          </button>
        </div>
      )}
      {loadFailed && (
        <p className={tvMode ? "mt-2 text-lg text-amber-300" : "mt-2 text-xs text-amber-300"}>
          Episodendaten konnten nicht geladen werden (offline oder API-Fehler). Markierungen bleiben erhalten.
        </p>
      )}

      <div className={tvMode ? "mt-4 flex flex-wrap gap-3" : "mt-3 flex flex-wrap gap-2"} role="group" aria-label="Staffel wählen">
        {ordered.map((s) => (
          <button
            key={s.season_number}
            type="button"
            {...focus}
            onClick={() => setActive(s.season_number)}
            aria-pressed={active === s.season_number}
            className={`${btn} ${active === s.season_number ? "bg-white text-slate-900" : "bg-white/15 text-white"}`}
          >
            {s.season_number === 0 ? "Specials" : `S${s.season_number}`}
          </button>
        ))}
      </div>

      {active !== null && (
        <div className="mt-3">
          {loadingSeasons.has(active) ? (
            <p className={tvMode ? "text-xl text-slate-300" : "text-sm text-slate-300"}>Episoden werden geladen …</p>
          ) : activeEps.length === 0 ? (
            <p className={tvMode ? "text-xl text-slate-400" : "text-sm text-slate-400"}>Keine Episodendaten für diese Staffel.</p>
          ) : (
            <>
              <button
                type="button"
                {...focus}
                onClick={() => onMarkSeason(activeEps.map((e) => e.id), !activeAllSeen)}
                aria-pressed={activeAllSeen}
                className={`${btn} ${activeAllSeen ? "bg-white text-slate-900" : "bg-white/15 text-white"}`}
              >
                {activeAllSeen ? "✓ Staffel gesehen – als ungesehen markieren" : "Staffel als gesehen markieren"}
              </button>
              <ul className={tvMode ? "mt-3 space-y-2" : "mt-2 space-y-1.5"}>
                {activeEps.map((e) => {
                  const done = seenSet.has(e.id);
                  return (
                    <li key={e.id}>
                      <button
                        type="button"
                        {...focus}
                        onClick={() => onToggleEpisode(e.id)}
                        aria-pressed={done}
                        className={`${tvMode ? "tv-focusable flex w-full items-center gap-4 rounded-2xl p-4 text-left text-xl" : "flex w-full items-center gap-3 rounded-xl p-2 text-left text-sm"} ${
                          done ? "bg-emerald-400/15 text-white" : "bg-white/5 text-slate-200"
                        }`}
                      >
                        <span
                          aria-hidden
                          className={`flex shrink-0 items-center justify-center rounded-full border font-black ${
                            tvMode ? "h-10 w-10 text-xl" : "h-6 w-6 text-xs"
                          } ${done ? "border-emerald-400 bg-emerald-400 text-slate-900" : "border-slate-500 text-transparent"}`}
                        >
                          ✓
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate font-bold">
                            S{e.season_number} E{e.episode_number} · {e.name}
                          </span>
                          {tvMode && e.overview && (
                            <span className="block truncate text-lg text-slate-400">{e.overview}</span>
                          )}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
              {loadedEps.length > 0 && (
                <p className={tvMode ? "mt-2 text-lg text-slate-500" : "mt-2 text-xs text-slate-500"}>
                  Geladene Episoden: {seenLoaded} von {loadedEps.length} gesehen.
                </p>
              )}
            </>
          )}
        </div>
      )}
    </section>
  );
}
