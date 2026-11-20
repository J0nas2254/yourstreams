import { apiJson, apiOptions } from "@/lib/api-cors";
import { hasTmdbKey, tmdbKeyFromRequest } from "@/lib/tmdb";

export function OPTIONS() {
  return apiOptions();
}

export async function GET(req: Request) {
  const localTmdb = tmdbKeyFromRequest(req);
  const localOmdb = (req.headers.get("x-omdb-key") ?? "").trim();
  return apiJson({
    configured: hasTmdbKey(localTmdb),
    omdbConfigured: Boolean((process.env.OMDB_API_KEY ?? "").trim() || localOmdb),
    region: "DE"
  });
}
