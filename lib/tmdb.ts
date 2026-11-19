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

export async function enrichWithProviders(items: any[], limit = 12, overrideKey?: string): Promise<Title[]> {
  const out: Title[] = [];
  for (const item of items.slice(0, limit)) {
    out.push(await withProviders(baseTitle(item), overrideKey));
  }
  return out;
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

export async function tmdbDiscoverByProviders(providerIds: number[], overrideKey?: string): Promise<Title[]> {
  // Virtuelle Free-TV-ID (-1) vor TMDb-Aufruf entfernen; reine Free-Auswahl
  // bedeutet: freie / werbefinanzierte Titel ohne Provider-Einschränkung.
  const realIds = providerIds.filter((n) => Number.isFinite(n) && n > 0);
  const freeOnly = realIds.length === 0 && providerIds.includes(-1);
  if (realIds.length === 0 && !freeOnly) return [];
  if (freeOnly) {
    const [movies, tv] = await Promise.all([
      tmdb("/discover/movie", {
        watch_region: "DE",
        with_watch_monetization_types: "free|ads",
        sort_by: "popularity.desc",
        page: "1",
        include_adult: "false"
      }, overrideKey).catch(() => null),
      tmdb("/discover/tv", {
        watch_region: "DE",
        with_watch_monetization_types: "free|ads",
        sort_by: "popularity.desc",
        page: "1",
        include_adult: "false"
      }, overrideKey).catch(() => null)
    ]);
    const items = [
      ...((movies?.results ?? []).map((r: any) => ({ ...r, media_type: "movie" }))),
      ...((tv?.results ?? []).map((r: any) => ({ ...r, media_type: "tv" })))
    ];
    items.sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0));
    return enrichWithProviders(items, 12, overrideKey);
  }
  const joined = realIds.join("|");
  const [movies, tv] = await Promise.all([
    tmdb("/discover/movie", {
      watch_region: "DE",
      with_watch_providers: joined,
      with_watch_monetization_types: "flatrate|free|ads",
      sort_by: "popularity.desc",
      page: "1",
      include_adult: "false"
    }, overrideKey).catch(() => null),
    tmdb("/discover/tv", {
      watch_region: "DE",
      with_watch_providers: joined,
      with_watch_monetization_types: "flatrate|free|ads",
      sort_by: "popularity.desc",
      page: "1",
      include_adult: "false"
    }, overrideKey).catch(() => null)
  ]);
  const items = [
    ...((movies?.results ?? []).map((r: any) => ({ ...r, media_type: "movie" }))),
    ...((tv?.results ?? []).map((r: any) => ({ ...r, media_type: "tv" })))
  ];
  items.sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0));
  return enrichWithProviders(items, 12, overrideKey);
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
