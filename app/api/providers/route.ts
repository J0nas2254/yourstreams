import { NextResponse } from "next/server";
import { hasTmdbKey, tmdbProvidersDE } from "@/lib/tmdb";

export async function GET() {
  if (!hasTmdbKey()) {
    return NextResponse.json(
      { configured: false, providers: [], error: "TMDb ist nicht konfiguriert. Lege TMDB_API_KEY in .env.local an." },
      { status: 503 }
    );
  }
  try {
    const providers = await tmdbProvidersDE();
    return NextResponse.json({ configured: true, providers });
  } catch {
    return NextResponse.json(
      { configured: true, providers: [], error: "Anbieter konnten nicht geladen werden." },
      { status: 502 }
    );
  }
}
