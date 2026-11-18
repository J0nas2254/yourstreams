"use client";

import { useCallback, useEffect, useState } from "react";
import {
  defaultPrefs,
  loadPrefs,
  savePrefs,
  markSeen as markSeenPure,
  unmarkSeen as unmarkSeenPure,
  toggleEpisodeSeen as toggleEpisodePure,
  setSeasonSeen as setSeasonPure,
  markSeriesSeen as markSeriesPure,
  unmarkSeries as unmarkSeriesPure,
} from "./prefs";
import type { Prefs, Title } from "./types";

export function usePrefs() {
  const [prefs, setPrefs] = useState<Prefs>(defaultPrefs);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setPrefs(loadPrefs());
    setReady(true);
  }, []);

  useEffect(() => {
    if (ready) savePrefs(prefs);
  }, [prefs, ready]);

  const toggleSeen = useCallback((title: Title) => {
    setPrefs((p) =>
      p.seenIds.includes(title.id)
        ? unmarkSeenPure(p, title.id)
        : markSeenPure(p, title.id)
    );
  }, []);

  const toggleEpisode = useCallback(
    (titleId: string, season: number, episode: number) => {
      setPrefs((p) => toggleEpisodePure(p, titleId, season, episode));
    },
    []
  );

  const setSeason = useCallback(
    (
      titleId: string,
      season: number,
      episodes: Array<{ season: number; episode: number }>,
      seen: boolean
    ) => {
      setPrefs((p) => setSeasonPure(p, titleId, season, episodes, seen));
    },
    []
  );

  const markAll = useCallback((title: Title, keys: string[]) => {
    setPrefs((p) => markSeriesPure(p, title, keys));
  }, []);

  const unmarkAll = useCallback((titleId: string) => {
    setPrefs((p) => unmarkSeriesPure(p, titleId));
  }, []);

  const toggleWatchlist = useCallback((id: string) => {
    setPrefs((p) => ({
      ...p,
      watchlist: p.watchlist.includes(id)
        ? p.watchlist.filter((x) => x !== id)
        : [...p.watchlist, id],
    }));
  }, []);

  return {
    prefs,
    ready,
    setPrefs,
    toggleSeen,
    toggleEpisode,
    setSeason,
    markAll,
    unmarkAll,
    toggleWatchlist,
  };
}
