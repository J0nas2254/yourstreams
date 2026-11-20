import { apiJson, apiOptions } from "@/lib/api-cors";
import { hasTmdbKey, tmdbKeyFromRequest, tmdbSimilar } from "@/lib/tmdb";

export function OPTIONS() {
  return apiOptions();
}

// Ähnliche Titel zu einem Film/Serie (für „Weil dir X gefällt“-Schienen).
export async function GET(req: Request) {
  const localKey = tmdbKeyFromRequest(req);
  if (!hasTmdbKey(localKey)) {
    return apiJson(
      { configured: false, error: "TMDb ist nicht konfiguriert. Lege TMDB_API_KEY als Server-Variable an (lokal .env.local, gehostet: Einstellungen → Secrets)." },
      { status: 503 }
    );
  }
  const url = new URL(req.url);
  const tmdbId = Number(url.searchParams.get("tmdbId"));
  const mediaRaw = url.searchParams.get("mediaType");
  if (!Number.isFinite(tmdbId) || (mediaRaw !== "movie" && mediaRaw !== "tv")) {
    return apiJson({ configured: true, error: "tmdbId und mediaType (movie|tv) erforderlich." }, { status: 400 });
  }
  try {
    const results = await tmdbSimilar(mediaRaw, tmdbId, localKey);
    return apiJson({ configured: true, results });
  } catch {
    return apiJson(
      { configured: true, error: "Ähnliche Titel konnten nicht geladen werden." },
      { status: 502 }
    );
  }
}
