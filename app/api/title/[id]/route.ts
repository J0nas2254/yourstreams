import { NextResponse } from "next/server";
import { hasTmdbKey, tmdbTitle } from "@/lib/tmdb";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  if (!hasTmdbKey()) {
    return NextResponse.json(
      { configured: false, error: "TMDb ist nicht konfiguriert. Lege TMDB_API_KEY in .env.local an (siehe README)." },
      { status: 503 }
    );
  }
  const id = decodeURIComponent(params.id);
  const m = id.match(/^tmdb-(movie|tv)-(\d+)$/);
  if (!m) return NextResponse.json({ configured: true, error: "Unbekannte Titel-ID." }, { status: 400 });
  const title = await tmdbTitle(m[1] as "movie" | "tv", Number(m[2]));
  if (!title) return NextResponse.json({ configured: true, error: "Titel nicht gefunden." }, { status: 404 });
  return NextResponse.json({ configured: true, title });
}
