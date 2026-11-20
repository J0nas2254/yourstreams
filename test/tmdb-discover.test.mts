import test from "node:test";
import assert from "node:assert/strict";
import { tmdbDiscoverByProviders } from "../lib/tmdb.ts";

type Discovered = Awaited<ReturnType<typeof tmdbDiscoverByProviders>>[number];

function item(id: number, pop: number) {
  return {
    id,
    title: `Titel ${id}`,
    popularity: pop,
    genre_ids: [],
    poster_path: null,
    backdrop_path: null,
    vote_average: 7.5
  };
}

// Stellt 20 Film- + 20 Serien-Treffer pro Discover-Seite bereit.
// IDs enthalten die Seitennummer, damit Seiten 1..3 keine Duplikate liefern.
function installMock() {
  const realFetch = globalThis.fetch;
  const mock = (async (input: unknown) => {
    const u = String(input);
    const ok = (data: unknown) => ({ ok: true as const, json: async () => data });
    if (u.includes("/genre/movie/list") || u.includes("/genre/tv/list")) {
      return ok({ genres: [] });
    }
    if (u.includes("/discover/movie") || u.includes("/discover/tv")) {
      const pg = Number(new URL(u).searchParams.get("page") ?? "1");
      const base = pg * 100000 + (u.includes("/discover/movie") ? 1000 : 2000);
      return ok({ results: Array.from({ length: 20 }, (_, i) => item(base + i, 300 - pg * 10 - i)) });
    }
    if (u.includes("/watch/providers")) {
      return ok({ results: { DE: { link: null, flatrate: [] } } });
    }
    return { ok: false as const, status: 404, json: async () => ({}) };
  }) as unknown as typeof fetch;
  globalThis.fetch = mock;
  return { restore: () => { globalThis.fetch = realFetch; } };
}

test("discover liefert 40 Titel pro Abruf (Film- + Serien-Seite voll, nicht nur 12)", async () => {
  const m = installMock();
  try {
    const r = await tmdbDiscoverByProviders([], "dummy-key", { mediaType: "all", page: 1 });
    assert.equal(r.length, 40);
  } finally {
    m.restore();
  }
});

test("3 Discover-Seiten ergeben bis zu 120 Titel für Top 120", async () => {
  const m = installMock();
  try {
    const map = new Map<string, Discovered>();
    for (const page of [1, 2, 3]) {
      const r = await tmdbDiscoverByProviders([], "dummy-key", { mediaType: "all", page });
      for (const t of r) if (!map.has(t.id)) map.set(t.id, t);
    }
    const list = [...map.values()].slice(0, 120);
    assert.equal(list.length, 120);
    assert.equal(new Set(list.map((t) => t.id)).size, 120);
  } finally {
    m.restore();
  }
});
