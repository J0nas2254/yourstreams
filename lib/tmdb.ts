import type { AvailabilityEntry, AvailabilityKind, Genre, Title } from "./types";

const TMDB_BASE = "https://api.themoviedb.org/3";

export function envTmdbKey(): string {
  return (process.env.TMDB_API_KEY ?? "").trim();
}

export function tmdbKey(overrideKey?: string): string {
  const o = (overrideKey ?? "").trim();
  if (o) return o;
  return envTmdbKey();
}

export function hasTmdbKey(overrideKey?: string): boolean {
  return tmdbKey(overrideKey).length > 0;
}

/** Liest einen per Eingabefeld mitgeschickten Schlüssel aus dem Request-Header. */
export function tmdbKeyFromRequest(req: Request): string {
  return (req.headers.get("x-tmdb-key") ?? "").trim();
}

async function tmdb(path: string, params: Record<string, string> = {}, overrideKey?: string) {
  const key = tmdbKey(overrideKey);
  if (!key) throw new Error("NO_TMDB_KEY");
  const url = new URL(TMDB_BASE + path);
  url.searchParams.set("api_key", key);
  url.searchParams.set("language", "de-DE");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url.toString(), { next: { revalidate: 3600 } });
  if (!res.ok) throw new Error(`TMDb-Fehler: ${res.status}`);
  return res.json();
}

type TmdbProviderItem = {
  provider_id: number;
  provider_name: string;
  logo_path?: string | null;
};

function mapWatchProviders(de: any): { availability: AvailabilityEntry[]; link: string | null } {
  const availability: AvailabilityEntry[] = [];
  if (!de) return { availability, link: null };
  const mapping: Array<[string, AvailabilityKind]> = [
    ["flatrate", "flatrate"],
    ["free", "free"],
    ["ads", "ads"],
    ["rent", "rent"],
    ["buy", "buy"]
  ];
  for (const [field, kind] of mapping) {
    const list = de[field] as TmdbProviderItem[] | undefined;
    if (Array.isArray(list)) {
      for (const p of list) {
        availability.push({
          provider_id: p.provider_id,
          provider_name: p.provider_name,
          kind
        });
      }
    }
  }
  return { availability, link: typeof de.link === "string" ? de.link : null };
}

export function toYear(dateStr?: string | null): number | null {
  if (!dateStr) return null;
  const y = Number(String(dateStr).slice(0, 4));
  return Number.isFinite(y) ? y : null;
}

export function tmdbIdOf(t: Title): { mediaType: "movie" | "tv"; tmdbId: number } | null {
  const m = t.id.match(/^tmdb-(movie|tv)-(\d+)$/);
  if (m) return { mediaType: m[1] as "movie" | "tv", tmdbId: Number(m[2]) };
  if (typeof t.tmdbId === "number") return { mediaType: t.mediaType, tmdbId: t.tmdbId };
  return null;
}

function baseTitle(item: any): Title {
  const mediaType = item.media_type === "tv" ? "tv" : "movie";
  return {
    id: `tmdb-${mediaType}-${item.id}`,
    tmdbId: item.id,
    mediaType,
    title: item.title ?? item.name ?? "Ohne Titel",
    year: toYear(item.release_date ?? item.first_air_date),
    overview: item.overview ?? "",
    genres: [],
    genreIds: Array.isArray(item.genre_ids) ? item.genre_ids : [],
    posterPath: item.poster_path ?? null,
    backdropPath: item.backdrop_path ?? null,
    voteAverage: typeof item.vote_average === "number" ? item.vote_average : null,
    availability: [],
    justWatchLink: null
  };
}

async function withProviders(t: Title, overrideKey?: string): Promise<Title> {
  const ref = tmdbIdOf(t);
  if (!ref) return t;
  try {
    const wp = await tmdb(`/${ref.mediaType === "tv" ? "tv" : "movie"}/${ref.tmdbId}/watch/providers`, {}, overrideKey);
    const de = wp?.results?.DE ?? null;
    const { availability, link } = mapWatchProviders(de);
    return { ...t, availability, justWatchLink: link };
  } catch {
    return t;
  }
}

// Genre-ID -> Name (Film- + Serien-Genres vereint), kurz gecacht pro Key.
let genreMapCache: { key: string; at: number; map: Map<number, string> } | null = null;
async function genreNameMap(overrideKey?: string): Promise<Map<number, string>> {
  const key = tmdbKey(overrideKey);
  if (genreMapCache && genreMapCache.key === key && Date.now() - genreMapCache.at < 3600_000) {
    return genreMapCache.map;
  }
  const map = new Map<number, string>();
  try {
    const g = await tmdbGenres(overrideKey);
    for (const genre of [...g.movie, ...g.tv]) {
      if (!map.has(genre.id)) map.set(genre.id, genre.name);
    }
  } catch {
    // ohne Namen weiterarbeiten – Filter fallen dann nicht alles raus
  }
  genreMapCache = { key, at: Date.now(), map };
  return map;
}

export async function enrichWithProviders(items: any[], limit = 12, overrideKey?: string): Promise<Title[]> {
  const names = await genreNameMap(overrideKey);
  const sliced = items.slice(0, limit);
  const bases = sliced.map((item) => {
    const base = baseTitle(item);
    if (base.genres.length === 0 && Array.isArray(base.genreIds)) {
      base.genres = base.genreIds
        .map((id) => names.get(id))
        .filter((n): n is string => typeof n === "string");
    }
    return base;
  });
  // Anbieter in kleinen Parallel-Blöcken (je 5) anreichern: einzeln nacheinander
  // dauert ewig, zu große Blöcke laufen in TMDb-Limits (429) – dann hätten
  // Titel stillschweigend keine Anbieter und Filter würden sie aussortieren.
  const out: Title[] = [];
  for (let i = 0; i < bases.length; i += 5) {
    const chunk = await Promise.all(bases.slice(i, i + 5).map((b) => withProviders(b, overrideKey)));
    out.push(...chunk);
  }
  return out;
}

/** Ähnliche Titel zu einem bewerteten Film/Serie (TMDb-Similar) – Algorithmus-Futter für „Für dich“. */
export async function tmdbSimilar(mediaType: "movie" | "tv", tmdbId: number, overrideKey?: string): Promise<Title[]> {
  const data = await tmdb(`/${mediaType}/${tmdbId}/similar`, { page: "1" }, overrideKey);
  const items = (data?.results ?? [])
    .filter((r: any) => typeof r?.id === "number")
    .map((r: any) => ({ ...r, media_type: mediaType }));
  return enrichWithProviders(items, 20, overrideKey);
}

export async function tmdbSearch(query: string, overrideKey?: string): Promise<Title[]> {
  const data = await tmdb("/search/multi", {
    query,
    page: "1",
    include_adult: "false",
    region: "DE"
  }, overrideKey);
  const items = (data?.results ?? []).filter(
    (r: any) => r?.media_type === "movie" || r?.media_type === "tv"
  );
  return enrichWithProviders(items, 12, overrideKey);
}

export async function tmdbTrending(overrideKey?: string): Promise<Title[]> {
  const data = await tmdb("/trending/all/week", { region: "DE" }, overrideKey);
  const items = (data?.results ?? []).filter(
    (r: any) => r?.media_type === "movie" || r?.media_type === "tv"
  );
  return enrichWithProviders(items, 12, overrideKey);
}

export interface DiscoverOptions {
  genreId?: number | null;
  yearFrom?: number | null;
  yearTo?: number | null;
  mediaType?: "movie" | "tv" | "all";
  /** TMDb-Seite (1-basiert) für „Mehr“-Ansichten mit bis zu 220 Titeln. */
  page?: number | null;
}

export async function tmdbDiscoverByProviders(
  providerIds: number[],
  overrideKey?: string,
  opts?: DiscoverOptions
): Promise<Title[]> {
  // Virtuelle Free-TV-ID (-1) vor TMDb-Aufruf entfernen; reine Free-Auswahl
  // bedeutet: freie / werbefinanzierte Titel ohne Provider-Einschränkung.
  const realIds = providerIds.filter((n) => Number.isFinite(n) && n > 0);
  const freeOnly = realIds.length === 0 && providerIds.includes(-1);
  const mediaType = opts?.mediaType ?? "all";
  const wantMovie = mediaType === "all" || mediaType === "movie";
  const wantTv = mediaType === "all" || mediaType === "tv";
  const monetization = freeOnly ? "free|ads" : "flatrate|free|ads";
  const genreParam =
    typeof opts?.genreId === "number" && Number.isFinite(opts.genreId) ? String(opts.genreId) : undefined;
  const fromParam =
    typeof opts?.yearFrom === "number" && Number.isFinite(opts.yearFrom)
      ? `${opts.yearFrom}-01-01`
      : undefined;
  const toParam =
    typeof opts?.yearTo === "number" && Number.isFinite(opts.yearTo)
      ? `${opts.yearTo}-12-31`
      : undefined;
  const pageNum = typeof opts?.page === "number" && Number.isFinite(opts.page)
    ? Math.min(11, Math.max(1, Math.floor(opts.page)))
    : 1;
  const movieParams: Record<string, string> = {
    watch_region: "DE",
    with_watch_monetization_types: monetization,
    sort_by: "popularity.desc",
    page: String(pageNum),
    include_adult: "false"
  };
  const tvParams: Record<string, string> = { ...movieParams };
  if (realIds.length > 0) {
    const joined = realIds.join("|");
    movieParams.with_watch_providers = joined;
    tvParams.with_watch_providers = joined;
  }
  if (genreParam) {
    movieParams.with_genres = genreParam;
    tvParams.with_genres = genreParam;
  }
  if (fromParam) {
    movieParams["primary_release_date.gte"] = fromParam;
    tvParams["first_air_date.gte"] = fromParam;
  }
  if (toParam) {
    movieParams["primary_release_date.lte"] = toParam;
    tvParams["first_air_date.lte"] = toParam;
  }
  const [movies, tv] = await Promise.all([
    wantMovie ? tmdb("/discover/movie", movieParams, overrideKey).catch(() => null) : Promise.resolve(null),
    wantTv ? tmdb("/discover/tv", tvParams, overrideKey).catch(() => null) : Promise.resolve(null)
  ]);
  const items = [
    ...((movies?.results ?? []).map((r: any) => ({ ...r, media_type: "movie" }))),
    ...((tv?.results ?? []).map((r: any) => ({ ...r, media_type: "tv" })))
  ];
  items.sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0));
  // Film-Seite (20) + Serien-Seite (20) voll anreichern, sonst kommen pro
  // Discover-Abruf nur 12 Titel an und „Top 220“ bleibt fast leer.
  return enrichWithProviders(items, 40, overrideKey);
}

export async function tmdbGenres(overrideKey?: string): Promise<{ movie: Genre[]; tv: Genre[] }> {
  const [movie, tv] = await Promise.all([
    tmdb("/genre/movie/list", {}, overrideKey).catch(() => ({ genres: [] })),
    tmdb("/genre/tv/list", {}, overrideKey).catch(() => ({ genres: [] }))
  ]);
  return { movie: movie.genres ?? [], tv: tv.genres ?? [] };
}

export async function tmdbTitle(
  mediaType: "movie" | "tv",
  tmdbId: number,
  overrideKey?: string
): Promise<(Title & { imdbId: string | null }) | null> {
  try {
    const [detail, wp, ext] = await Promise.all([
      tmdb(`/${mediaType}/${tmdbId}`, {}, overrideKey),
      tmdb(`/${mediaType}/${tmdbId}/watch/providers`, {}, overrideKey).catch(() => null),
      tmdb(`/${mediaType}/${tmdbId}/external_ids`, {}, overrideKey).catch(() => null)
    ]);
    const de = (wp as any)?.results?.DE ?? null;
    const { availability, link } = mapWatchProviders(de);
    const genres = Array.isArray(detail?.genres)
      ? detail.genres.map((g: any) => g?.name).filter(Boolean)
      : [];
    const genreIds = Array.isArray(detail?.genres)
      ? detail.genres.map((g: any) => g?.id).filter((n: any) => typeof n === "number")
      : [];
    const seasons = Array.isArray((detail as any)?.seasons)
      ? (detail as any).seasons
          .filter((s: any) => typeof s?.season_number === "number")
          .map((s: any) => ({
            season_number: s.season_number,
            name: typeof s.name === "string" && s.name ? s.name : `Staffel ${s.season_number}`,
            episode_count: typeof s.episode_count === "number" ? s.episode_count : 0
          }))
          .sort((a: { season_number: number }, b: { season_number: number }) => a.season_number - b.season_number)
      : [];
    return {
      id: `tmdb-${mediaType}-${tmdbId}`,
      tmdbId,
      mediaType,
      title: detail?.title ?? detail?.name ?? "Ohne Titel",
      year: toYear(detail?.release_date ?? detail?.first_air_date),
      overview: detail?.overview ?? "",
      genres,
      genreIds,
      posterPath: detail?.poster_path ?? null,
      backdropPath: detail?.backdrop_path ?? null,
      voteAverage: typeof detail?.vote_average === "number" ? detail.vote_average : null,
      imdbId: typeof (ext as any)?.imdb_id === "string" ? (ext as any).imdb_id : null,
      availability,
      justWatchLink: link,
      tvInfo: mediaType === "tv" ? { seasons } : null
    };
  } catch {
    return null;
  }
}

/** Echte Episodendaten einer Staffel (TMDb), sortiert nach Episodennummer. */
export async function tmdbSeasonEpisodes(
  tmdbId: number,
  seasonNumber: number,
  overrideKey?: string
): Promise<Array<{ id: number; season_number: number; episode_number: number; name: string; overview: string; still_path?: string | null; air_date?: string | null }>> {
  const data = await tmdb(`/tv/${tmdbId}/season/${seasonNumber}`, {}, overrideKey);
  const eps = Array.isArray(data?.episodes) ? data.episodes : [];
  return eps
    .filter((e: any) => typeof e?.id === "number" && typeof e?.episode_number === "number")
    .map((e: any) => ({
      id: e.id,
      season_number: typeof e.season_number === "number" ? e.season_number : seasonNumber,
      episode_number: e.episode_number,
      name: typeof e.name === "string" && e.name ? e.name : `Episode ${e.episode_number}`,
      overview: typeof e.overview === "string" ? e.overview : "",
      still_path: e.still_path ?? null,
      air_date: e.air_date ?? null
    }))
    .sort((a: { episode_number: number }, b: { episode_number: number }) => a.episode_number - b.episode_number);
}

export async function tmdbProvidersDE(overrideKey?: string) {
  const [movie, tv] = await Promise.all([
    tmdb("/watch/providers/movie", { watch_region: "DE" }, overrideKey),
    tmdb("/watch/providers/tv", { watch_region: "DE" }, overrideKey)
  ]);
  const seen = new Map<number, { provider_id: number; provider_name: string; logoPath?: string | null }>();
  for (const list of [movie?.results ?? [], tv?.results ?? []]) {
    for (const p of list) {
      if (!seen.has(p.provider_id)) {
        seen.set(p.provider_id, {
          provider_id: p.provider_id,
          provider_name: p.provider_name,
          logoPath: p.logo_path ?? null
        });
      }
    }
  }
  return Array.from(seen.values()).sort((a, b) => a.provider_name.localeCompare(b.provider_name, "de"));
}
