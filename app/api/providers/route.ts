import { NextResponse } from "next/server";
import { hasTmdbKey, tmdbKeyFromRequest, tmdbProvidersDE } from "@/lib/tmdb";

export async function GET(req: Request) {
  const localKey = tmdbKeyFromRequest(req);
  if (!hasTmdbKey(localKey)) {
    return NextResponse.json(
      { configured: false, providers: [], error: "TMDb ist nicht konfiguriert. Lege TMDB_API_KEY als Server-Variable an (lokal .env.local, gehostet: Einstellungen → Secrets)." },
      { status: 503 }
    );
  }
  try {
    const providers = await tmdbProvidersDE(localKey);
    return NextResponse.json({ configured: true, providers });
  } catch {
    return NextResponse.json(
      { configured: true, providers: [], error: "Anbieter konnten nicht geladen werden." },
      { status: 502 }
    );
  }
}
