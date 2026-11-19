import { NextResponse } from "next/server";
import { hasTmdbKey, tmdbDiscoverByProviders, tmdbKeyFromRequest } from "@/lib/tmdb";

// Titel, die bei den übergebenen Haushalts-Anbietern (DE, inklusive-Kategorien) verfügbar sind.
export async function GET(req: Request) {
  const localKey = tmdbKeyFromRequest(req);
  if (!hasTmdbKey(localKey)) {
    return NextResponse.json(
      { configured: false, error: "TMDb ist nicht konfiguriert. Lege TMDB_API_KEY als Server-Variable an (lokal .env.local, gehostet: Einstellungen → Secrets)." },
      { status: 503 }
    );
  }
  const url = new URL(req.url);
  const ids = (url.searchParams.get("providers") ?? "")
    .split(",")
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isFinite(n) && (n > 0 || n === -1))
    .slice(0, 20);
  if (ids.length === 0) return NextResponse.json({ configured: true, results: [] });
  try {
    const results = await tmdbDiscoverByProviders(ids, localKey);
    return NextResponse.json({ configured: true, results });
  } catch {
    return NextResponse.json(
      { configured: true, error: "Empfehlungen konnten nicht geladen werden." },
      { status: 502 }
    );
  }
}
