import { apiJson, apiOptions } from "@/lib/api-cors";
import { hasTmdbKey, tmdbDiscoverByProviders, tmdbKeyFromRequest } from "@/lib/tmdb";

export function OPTIONS() {
  return apiOptions();
}

// Stöbern ohne Titelsuche: Haushalts-Anbieter (DE, inklusive-Kategorien)
// plus optionale Filter für Art, Genre-ID und Zeitraum.
export async function GET(req: Request) {
  const localKey = tmdbKeyFromRequest(req);
  if (!hasTmdbKey(localKey)) {
    return apiJson(
      { configured: false, error: "TMDb ist nicht konfiguriert. Lege TMDB_API_KEY als Server-Variable an (lokal .env.local, gehostet: Einstellungen → Secrets)." },
      { status: 503 }
    );
  }
  const url = new URL(req.url);
  const ids = (url.searchParams.get("providers") ?? "")
    .split(",")
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isFinite(n) && (n > 0 || n === -1))
    .slice(0, 20);
  const num = (v: string | null) => {
    if (v === null || v === "") return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };
  const mediaRaw = url.searchParams.get("mediaType");
  const mediaType = mediaRaw === "movie" || mediaRaw === "tv" ? mediaRaw : "all";
  const genreId = num(url.searchParams.get("genreId"));
  const yearFrom = num(url.searchParams.get("yearFrom"));
  const yearTo = num(url.searchParams.get("yearTo"));
  try {
    const results = await tmdbDiscoverByProviders(ids, localKey, { genreId, yearFrom, yearTo, mediaType });
    return apiJson({ configured: true, results });
  } catch {
    return apiJson(
      { configured: true, error: "Empfehlungen konnten nicht geladen werden." },
      { status: 502 }
    );
  }
}
