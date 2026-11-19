import test from "node:test";
import assert from "node:assert/strict";
import { isOnMyServices } from "../lib/filter.ts";
import { filterFreeProviders, isKnownFreeProvider } from "../lib/free-tv.ts";
import { applySearchFilters, countSeenEpisodes, genreWeights, migrateLegacy, nextUnseenEpisode, scoreTitles } from "../lib/prefs.ts";
import type { Title } from "../lib/types.ts";

function t(partial: Partial<Title> & { id: string }): Title {
  return {
    mediaType: "movie",
    title: "Titel",
    year: 2020,
    overview: "",
    genres: [],
    availability: [],
    ...partial
  };
}

test("isOnMyServices: nur echte Provider-ID-Übereinstimmung zählt", () => {
  assert.equal(isOnMyServices([8, 119], [8]), true);
  assert.equal(isOnMyServices([8, 119], [337]), false);
  assert.equal(isOnMyServices([8], []), false);
  assert.equal(isOnMyServices([], [8]), false);
});

test("applySearchFilters: onlyMine nutzt echte Provider-IDs", () => {
  const titles = [
    t({ id: "a", availability: [{ provider_id: 8, provider_name: "N", kind: "flatrate" }] }),
    t({ id: "b", availability: [{ provider_id: 337, provider_name: "D", kind: "flatrate" }] })
  ];
  const out = applySearchFilters(titles, { onlyMine: true, services: [8] });
  assert.deepEqual(out.map((x) => x.id), ["a"]);
});

test("applySearchFilters: Typ, Genre, Jahr, Anbieter, inklusive, IMDb", () => {
  const titles = [
    t({
      id: "a",
      mediaType: "tv",
      genres: ["Krimi"],
      year: 2022,
      availability: [{ provider_id: 8, provider_name: "N", kind: "rent" }]
    }),
    t({
      id: "b",
      mediaType: "movie",
      genres: ["Krimi"],
      year: 2024,
      availability: [{ provider_id: 8, provider_name: "N", kind: "flatrate" }]
    })
  ];
  const base = { onlyMine: false, services: [] as number[] };
  assert.deepEqual(applySearchFilters(titles, { ...base, mediaType: "tv" }).map((x) => x.id), ["a"]);
  assert.deepEqual(applySearchFilters(titles, { ...base, genre: "Krimi" }).map((x) => x.id), ["a", "b"]);
  assert.deepEqual(applySearchFilters(titles, { ...base, yearFrom: 2023 }).map((x) => x.id), ["b"]);
  assert.deepEqual(applySearchFilters(titles, { ...base, providerId: 8 }).map((x) => x.id), ["a", "b"]);
  assert.deepEqual(applySearchFilters(titles, { ...base, providerId: 999 }).map((x) => x.id), []);
  assert.deepEqual(applySearchFilters(titles, { ...base, includedOnly: true }).map((x) => x.id), ["b"]);
  const imdb = new Map([["a", 8.1]]);
  assert.deepEqual(
    applySearchFilters(titles, { ...base, minImdb: 8, imdbById: imdb }).map((x) => x.id),
    ["a"]
  );
});

test("scoreTitles: Interessen steuern Genre-Gewichte, gesehene fliegen raus", () => {
  const liked = t({ id: "liked", genres: ["Thriller"] });
  const candA = t({
    id: "a",
    genres: ["Thriller"],
    availability: [{ provider_id: 8, provider_name: "N", kind: "flatrate" }]
  });
  const candB = t({ id: "b", genres: ["Komödie"] });
  const prefs = migrateLegacy({
    services: [8],
    watchlist: [],
    seen: ["b"],
    interests: { liked: "up" },
    notInterested: []
  });
  const scored = scoreTitles([candA, candB, liked], prefs);
  assert.deepEqual(scored.map((s) => s.title.id), ["a", "liked"]);
  assert.ok(scored[0].reasons.some((r) => r.includes("Thriller")));
  assert.ok(scored[0].reasons.some((r) => r.includes("Diensten")));
});

test("scoreTitles: nicht interessiert senkt und blendet aus", () => {
  const cand = t({ id: "a", genres: ["Horror"] });
  const prefs = migrateLegacy({ services: [], watchlist: [], seen: [], interests: {}, notInterested: ["a"] });
  assert.deepEqual(scoreTitles([cand], prefs), []);
});

test("scoreTitles: Merkliste ist schwaches positives Signal", () => {
  const cand = t({ id: "a", genres: [] });
  const prefs = migrateLegacy({ services: [], watchlist: [{ id: "a", addedAt: "x" }], seen: [], interests: {} });
  const [s] = scoreTitles([cand], prefs);
  assert.ok(s.score > 0);
  assert.ok(s.reasons.includes("Auf deiner Merkliste"));
});

test("genreWeights: down-Interesse senkt Genre", () => {
  const disliked = t({ id: "d", genres: ["Horror"] });
  const prefs = migrateLegacy({ services: [], watchlist: [], seen: [], interests: { d: "down" } });
  const w = genreWeights(prefs, [disliked]);
  assert.equal(w.get("Horror"), -2);
});

test("countSeenEpisodes + nextUnseenEpisode: Episodenfortschritt", () => {
  const eps = [
    { id: 101, season_number: 1, episode_number: 1, name: "Pilot" },
    { id: 102, season_number: 1, episode_number: 2, name: "Zwei" },
    { id: 201, season_number: 2, episode_number: 1, name: "Neu" }
  ];
  assert.equal(countSeenEpisodes([101, 102, 201], [101]), 1);
  assert.equal(countSeenEpisodes([101, 102], undefined), 0);
  assert.deepEqual(nextUnseenEpisode(eps, [101]), { season_number: 1, episode_number: 2, name: "Zwei" });
  // Reihenfolge nach Staffel/Episode, nicht nach Eingabereihenfolge
  assert.deepEqual(nextUnseenEpisode([eps[2], eps[1], eps[0]], [101, 102]), { season_number: 2, episode_number: 1, name: "Neu" });
  assert.equal(nextUnseenEpisode(eps, [101, 102, 201]), null);
  assert.deepEqual(nextUnseenEpisode(eps, []), { season_number: 1, episode_number: 1, name: "Pilot" });
});

test("applySearchFilters: Gesehen-Filter", () => {
  const titles = [t({ id: "a" }), t({ id: "b" })];
  const seen = new Set(["a"]);
  const base = { onlyMine: false, services: [] as number[] };
  assert.deepEqual(applySearchFilters(titles, { ...base, seenFilter: "unseen", seenIds: seen }).map((x) => x.id), ["b"]);
  assert.deepEqual(applySearchFilters(titles, { ...base, seenFilter: "seen", seenIds: seen }).map((x) => x.id), ["a"]);
  assert.deepEqual(applySearchFilters(titles, { ...base, seenFilter: "all", seenIds: seen }).map((x) => x.id), ["a", "b"]);
  // Standard ohne Filter: alles sichtbar
  assert.deepEqual(applySearchFilters(titles, base).map((x) => x.id), ["a", "b"]);
});

test("migrateLegacy: übernimmt seenEpisodes und filtert Müll", () => {
  const p = migrateLegacy({ seenEpisodes: { "tmdb-tv-1": [11, "x", 12, 11], leer: [] } });
  assert.deepEqual(p.seenEpisodes, { "tmdb-tv-1": [11, 12] });
});

test("migrateLegacy: überträgt alte Schlüssel und filtert Müll", () => {
  const p = migrateLegacy({ services: [8, "x"], watchlist: [{ id: "a" }], seen: "nix", interests: { a: "up", b: "maybe" } });
  assert.deepEqual(p.services, [8]);
  assert.equal(p.watchlist.length, 1);
  assert.deepEqual(p.seen, []);
  assert.deepEqual(p.interests, { a: "up" });
});

test("free-tv: genaue Liste statt Namensrate, Joyn/RTL+ bleiben sichtbar", () => {
  // Reine Gratis-Anbieter per exakter ID / exaktem Namen
  assert.equal(isKnownFreeProvider("Pluto TV", 300), true);
  assert.equal(isKnownFreeProvider("ARD Mediathek", 99991), true);
  assert.equal(isKnownFreeProvider("ZDF", 99992), true);
  // Bezahl-Varianten bleiben sichtbar
  assert.equal(isKnownFreeProvider("Joyn", 304), false);
  assert.equal(isKnownFreeProvider("Joyn Plus", 421), false);
  assert.equal(isKnownFreeProvider("RTL+", 2750), false);
  // Kein Substring-Raten: fremde Namen mit ähnlichen Teilen bleiben sichtbar
  assert.equal(isKnownFreeProvider("My Joyn Clone", 99999), false);
  assert.equal(isKnownFreeProvider("RTL+ Fan-App", 99999), false);
  assert.equal(isKnownFreeProvider("Sat.1", 99999), false);
  const list = [
    { provider_id: 300, provider_name: "Pluto TV" },
    { provider_id: 304, provider_name: "Joyn" },
    { provider_id: 2750, provider_name: "RTL+" },
    { provider_id: 8, provider_name: "Netflix" }
  ];
  assert.deepEqual(filterFreeProviders(list).map((p) => p.provider_id), [304, 2750, 8]);
});
