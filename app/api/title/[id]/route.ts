import { NextResponse } from "next/server";
import { hasTmdbKey, tmdbKeyFromRequest, tmdbTitle } from "@/lib/tmdb";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const localKey = tmdbKeyFromRequest(req);
  if (!hasTmdbKey(localKey)) {
    return NextResponse.json(
      { configured: false, error: "TMDb ist nicht konfiguriert. Lege TMDB_API_KEY als Server-Variable an (lokal .env.local, gehostet: Einstellungen → Secrets)." },
      { status: 503 }
    );
  }
  const id = decodeURIComponent((await params).id);
  const m = id.match(/^tmdb-(movie|tv)-(\d+)$/);
  if (!m) return NextResponse.json({ configured: true, error: "Unbekannte Titel-ID." }, { status: 400 });
  const title = await tmdbTitle(m[1] as "movie" | "tv", Number(m[2]), localKey);
  if (!title) return NextResponse.json({ configured: true, error: "Titel nicht gefunden." }, { status: 404 });
  return NextResponse.json({ configured: true, title });
}
