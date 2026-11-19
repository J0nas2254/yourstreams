"use client";

import { useCallback, useEffect, useState } from "react";
import type { Prefs } from "./types.ts";
import { PREFS_KEY, emptyPrefs, migrateLegacy } from "./prefs.ts";
import { isOnMyServices } from "./filter.ts";

export { isOnMyServices };
export { PREFS_KEY };

const LEGACY_SERVICES = "sf:services:v1";
const LEGACY_WATCHLIST = "sf:watchlist:v1";

export interface WatchSnapshot {
  id: string;
  title: string;
  year: number | null;
  mediaType: "movie" | "tv";
  posterPath?: string | null;
  addedAt: string;
}

const SNAPSHOT_KEY = "sf:watchlist-snapshots:v1";

function readRaw(key: string): unknown {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as unknown) : null;
  } catch {
    return null;
  }
}

function writeRaw(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Speicher voll oder blockiert: still weitermachen
  }
}

function loadPrefs(): Prefs {
  const current = readRaw(PREFS_KEY);
  if (current && typeof current === "object") return migrateLegacy(current);
  // Migration aus V1-Schlüsseln
  const legacyServices = readRaw(LEGACY_SERVICES);
  const legacyWatchlist = readRaw(LEGACY_WATCHLIST);
  return migrateLegacy({ services: legacyServices, watchlist: legacyWatchlist });
}

export function loadSnapshots(): WatchSnapshot[] {
  const raw = readRaw(SNAPSHOT_KEY);
  if (!Array.isArray(raw)) return [];
  return (raw as unknown[]).filter(
    (s) => typeof s === "object" && s !== null && typeof (s as { id?: unknown }).id === "string"
  ) as WatchSnapshot[];
}

function saveSnapshot(snap: WatchSnapshot) {
  const all = loadSnapshots().filter((s) => s.id !== snap.id);
  all.push(snap);
  writeRaw(SNAPSHOT_KEY, all);
}

function removeSnapshot(id: string) {
  writeRaw(
    SNAPSHOT_KEY,
    loadSnapshots().filter((s) => s.id !== id)
  );
}

export function usePrefs() {
  const [prefs, setPrefs] = useState<Prefs>(emptyPrefs);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setPrefs(loadPrefs());
    setLoaded(true);
  }, []);

  const update = useCallback((fn: (prev: Prefs) => Prefs) => {
    setPrefs((prev) => {
      const next = fn(prev);
      writeRaw(PREFS_KEY, next);
      return next;
    });
  }, []);

  const toggleService = useCallback(
    (providerId: number) =>
      update((prev) => ({
        ...prev,
        services: prev.services.includes(providerId)
          ? prev.services.filter((id) => id !== providerId)
          : [...prev.services, providerId]
      })),
    [update]
  );

  const clearServices = useCallback(() => update((prev) => ({ ...prev, services: [] })), [update]);

  const toggleWatch = useCallback(
    (id: string, snap?: Omit<WatchSnapshot, "id" | "addedAt">) => {
      update((prev) => {
        const exists = prev.watchlist.some((w) => w.id === id);
        if (exists) {
          removeSnapshot(id);
          return { ...prev, watchlist: prev.watchlist.filter((w) => w.id !== id) };
        }
        if (snap) {
          saveSnapshot({ ...snap, id, addedAt: new Date().toISOString() });
        }
        return { ...prev, watchlist: [...prev.watchlist, { id, addedAt: new Date().toISOString() }] };
      });
    },
    [update]
  );

  const removeWatch = useCallback(
    (id: string) => {
      removeSnapshot(id);
      update((prev) => ({ ...prev, watchlist: prev.watchlist.filter((w) => w.id !== id) }));
    },
    [update]
  );

  const toggleSeen = useCallback(
    (id: string) =>
      update((prev) => ({
        ...prev,
        seen: prev.seen.includes(id) ? prev.seen.filter((s) => s !== id) : [...prev.seen, id]
      })),
    [update]
  );

  const setInterest = useCallback(
    (id: string, dir: "up" | "down" | null) =>
      update((prev) => {
        const interests = { ...prev.interests };
        if (dir === null) delete interests[id];
        else interests[id] = dir;
        const notInterested = dir === "down"
          ? [...new Set([...prev.notInterested, id])]
          : prev.notInterested.filter((n) => n !== id);
        return { ...prev, interests, notInterested };
      }),
    [update]
  );

  // ---- Gesehen-Status für Serien (Staffeln / Episoden, echte TMDb-IDs) ----

  const toggleEpisodeSeen = useCallback(
    (titleId: string, episodeId: number) =>
      update((prev) => {
        const current = prev.seenEpisodes[titleId] ?? [];
        const next = current.includes(episodeId)
          ? current.filter((id) => id !== episodeId)
          : [...current, episodeId];
        const seenEpisodes = { ...prev.seenEpisodes };
        if (next.length === 0) delete seenEpisodes[titleId];
        else seenEpisodes[titleId] = next;
        // Einzelne Episodenänderung hebt den pauschalen „ganz gesehen“-Status auf
        return { ...prev, seenEpisodes, seen: prev.seen.filter((s) => s !== titleId) };
      }),
    [update]
  );

  const setSeasonSeen = useCallback(
    (titleId: string, episodeIds: number[], seenValue: boolean) =>
      update((prev) => {
        const current = new Set(prev.seenEpisodes[titleId] ?? []);
        if (seenValue) for (const id of episodeIds) current.add(id);
        else for (const id of episodeIds) current.delete(id);
        const seenEpisodes = { ...prev.seenEpisodes };
        if (current.size === 0) delete seenEpisodes[titleId];
        else seenEpisodes[titleId] = [...current];
        const seen = seenValue
          ? prev.seen.filter((s) => s !== titleId)
          : prev.seen;
        return { ...prev, seenEpisodes, seen };
      }),
    [update]
  );

  /** „Alle Episoden als gesehen markieren“: kennzeichnet die Serie als gesehen. */
  const markSeriesSeen = useCallback(
    (titleId: string, allEpisodeIds: number[]) =>
      update((prev) => ({
        ...prev,
        seen: [...new Set([...prev.seen, titleId])],
        seenEpisodes: { ...prev.seenEpisodes, [titleId]: [...new Set(allEpisodeIds)] }
      })),
    [update]
  );

  /** Rückgängig: Serien-Status und alle Episoden-Markierungen dieser Serie entfernen. */
  const unmarkSeries = useCallback(
    (titleId: string) =>
      update((prev) => {
        const seenEpisodes = { ...prev.seenEpisodes };
        delete seenEpisodes[titleId];
        return { ...prev, seen: prev.seen.filter((s) => s !== titleId), seenEpisodes };
      }),
    [update]
  );

  const undoNotInterested = useCallback(
    (id: string) =>
      update((prev) => ({
        ...prev,
        notInterested: prev.notInterested.filter((n) => n !== id),
        interests: Object.fromEntries(Object.entries(prev.interests).filter(([k]) => k !== id))
      })),
    [update]
  );

  const resetInterests = useCallback(
    () =>
      update((prev) => ({
        ...prev,
        interests: {},
        notInterested: [],
        seen: [],
        seenEpisodes: {}
      })),
    [update]
  );

  const hasWatch = useCallback((id: string) => prefs.watchlist.some((w) => w.id === id), [prefs.watchlist]);

  return {
    prefs,
    loaded,
    services: prefs.services,
    toggleService,
    clearServices,
    watchlist: prefs.watchlist,
    toggleWatch,
    removeWatch,
    hasWatch,
    seen: prefs.seen,
    toggleSeen,
    seenEpisodes: prefs.seenEpisodes,
    toggleEpisodeSeen,
    setSeasonSeen,
    markSeriesSeen,
    unmarkSeries,
    setInterest,
    undoNotInterested,
    resetInterests
  };
}
