import { NextResponse } from "next/server";
import { hasTmdbKey, tmdbKeyFromRequest, tmdbSeasonEpisodes } from "@/lib/tmdb";

// Echte Episodendaten einer Staffel (TMDb). Schlüssel bleibt serverseitig.
export async function GET(req: Request, { params }: { params: Promise<{ tmdbId: string; n: string }> }) {
  const localKey = tmdbKeyFromRequest(req);
  if (!hasTmdbKey(localKey)) {
    return NextResponse.json(
      { configured: false, error: "TMDb ist nicht konfiguriert (TMDB_API_KEY fehlt)." },
      { status: 503 }
    );
  }
  const p = await params;
  const tmdbId = Number(p.tmdbId);
  const season = Number(p.n);
  if (!Number.isFinite(tmdbId) || tmdbId <= 0 || !Number.isFinite(season) || season < 0) {
    return NextResponse.json({ configured: true, error: "Ungültige Staffelanfrage." }, { status: 400 });
  }
  try {
    const episodes = await tmdbSeasonEpisodes(tmdbId, season, localKey);
    return NextResponse.json({ configured: true, episodes });
  } catch {
    return NextResponse.json({ configured: true, error: "Episoden konnten nicht geladen werden." }, { status: 502 });
  }
}
