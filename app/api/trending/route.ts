import { apiJson, apiOptions } from "@/lib/api-cors";
import { hasTmdbKey, tmdbKeyFromRequest, tmdbTrending } from "@/lib/tmdb";

export function OPTIONS() {
  return apiOptions();
}

export async function GET(req: Request) {
  const localKey = tmdbKeyFromRequest(req);
  if (!hasTmdbKey(localKey)) {
    return apiJson(
      { configured: false, error: "TMDb ist nicht konfiguriert. Lege TMDB_API_KEY als Server-Variable an (lokal .env.local, gehostet: Einstellungen → Secrets)." },
      { status: 503 }
    );
  }
  try {
    const results = await tmdbTrending(localKey);
    return apiJson({ configured: true, results });
  } catch {
    return apiJson(
      { configured: true, error: "Trends konnten nicht geladen werden." },
      { status: 502 }
    );
  }
}
