export type TitleKind = "movie" | "tv";

export interface TvEpisode {
  season: number;
  episode: number;
  name: string;
  still?: string | null;
  airDate?: string | null;
  key: string; // z.B. "S1E3"
}

export interface TvSeasonInfo {
  season: number;
  count: number;
  episodes?: TvEpisode[];
}

export interface Title {
  /** "tmdb-movie-<id>" oder "tmdb-tv-<id>" */
  id: string;
  tmdbId: number;
  kind: TitleKind;
  title: string;
  overview: string;
  poster?: string | null;
  backdrop?: string | null;
  /** TMDb-Bewertung (0-10). IMDb wird dort angezeigt, wo echte IMDb-Daten vorliegen. */
  rating?: number | null;
  genres?: string[];
  /** z.B. ["Netflix", "Prime"] – echte TMDb watch/providers, sonst leer */
  providers?: string[];
  tvInfo?: {
    seasons: TvSeasonInfo[];
  };
}

export interface Prefs {
  household: string;
  seenIds: string[];
  /** titleId -> ["S1E1", "S1E2", ...] */
  seenEpisodes: Record<string, string[]>;
  watchlist: string[];
  hideSeenFromFeed: boolean;
}

export type SeenFilter = "all" | "seen" | "unseen";

export interface SearchFilters {
  query: string;
  kind: "all" | TitleKind;
  provider: string; // "all" oder Anbietername
  seenFilter: SeenFilter;
  seenIds?: string[];
}
