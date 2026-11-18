"use client";

import type { Prefs, SearchFilters, Title, TvEpisode } from "./types";

export const STORAGE_KEY = "sf:prefs:v2";

export function defaultPrefs(): Prefs {
  return {
    household: "Haushalt",
    seenIds: [],
    seenEpisodes: {},
    watchlist: [],
    hideSeenFromFeed: true,
  };
}

export function migrateV1toV2(v1: unknown): Prefs {
  const base = defaultPrefs();
  if (!v1 || typeof v1 !== "object") return base;
  const o = v1 as Record<string, unknown>;
  return {
    ...base,
    household: typeof o.household === "string" ? o.household : base.household,
    seenIds: Array.isArray(o.seenIds) ? [...(o.seenIds as string[])] : [],
    seenEpisodes: {},
    watchlist: Array.isArray(o.watchlist) ? [...(o.watchlist as string[])] : [],
    hideSeenFromFeed: o.hideSeenFromFeed !== false,
  };
}

export function loadPrefs(): Prefs {
  if (typeof window === "undefined") return defaultPrefs();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      // Migration: alter Key sf:prefs:v1?
      const old = window.localStorage.getItem("sf:prefs:v1");
      if (old) {
        const migrated = migrateV1toV2(JSON.parse(old));
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
        return migrated;
      }
      return defaultPrefs();
    }
    const parsed = JSON.parse(raw) as Prefs;
    return { ...defaultPrefs(), ...parsed };
  } catch {
    return defaultPrefs();
  }
}

export function savePrefs(prefs: Prefs) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
}

export function episodeKey(season: number, episode: number) {
  return `S${season}E${episode}`;
}

export function isSeen(prefs: Prefs, id: string) {
  return prefs.seenIds.includes(id);
}

export function markSeen(prefs: Prefs, id: string): Prefs {
  if (prefs.seenIds.includes(id)) return prefs;
  return { ...prefs, seenIds: [...prefs.seenIds, id] };
}

export function unmarkSeen(prefs: Prefs, id: string): Prefs {
  return { ...prefs, seenIds: prefs.seenIds.filter((x) => x !== id) };
}

export function toggleEpisodeSeen(
  prefs: Prefs,
  titleId: string,
  season: number,
  episode: number
): Prefs {
  const key = episodeKey(season, episode);
  const list = prefs.seenEpisodes[titleId] ?? [];
  const next = list.includes(key)
    ? list.filter((k) => k !== key)
    : [...list, key];
  return {
    ...prefs,
    seenEpisodes: { ...prefs.seenEpisodes, [titleId]: next },
  };
}

export function setSeasonSeen(
  prefs: Prefs,
  titleId: string,
  season: number,
  episodes: Array<{ season: number; episode: number } | string>,
  seen: boolean
): Prefs {
  const keys = episodes.map((e) =>
    typeof e === "string" ? e : episodeKey(e.season, e.episode)
  );
  const prefix = `S${season}E`;
  const rest = (prefs.seenEpisodes[titleId] ?? []).filter(
    (k) => !k.startsWith(prefix)
  );
  const next = seen ? Array.from(new Set([...rest, ...keys])) : rest;
  return {
    ...prefs,
    seenEpisodes: { ...prefs.seenEpisodes, [titleId]: next },
  };
}

export function markSeriesSeen(
  prefs: Prefs,
  title: Title,
  allEpisodeKeys: string[]
): Prefs {
  const withEps: Prefs = {
    ...prefs,
    seenEpisodes: { ...prefs.seenEpisodes, [title.id]: [...allEpisodeKeys] },
  };
  return markSeen(withEps, title.id);
}

export function unmarkSeries(prefs: Prefs, titleId: string): Prefs {
  const copy = { ...prefs.seenEpisodes };
  delete copy[titleId];
  return unmarkSeen({ ...prefs, seenEpisodes: copy }, titleId);
}

export function countSeenEpisodes(prefs: Prefs, titleId: string) {
  return (prefs.seenEpisodes[titleId] ?? []).length;
}

export function nextUnseenEpisode(
  prefs: Prefs,
  titleId: string,
  allEpisodes: TvEpisode[]
): (TvEpisode & { key: string }) | null {
  const seen = new Set(prefs.seenEpisodes[titleId] ?? []);
  const sorted = [...allEpisodes].sort(
    (a, b) => a.season - b.season || a.episode - b.episode
  );
  for (const ep of sorted) {
    const key = episodeKey(ep.season, ep.episode);
    if (!seen.has(key)) return { ...ep, key };
  }
  return null;
}

export function applySeenFilter(
  titles: Title[],
  prefs: Prefs,
  seenFilter: SearchFilters["seenFilter"]
) {
  if (seenFilter === "seen") return titles.filter((t) => isSeen(prefs, t.id));
  if (seenFilter === "unseen") return titles.filter((t) => !isSeen(prefs, t.id));
  return titles;
}

export function feedTitles(titles: Title[], prefs: Prefs) {
  if (!prefs.hideSeenFromFeed) return titles;
  return titles.filter((t) => !isSeen(prefs, t.id));
}
