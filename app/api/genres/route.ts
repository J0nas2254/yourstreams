import { NextResponse } from "next/server";
import { hasTmdbKey, tmdbGenres } from "@/lib/tmdb";

export async function GET() {
  if (!hasTmdbKey()) {
    return NextResponse.json(
      { configured: false, error: "TMDb ist nicht konfiguriert." },
      { status: 503 }
    );
  }
  try {
    const genres = await tmdbGenres();
    return NextResponse.json({ configured: true, ...genres });
  } catch {
    return NextResponse.json({ configured: true, error: "Genres konnten nicht geladen werden." }, { status: 502 });
  }
}
