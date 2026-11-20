import { apiJson, apiOptions } from "@/lib/api-cors";
import { hasTmdbKey, tmdbGenres, tmdbKeyFromRequest } from "@/lib/tmdb";

export function OPTIONS() {
  return apiOptions();
}

export async function GET(req: Request) {
  const localKey = tmdbKeyFromRequest(req);
  if (!hasTmdbKey(localKey)) {
    return apiJson(
      { configured: false, error: "TMDb ist nicht konfiguriert." },
      { status: 503 }
    );
  }
  try {
    const genres = await tmdbGenres(localKey);
    return apiJson({ configured: true, ...genres });
  } catch {
    return apiJson({ configured: true, error: "Genres konnten nicht geladen werden." }, { status: 502 });
  }
}
