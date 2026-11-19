import { NextResponse } from "next/server";
import { hasTmdbKey, tmdbKeyFromRequest, tmdbSearch } from "@/lib/tmdb";

export async function GET(req: Request) {
  const localKey = tmdbKeyFromRequest(req);
  if (!hasTmdbKey(localKey)) {
    return NextResponse.json(
      { configured: false, error: "TMDb ist nicht konfiguriert. Lege TMDB_API_KEY als Server-Variable an (lokal .env.local, gehostet: Einstellungen → Secrets)." },
      { status: 503 }
    );
  }
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim();
  if (!q) return NextResponse.json({ configured: true, results: [] });
  try {
    const results = await tmdbSearch(q, localKey);
    return NextResponse.json({ configured: true, results });
  } catch {
    return NextResponse.json(
      { configured: true, error: "Suche fehlgeschlagen. Bitte später erneut versuchen." },
      { status: 502 }
    );
  }
}
