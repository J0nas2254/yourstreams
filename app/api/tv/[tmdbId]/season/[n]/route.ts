import { NextResponse } from "next/server";
import { hasTmdbKey, tmdbSeasonEpisodes } from "@/lib/tmdb";

// Echte Episodendaten einer Staffel (TMDb). Schlüssel bleibt serverseitig.
export async function GET(req: Request, { params }: { params: { tmdbId: string; n: string } }) {
  if (!hasTmdbKey()) {
    return NextResponse.json(
      { configured: false, error: "TMDb ist nicht konfiguriert (TMDB_API_KEY fehlt)." },
      { status: 503 }
    );
  }
  const tmdbId = Number(params.tmdbId);
  const season = Number(params.n);
  if (!Number.isFinite(tmdbId) || tmdbId <= 0 || !Number.isFinite(season) || season < 0) {
    return NextResponse.json({ configured: true, error: "Ungültige Staffelanfrage." }, { status: 400 });
  }
  try {
    const episodes = await tmdbSeasonEpisodes(tmdbId, season);
    return NextResponse.json({ configured: true, episodes });
  } catch {
    return NextResponse.json({ configured: true, error: "Episoden konnten nicht geladen werden." }, { status: 502 });
  }
}
