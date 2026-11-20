import { apiJson, apiOptions } from "@/lib/api-cors";
import { hasTmdbKey, tmdbKeyFromRequest, tmdbTitle } from "@/lib/tmdb";

export function OPTIONS() {
  return apiOptions();
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const localKey = tmdbKeyFromRequest(req);
  if (!hasTmdbKey(localKey)) {
    return apiJson(
      { configured: false, error: "TMDb ist nicht konfiguriert. Lege TMDB_API_KEY als Server-Variable an (lokal .env.local, gehostet: Einstellungen → Secrets)." },
      { status: 503 }
    );
  }
  const id = decodeURIComponent((await params).id);
  const m = id.match(/^tmdb-(movie|tv)-(\d+)$/);
  if (!m) return apiJson({ configured: true, error: "Unbekannte Titel-ID." }, { status: 400 });
  const title = await tmdbTitle(m[1] as "movie" | "tv", Number(m[2]), localKey);
  if (!title) return apiJson({ configured: true, error: "Titel nicht gefunden." }, { status: 404 });
  return apiJson({ configured: true, title });
}
