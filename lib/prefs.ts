import type { Prefs, ScoredTitle, Title } from "./types.ts";
import { isOnMyServices, isOnMyServicesEntries } from "./filter.ts";
import { FREE_TV_ID } from "./free-tv.ts";

// Lokale, nachvollziehbare Empfehlungslogik – kein KI-Dienst, kein Konto.
// Verwendet nur löschbare TypeScript-Syntax, damit node --test sie direkt prüfen kann.

export const PREFS_KEY = "sf:prefs:v2";

export function emptyPrefs(): Prefs {
  // Free TV ist standardmäßig dabei (ein Punkt statt vieler Free-Einzeldienste).
  return { services: [FREE_TV_ID], watchlist: [], seen: [], seenEpisodes: {}, interests: {}, notInterested: [] };
}

export function migrateLegacy(raw: unknown): Prefs {
  const base = emptyPrefs();
  if (typeof raw !== "object" || raw === null) return base;
  const r = raw as Record<string, unknown>;
  if (Array.isArray(r.services)) base.services = (r.services as unknown[]).filter((n) => typeof n === "number") as number[];
  if (Array.isArray(r.watchlist)) {
    base.watchlist = (r.watchlist as unknown[])
      .filter((w) => typeof w === "object" && w !== null && typeof (w as { id?: unknown }).id === "string")
      .map((w) => w as { id: string; addedAt: string });
  }
  if (Array.isArray(r.seen)) base.seen = (r.seen as unknown[]).filter((s) => typeof s === "string") as string[];
  if (typeof r.seenEpisodes === "object" && r.seenEpisodes !== null) {
    const out: Record<string, number[]> = {};
    for (const [k, v] of Object.entries(r.seenEpisodes as Record<string, unknown>)) {
      if (Array.isArray(v)) {
        const ids = (v as unknown[]).filter((n) => typeof n === "number") as number[];
        if (ids.length > 0) out[k] = [...new Set(ids)];
      }
    }
    base.seenEpisodes = out;
  }
  if (typeof r.interests === "object" && r.interests !== null) {
    const out: Record<string, "up" | "down"> = {};
    for (const [k, v] of Object.entries(r.interests as Record<string, unknown>)) {
      if (v === "up" || v === "down") out[k] = v;
    }
    base.interests = out;
  }
  if (Array.isArray(r.notInterested)) {
    base.notInterested = (r.notInterested as unknown[]).filter((s) => typeof s === "string") as string[];
  }
  // Altes Format sf:watchlist:v1 einmischen (wird vom Hook übergeben)
  if (Array.isArray((r as { legacyWatchlist?: unknown }).legacyWatchlist)) {
    const legacy = (r as { legacyWatchlist: unknown[] }).legacyWatchlist;
    for (const w of legacy) {
      if (typeof w === "object" && w !== null && typeof (w as { id?: unknown }).id === "string") {
        const id = (w as { id: string }).id;
        if (!base.watchlist.some((x) => x.id === id)) {
          base.watchlist.push({ id, addedAt: new Date(0).toISOString() });
        }
      }
    }
  }
  return base;
}

function genreNames(t: Title): string[] {
  return t.genres ?? [];
}

/** Gewichtung der Genres aus expliziten Interessen (+2/-2) plus schwachem Merklisten-Signal (+0.5). */
export function genreWeights(prefs: Prefs, pool: Title[]): Map<string, number> {
  const weights = new Map<string, number>();
  const byId = new Map(pool.map((t) => [t.id, t]));
  for (const item of prefs.watchlist) {
    const t = byId.get(item.id);
    if (!t) continue;
    for (const g of genreNames(t)) weights.set(g, (weights.get(g) ?? 0) + 0.5);
  }
  for (const [id, dir] of Object.entries(prefs.interests)) {
    const t = byId.get(id);
    if (!t) continue;
    const delta = dir === "up" ? 2 : -2;
    for (const g of genreNames(t)) weights.set(g, (weights.get(g) ?? 0) + delta);
  }
  return weights;
}

export interface ScoreOptions {
  explainServices?: boolean;
}

/**
 * Bewertet Kandidaten. Regeln:
 * - gesehene und „nicht interessiert“ Titel fallen heraus
 * - „Interessiert mich“ stärkt Genres ähnlicher Titel, „Nicht interessiert“ schwächt sie
 * - Merkliste und Haushaltsdienste sind schwache positive Signale
 * - „Auf meinen Diensten“ zeigt nur Titel mit passender echter Provider-ID
 */
export function scoreTitles(
  candidates: Title[],
  prefs: Prefs,
  opts: ScoreOptions = {}
): ScoredTitle[] {
  const weights = genreWeights(prefs, candidates);
  const seen = new Set(prefs.seen);
  const not = new Set(prefs.notInterested);
  const out: ScoredTitle[] = [];

  for (const t of candidates) {
    if (seen.has(t.id) || not.has(t.id)) continue;
    let score = 0;
    const reasons: string[] = [];
    const onMine = isOnMyServicesEntries(t.availability, prefs.services);

    let genreScore = 0;
    const matched: string[] = [];
    for (const g of genreNames(t)) {
      const w = weights.get(g) ?? 0;
      if (w !== 0) {
        genreScore += w;
        if (w > 0) matched.push(g);
      }
    }
    if (genreScore !== 0) {
      score += genreScore;
      const top = matched.slice(0, 2);
      if (top.length > 0) {
        reasons.push(
          genreScore > 0
            ? `Weil du dich für ${top.join(" & ")} interessierst`
            : `Weniger passend zu deinen Interessen`
        );
      }
    }
    if (prefs.watchlist.some((w) => w.id === t.id)) {
      score += 1;
      reasons.push("Auf deiner Merkliste");
    }
    if (onMine) {
      score += 1.5;
      if (opts.explainServices !== false) reasons.push("Auf deinen Diensten verfügbar");
    }
    if (typeof t.voteAverage === "number" && t.voteAverage >= 7.5) {
      score += 0.5;
    }
    out.push({ title: t, score, reasons });
  }
  out.sort((a, b) => b.score - a.score);
  return out;
}

/** Zählt gesehene Episoden einer Menge (echte TMDb-Episoden-IDs). */
export function countSeenEpisodes(episodeIds: number[], seenIds: number[] | undefined): number {
  if (!seenIds || seenIds.length === 0) return 0;
  const seen = new Set(seenIds);
  return episodeIds.filter((id) => seen.has(id)).length;
}

export interface NextEpisode {
  season_number: number;
  episode_number: number;
  name: string;
}

/**
 * Nächste noch nicht gesehene Episode (Reihenfolge: Staffel, dann Episode).
 * Gibt null zurück, wenn alles gesehen ist.
 */
export function nextUnseenEpisode(
  episodes: Array<{ id: number; season_number: number; episode_number: number; name: string }>,
  seenIds: number[] | undefined
): NextEpisode | null {
  const seen = new Set(seenIds ?? []);
  const ordered = [...episodes].sort(
    (a, b) => a.season_number - b.season_number || a.episode_number - b.episode_number
  );
  const next = ordered.find((e) => !seen.has(e.id));
  if (!next) return null;
  return { season_number: next.season_number, episode_number: next.episode_number, name: next.name };
}

/** Filter „Auf meinen Diensten“ plus optionale weitere Filter für die Suche. */
export interface SearchFilters {
  onlyMine: boolean;
  services: number[];
  mediaType?: "movie" | "tv" | "all";
  genre?: string;
  yearFrom?: number | null;
  yearTo?: number | null;
  providerId?: number | null;
  includedOnly?: boolean;
  minImdb?: number | null;
  imdbById?: Map<string, number | null>;
  excludeIds?: Set<string>;
  seenFilter?: "all" | "unseen" | "seen";
  seenIds?: Set<string>;
}

const INCLUDED = new Set(["flatrate", "free", "ads"]);

export function applySearchFilters(titles: Title[], f: SearchFilters): Title[] {
  return titles.filter((t) => {
    if (f.onlyMine && !isOnMyServicesEntries(t.availability, f.services)) return false;
    if (f.mediaType && f.mediaType !== "all" && t.mediaType !== f.mediaType) return false;
    if (f.genre && !(t.genres ?? []).includes(f.genre)) return false;
    if (typeof f.yearFrom === "number" && (t.year === null || t.year < f.yearFrom)) return false;
    if (typeof f.yearTo === "number" && (t.year === null || t.year > f.yearTo)) return false;
    if (typeof f.providerId === "number") {
      if (f.providerId === FREE_TV_ID) {
        if (!t.availability.some((a) => a.kind === "free" || a.kind === "ads")) return false;
      } else if (!t.availability.some((a) => a.provider_id === f.providerId)) return false;
    }
    if (f.includedOnly && !t.availability.some((a) => INCLUDED.has(a.kind))) return false;
    if (typeof f.minImdb === "number") {
      const r = f.imdbById?.get(t.id);
      if (typeof r !== "number" || r < (f.minImdb as number)) return false;
    }
    if (f.excludeIds?.has(t.id)) return false;
    if (f.seenFilter === "unseen" && f.seenIds?.has(t.id)) return false;
    if (f.seenFilter === "seen" && !f.seenIds?.has(t.id)) return false;
    return true;
  });
}
