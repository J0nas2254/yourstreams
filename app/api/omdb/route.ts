import { NextResponse } from "next/server";

// OMDb-Proxy (serverseitig, damit der Schlüssel nie ins Browser-Bundle gelangt).
// Ergebnisse werden pro IMDb-ID höchstens einmal pro Tag neu angefragt.
interface CacheEntry {
  data: { rating: number | null; votes: string | null };
  fetchedAt: number;
}
const cache = new Map<string, CacheEntry>();
const DAY_MS = 24 * 60 * 60 * 1000;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const imdbId = (url.searchParams.get("imdbId") ?? "").trim();
  if (!/^tt\d+$/.test(imdbId)) {
    return NextResponse.json({ error: "Ungültige IMDb-ID." }, { status: 400 });
  }
  const key = (process.env.OMDB_API_KEY ?? "").trim();
  if (!key) {
    return NextResponse.json(
      { configured: false, imdbId, error: "OMDb ist nicht konfiguriert (OMDB_API_KEY fehlt)." },
      { status: 503 }
    );
  }
  const hit = cache.get(imdbId);
  if (hit && Date.now() - hit.fetchedAt < DAY_MS) {
    return NextResponse.json({ configured: true, imdbId, ...hit.data, cached: true });
  }
  try {
    const r = await fetch(
      `https://www.omdbapi.com/?apikey=${encodeURIComponent(key)}&i=${encodeURIComponent(imdbId)}`,
      { next: { revalidate: 86400 } }
    );
    if (!r.ok) throw new Error(`OMDb-Fehler: ${r.status}`);
    const d = await r.json();
    if (d?.Response === "False") {
      const data = { rating: null as number | null, votes: null as string | null };
      cache.set(imdbId, { data, fetchedAt: Date.now() });
      return NextResponse.json({ configured: true, imdbId, ...data, note: d?.Error ?? "Keine Bewertung." });
    }
    const rating = d?.imdbRating && d.imdbRating !== "N/A" ? Number(d.imdbRating) : null;
    const data = {
      rating: typeof rating === "number" && Number.isFinite(rating) ? rating : null,
      votes: typeof d?.imdbVotes === "string" && d.imdbVotes !== "N/A" ? d.imdbVotes : null
    };
    cache.set(imdbId, { data, fetchedAt: Date.now() });
    return NextResponse.json({ configured: true, imdbId, ...data });
  } catch {
    return NextResponse.json({ configured: true, imdbId, error: "IMDb-Bewertung fehlgeschlagen." }, { status: 502 });
  }
}
