"use client";

// Einheitlicher API-Zugang für Web und Capacitor-APK.
// Echte Daten oder klare Fehler – niemals Demo-Daten.
// Der TMDb-/OMDb-Schlüssel bleibt immer serverseitig und landet
// niemals im Browser-Bundle oder APK.
import type { Genre, ImdbRating, Provider, Title, TvEpisode } from "./types.ts";

function base(): string {
  const b = (process.env.NEXT_PUBLIC_API_BASE ?? "").trim().replace(/\/$/, "");
  return b;
}

function url(path: string): string {
  const b = base();
  return b ? `${b}${path}` : path;
}

export function isCapacitorAndroid(): boolean {
  if (typeof window === "undefined") return false;
  const w = window as unknown as { Capacitor?: { getPlatform?: () => string } };
  return w.Capacitor?.getPlatform?.() === "android";
}

export function isProbablyTV(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") return false;
  if (!isCapacitorAndroid()) return false;
  const noTouch = navigator.maxTouchPoints === 0;
  const coarse = typeof window.matchMedia === "function" && window.matchMedia("(pointer: coarse)").matches;
  return noTouch || !coarse;
}

export class ApiError extends Error {
  status: number;
  notConfigured: boolean;
  constructor(message: string, status = 0, notConfigured = false) {
    super(message);
    this.status = status;
    this.notConfigured = notConfigured;
  }
}

async function getJSON<T>(path: string): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url(path));
  } catch {
    throw new ApiError("Keine Verbindung. Prüfe deine Internetverbindung.", 0, false);
  }
  let d: any = null;
  try {
    d = await res.json();
  } catch {
    // kein JSON
  }
  if (!res.ok) {
    const notConfigured = res.status === 503 || d?.configured === false;
    throw new ApiError(
      d?.error ?? `Anfrage fehlgeschlagen (${res.status})`,
      res.status,
      notConfigured
    );
  }
  return d as T;
}

export async function apiStatus(): Promise<{ configured: boolean; omdbConfigured: boolean; region: string }> {
  try {
    return await getJSON("/api/status");
  } catch (e) {
    if (e instanceof ApiError) throw e;
    return { configured: false, omdbConfigured: false, region: "DE" };
  }
}

export async function apiSearch(query: string): Promise<Title[]> {
  const d = await getJSON<{ results: Title[] }>(`/api/search?q=${encodeURIComponent(query)}`);
  return d.results ?? [];
}

export async function apiTrending(): Promise<Title[]> {
  const d = await getJSON<{ results: Title[] }>("/api/trending");
  return d.results ?? [];
}

export async function apiDiscover(providerIds: number[]): Promise<Title[]> {
  if (providerIds.length === 0) return [];
  const d = await getJSON<{ results: Title[] }>(`/api/discover?providers=${providerIds.join(",")}`);
  return d.results ?? [];
}

export async function apiProviders(): Promise<Provider[]> {
  const d = await getJSON<{ providers: Provider[] }>("/api/providers");
  return d.providers ?? [];
}

export async function apiGenres(): Promise<{ movie: Genre[]; tv: Genre[] }> {
  const d = await getJSON<{ movie: Genre[]; tv: Genre[] }>("/api/genres");
  return { movie: d.movie ?? [], tv: d.tv ?? [] };
}

export async function apiTitle(id: string): Promise<Title & { imdbId?: string | null }> {
  const d = await getJSON<{ title: Title & { imdbId?: string | null } }>(
    `/api/title/${encodeURIComponent(id)}`
  );
  if (!d?.title) throw new ApiError("Titel nicht gefunden.", 404, false);
  return d.title;
}

/** Echte Episodendaten einer Staffel. Nur für Serien-IDs (tmdb-tv-*). */
export async function apiSeasonEpisodes(titleId: string, seasonNumber: number): Promise<TvEpisode[]> {
  const m = titleId.match(/^tmdb-tv-(\d+)$/);
  if (!m) throw new ApiError("Keine Serien-ID.", 400, false);
  const d = await getJSON<{ episodes: TvEpisode[] }>(`/api/tv/${m[1]}/season/${seasonNumber}`);
  return d.episodes ?? [];
}

// ---- IMDb-Bewertung via OMDb (serverseitiger Proxy + lokaler 24-h-Cache) ----

const OMDB_KEY = "sf:omdb-cache:v1";
const DAY_MS = 24 * 60 * 60 * 1000;

function readOmdbCache(): Record<string, ImdbRating> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(OMDB_KEY) ?? "{}") as Record<string, ImdbRating>;
  } catch {
    return {};
  }
}

export async function apiImdbRating(imdbId: string): Promise<ImdbRating> {
  const cached = readOmdbCache()[imdbId];
  if (cached && Date.now() - new Date(cached.cachedAt).getTime() < DAY_MS) return cached;
  const d = await getJSON<{ rating: number | null; votes: string | null; error?: string }>(
    `/api/omdb?imdbId=${encodeURIComponent(imdbId)}`
  );
  if (typeof d?.rating === "undefined" && d?.error) {
    throw new ApiError(d.error, 0, false);
  }
  const entry: ImdbRating = {
    imdbId,
    rating: typeof d.rating === "number" ? d.rating : null,
    votes: typeof d.votes === "string" ? d.votes : null,
    cachedAt: new Date().toISOString()
  };
  try {
    const all = readOmdbCache();
    all[imdbId] = entry;
    window.localStorage.setItem(OMDB_KEY, JSON.stringify(all));
  } catch {
    // Cache ignorieren
  }
  return entry;
}
