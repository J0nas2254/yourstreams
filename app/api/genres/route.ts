import { NextResponse } from "next/server";
import { hasTmdbKey, tmdbGenres, tmdbKeyFromRequest } from "@/lib/tmdb";

export async function GET(req: Request) {
  const localKey = tmdbKeyFromRequest(req);
  if (!hasTmdbKey(localKey)) {
    return NextResponse.json(
      { configured: false, error: "TMDb ist nicht konfiguriert." },
      { status: 503 }
    );
  }
  try {
    const genres = await tmdbGenres(localKey);
    return NextResponse.json({ configured: true, ...genres });
  } catch {
    return NextResponse.json({ configured: true, error: "Genres konnten nicht geladen werden." }, { status: 502 });
  }
}
