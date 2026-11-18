import { NextResponse } from "next/server";
import { missingKeyResponse, searchTitles, tmdbKey } from "@/lib/tmdb";

export async function GET(req: Request) {
  if (!tmdbKey()) {
    return NextResponse.json(missingKeyResponse(), { status: 503 });
  }
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") ?? "";
  try {
    const titles = await searchTitles(q);
    return NextResponse.json(titles);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Suche fehlgeschlagen" },
      { status: 500 }
    );
  }
}
