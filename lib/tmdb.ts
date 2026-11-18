import type { Title, TvEpisode } from "./types";

const TMDB_IMG = "https://image.tmdb.org/t/p/w500";

export function tmdbKey(): string | null {
  return process.env.TMDB_API_KEY ?? null;
}

export function missingKeyResponse() {
  return {
    error: "TMDB_API_KEY fehlt",
    hint: "Lege .env.local mit TMDB_API_KEY an (siehe .env.example) und starte neu. Es werden keine Demo-Daten angezeigt.",
  };
}

async function tmdb(path: string) {
  const key = tmdbKey();
  if (!key) {
    const e = new Error("TMDB_API_KEY fehlt") as Error & { status?: number };
    e.status = 503;
    throw e;
  }
  const url = `https://api.themoviedb.org/3${path}${
    path.includes("?") ? "&" : "?"
  }api_key=${encodeURIComponent(key)}&language=de-DE`;
  const res = await fetch(url, { next: { revalidate: 3600 } });
  if (!res.ok) throw new Error(`TMDb-Fehler ${res.status}`);
  return res.json();
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapMovie(m: any): Title {
  return {
    id: `tmdb-movie-${m.id}`,
    tmdbId: m.id,
    kind: "movie",
    title: m.title ?? m.name ?? "Unbekannt",
    overview: m.overview ?? "",
    poster: m.poster_path ? `${TMDB_IMG}${m.poster_path}` : null,
    backdrop: m.backdrop_path
      ? `https://image.tmdb.org/t/p/w780${m.backdrop_path}`
      : null,
    rating:
      typeof m.vote_average === "number" ? Math.round(m.vote_average * 10) / 10 : null,
    genres: [],
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapTv(s: any): Title {
  return {
    id: `tmdb-tv-${s.id}`,
    tmdbId: s.id,
    kind: "tv",
    title: s.name ?? s.title ?? "Unbekannt",
    overview: s.overview ?? "",
    poster: s.poster_path ? `${TMDB_IMG}${s.poster_path}` : null,
    backdrop: s.backdrop_path
      ? `https://image.tmdb.org/t/p/w780${s.backdrop_path}`
      : null,
    rating:
      typeof s.vote_average === "number" ? Math.round(s.vote_average * 10) / 10 : null,
    genres: [],
  };
}

export async function searchTitles(query: string): Promise<Title[]> {
  if (!query.trim()) return [];
  const [movies, series] = await Promise.all([
    tmdb(`/search/movie?query=${encodeURIComponent(query)}&include_adult=false`),
    tmdb(`/search/tv?query=${encodeURIComponent(query)}&include_adult=false`),
  ]);
  const a = (movies.results ?? []).slice(0, 10).map(mapMovie);
  const b = (series.results ?? []).slice(0, 10).map(mapTv);
  return [...a, ...b];
}

export async function trendingTitles(): Promise<Title[]> {
  const data = await tmdb(`/trending/all/week`);
  return (data.results ?? [])
    .filter(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (r: any) => r.media_type === "movie" || r.media_type === "tv"
    )
    .slice(0, 20)
    .map((r: { media_type: string }) =>
      r.media_type === "movie" ? mapMovie(r) : mapTv(r)
    );
}

export async function titleDetails(kind: "movie" | "tv", tmdbId: number): Promise<Title> {
  const data = await tmdb(
    kind === "movie"
      ? `/movie/${tmdbId}?append_to_response=watch/providers`
      : `/tv/${tmdbId}?append_to_response=watch/providers`
  );
  const base = kind === "movie" ? mapMovie(data) : mapTv(data);
  // Verfügbarkeit (echte TMDb watch/providers, DE bevorzugt)
  try {
    const prov = data["watch/providers"]?.results?.DE?.flatrate ?? [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    base.providers = prov.map((p: any) => p.provider_name as string);
  } catch {
    base.providers = [];
  }
  if (kind === "tv") {
    const seasons = (data.seasons ?? [])
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .filter((s: any) => s.season_number >= 1)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((s: any) => ({
        season: s.season_number as number,
        count: (s.episode_count as number) ?? 0,
      }));
    base.tvInfo = { seasons };
  }
  // Genres (echt)
  if (Array.isArray(data.genres)) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    base.genres = data.genres.map((g: any) => g.name as string);
  }
  return base;
}

export async function seasonEpisodes(
  tmdbId: number,
  season: number
): Promise<TvEpisode[]> {
  const data = await tmdb(`/tv/${tmdbId}/season/${season}`);
  return (data.episodes ?? []).map(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (e: any): TvEpisode => ({
      season: e.season_number as number,
      episode: e.episode_number as number,
      name: (e.name as string) ?? `Episode ${e.episode_number}`,
      still: e.still_path
        ? `https://image.tmdb.org/t/p/w300${e.still_path}`
        : null,
      airDate: (e.air_date as string) ?? null,
      key: `S${e.season_number}E${e.episode_number}`,
    })
  );
}
