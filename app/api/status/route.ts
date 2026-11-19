import { NextResponse } from "next/server";
import { hasTmdbKey } from "@/lib/tmdb";

export async function GET() {
  return NextResponse.json({
    configured: hasTmdbKey(),
    omdbConfigured: Boolean((process.env.OMDB_API_KEY ?? "").trim()),
    region: "DE"
  });
}
