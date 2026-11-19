import { NextResponse } from "next/server";
import { hasTmdbKey, tmdbKeyFromRequest, tmdbTrending } from "@/lib/tmdb";

export async function GET(req: Request) {
  const localKey = tmdbKeyFromRequest(req);
  if (!hasTmdbKey(localKey)) {
    return NextResponse.json(
      { configured: false, error: "TMDb ist nicht konfiguriert. Lege TMDB_API_KEY als Server-Variable an (lokal .env.local, gehostet: Einstellungen → Secrets)." },
      { status: 503 }
    );
  }
  try {
    const results = await tmdbTrending(localKey);
    return NextResponse.json({ configured: true, results });
  } catch {
    return NextResponse.json(
      { configured: true, error: "Trends konnten nicht geladen werden." },
      { status: 502 }
    );
  }
}
