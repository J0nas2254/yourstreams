/**
 * Reine, frameworkfreie Gesehen-Logik (für `npm test` ohne TS-Loader).
 * lib/prefs.ts implementiert dieselbe Semantik typisiert für die App.
 */
export const STORAGE_KEY = "sf:prefs:v2";

export function defaultPrefs() {
  return {
    household: "Haushalt",
    seenIds: [],
    seenEpisodes: {},
    watchlist: [],
    hideSeenFromFeed: true,
  };
}

export function migrateV1toV2(v1) {
  const base = defaultPrefs();
  if (!v1 || typeof v1 !== "object") return base;
  return {
    ...base,
    household: typeof v1.household === "string" ? v1.household : base.household,
    seenIds: Array.isArray(v1.seenIds) ? [...v1.seenIds] : [],
    seenEpisodes: {},
    watchlist: Array.isArray(v1.watchlist) ? [...v1.watchlist] : [],
    hideSeenFromFeed: v1.hideSeenFromFeed !== false,
  };
}

export function episodeKey(season, episode) {
  return `S${season}E${episode}`;
}

export function isSeen(prefs, id) {
  return prefs.seenIds.includes(id);
}

export function markSeen(prefs, id) {
  if (prefs.seenIds.includes(id)) return prefs;
  return { ...prefs, seenIds: [...prefs.seenIds, id] };
}

export function unmarkSeen(prefs, id) {
  return { ...prefs, seenIds: prefs.seenIds.filter((x) => x !== id) };
}

export function toggleEpisodeSeen(prefs, titleId, season, episode) {
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

export function setSeasonSeen(prefs, titleId, season, episodes, seen) {
  const keys = episodes.map((e) => (typeof e === "string" ? e : episodeKey(e.season, e.episode)));
  // Nur diese Staffel anfassen, andere Staffeln behalten
  const prefix = `S${season}E`;
  const rest = (prefs.seenEpisodes[titleId] ?? []).filter((k) => !k.startsWith(prefix));
  const next = seen ? [...new Set([...rest, ...keys])] : rest;
  return {
    ...prefs,
    seenEpisodes: { ...prefs.seenEpisodes, [titleId]: next },
  };
}

export function markSeriesSeen(prefs, title, allEpisodeKeys) {
  const withEps = {
    ...prefs,
    seenEpisodes: { ...prefs.seenEpisodes, [title.id]: [...allEpisodeKeys] },
  };
  return markSeen(withEps, title.id);
}

export function unmarkSeries(prefs, titleId) {
  const copy = { ...prefs.seenEpisodes };
  delete copy[titleId];
  return unmarkSeen({ ...prefs, seenEpisodes: copy }, titleId);
}

export function countSeenEpisodes(prefs, titleId) {
  return (prefs.seenEpisodes[titleId] ?? []).length;
}

/**
 * Nächste noch nicht gesehene Episode (nach Staffel/Episode sortiert).
 * Gibt null zurück, wenn alles gesehen oder keine Episoden bekannt.
 */
export function nextUnseenEpisode(prefs, titleId, allEpisodes) {
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

export function applySeenFilter(titles, prefs, seenFilter) {
  if (seenFilter === "seen") return titles.filter((t) => isSeen(prefs, t.id));
  if (seenFilter === "unseen") return titles.filter((t) => !isSeen(prefs, t.id));
  return titles;
}

/** „Für dich": gesehene Filme + vollständig gesehene Serien ausblenden. */
export function feedTitles(titles, prefs) {
  if (!prefs.hideSeenFromFeed) return titles;
  return titles.filter((t) => !isSeen(prefs, t.id));
}
