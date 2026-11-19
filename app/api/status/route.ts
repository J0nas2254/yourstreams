import { NextResponse } from "next/server";
import { hasTmdbKey, tmdbKeyFromRequest } from "@/lib/tmdb";

export async function GET(req: Request) {
  const localTmdb = tmdbKeyFromRequest(req);
  const localOmdb = (req.headers.get("x-omdb-key") ?? "").trim();
  return NextResponse.json({
    configured: hasTmdbKey(localTmdb),
    omdbConfigured: Boolean((process.env.OMDB_API_KEY ?? "").trim() || localOmdb),
    region: "DE"
  });
}
