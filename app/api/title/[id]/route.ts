import { NextResponse } from "next/server";
import { missingKeyResponse, titleDetails, tmdbKey } from "@/lib/tmdb";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  if (!tmdbKey()) {
    return NextResponse.json(missingKeyResponse(), { status: 503 });
  }
  const raw = decodeURIComponent(params.id);
  const m = raw.match(/^tmdb-(movie|tv)-(\d+)$/);
  if (!m) {
    return NextResponse.json({ error: "Unbekannte Titel-ID" }, { status: 400 });
  }
  const kind = m[1] as "movie" | "tv";
  const tmdbId = Number(m[2]);
  try {
    return NextResponse.json(await titleDetails(kind, tmdbId));
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Fehler" },
      { status: 500 }
    );
  }
}
