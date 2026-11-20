export type MediaType = "movie" | "tv";

export type AvailabilityKind = "flatrate" | "free" | "ads" | "rent" | "buy";

export interface ProviderRef {
  provider_id: number;
  provider_name: string;
}

export interface AvailabilityEntry extends ProviderRef {
  kind: AvailabilityKind;
}

export interface TvSeasonInfo {
  season_number: number;
  name: string;
  episode_count: number;
}

export interface TvEpisode {
  id: number;
  season_number: number;
  episode_number: number;
  name: string;
  overview: string;
  still_path?: string | null;
  air_date?: string | null;
}

export interface Title {
  id: string;
  tmdbId?: number;
  mediaType: MediaType;
  title: string;
  year: number | null;
  overview: string;
  genres: string[];
  genreIds?: number[];
  posterPath?: string | null;
  backdropPath?: string | null;
  voteAverage?: number | null;
  imdbId?: string | null;
  availability: AvailabilityEntry[];
  justWatchLink?: string | null;
  /** Staffelübersicht aus echten TMDb-Seriendetails (nur mediaType "tv", sonst null). */
  tvInfo?: { seasons: TvSeasonInfo[] } | null;
}

export interface ImdbRating {
  imdbId: string;
  rating: number | null;
  votes: string | null;
  cachedAt: string;
}

export interface Provider extends ProviderRef {
  logoPath?: string | null;
}

export interface Genre {
  id: number;
  name: string;
}

// ---- Personalisierung (lokal, kein Konto) ----

export type Interest = "up" | "down";

export interface Prefs {
  services: number[];
  watchlist: Array<{ id: string; addedAt: string }>;
  /** Vollständig gesehene Titel-IDs (Filme) bzw. Serien-IDs (alle Episoden gesehen). */
  seen: string[];
  /** Einzelne gesehene Episoden pro Serien-ID (echte TMDb-Episoden-IDs). */
  seenEpisodes: Record<string, number[]>;
  interests: Record<string, Interest>; // titleId -> up/down
  notInterested: string[];
  /** Genre-Schnappschuss zum Zeitpunkt der Bewertung – damit „Interessiert mich“
   *  auch wirkt, wenn der bewertete Titel gerade nicht im geladenen Pool ist. */
  interestGenres: Record<string, string[]>;
}

export const EMPTY_PREFS: Prefs = {
  services: [],
  watchlist: [],
  seen: [],
  seenEpisodes: {},
  interests: {},
  notInterested: [],
  interestGenres: {}
};

export interface ScoredTitle {
  title: Title;
  score: number;
  reasons: string[];
}

export const AVAILABILITY_LABELS: Record<AvailabilityKind, string> = {
  flatrate: "Abo",
  free: "Kostenlos",
  ads: "Werbung",
  rent: "Leihen",
  buy: "Kaufen"
};

export const AVAILABILITY_ORDER: AvailabilityKind[] = ["flatrate", "free", "ads", "rent", "buy"];

// Als „inklusive“ gelten Kategorien ohne zusätzliche Zahlung pro Titel.
export const INCLUDED_KINDS: AvailabilityKind[] = ["flatrate", "free", "ads"];
