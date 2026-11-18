import { NextResponse } from "next/server";
import { missingKeyResponse, tmdbKey, trendingTitles } from "@/lib/tmdb";

export async function GET() {
  if (!tmdbKey()) {
    return NextResponse.json(missingKeyResponse(), { status: 503 });
  }
  try {
    return NextResponse.json(await trendingTitles());
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Fehler" },
      { status: 500 }
    );
  }
}
