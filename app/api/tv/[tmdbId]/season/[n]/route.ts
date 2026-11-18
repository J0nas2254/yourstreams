import { NextResponse } from "next/server";
import { missingKeyResponse, seasonEpisodes, tmdbKey } from "@/lib/tmdb";

export async function GET(
  _req: Request,
  { params }: { params: { tmdbId: string; n: string } }
) {
  if (!tmdbKey()) {
    return NextResponse.json(missingKeyResponse(), { status: 503 });
  }
  const tmdbId = Number(params.tmdbId);
  const season = Number(params.n);
  if (!Number.isFinite(tmdbId) || !Number.isFinite(season)) {
    return NextResponse.json({ error: "Ungültige Parameter" }, { status: 400 });
  }
  try {
    return NextResponse.json(await seasonEpisodes(tmdbId, season));
  } catch (e) {
    const status = (e as Error & { status?: number }).status ?? 500;
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Fehler" },
      { status }
    );
  }
}
