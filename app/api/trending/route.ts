import { NextResponse } from "next/server";
import { hasTmdbKey, tmdbTrending } from "@/lib/tmdb";

export async function GET() {
  if (!hasTmdbKey()) {
    return NextResponse.json(
      { configured: false, error: "TMDb ist nicht konfiguriert. Lege TMDB_API_KEY in .env.local an (siehe README)." },
      { status: 503 }
    );
  }
  try {
    const results = await tmdbTrending();
    return NextResponse.json({ configured: true, results });
  } catch {
    return NextResponse.json(
      { configured: true, error: "Trends konnten nicht geladen werden." },
      { status: 502 }
    );
  }
}
