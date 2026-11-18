import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  STORAGE_KEY,
  defaultPrefs,
  migrateV1toV2,
  isSeen,
  markSeen,
  unmarkSeen,
  toggleEpisodeSeen,
  setSeasonSeen,
  markSeriesSeen,
  unmarkSeries,
  countSeenEpisodes,
  nextUnseenEpisode,
  applySeenFilter,
  feedTitles,
} from "../lib/prefs-core.mjs";

const movie = (id) => ({ id, kind: "movie", title: id });
const series = (id) => ({ id, kind: "tv", title: id });
const eps = [
  { season: 1, episode: 1 },
  { season: 1, episode: 2 },
  { season: 2, episode: 1 },
];

describe("Gesehen-Status", () => {
  it("1. Film als gesehen markieren", () => {
    let p = defaultPrefs();
    p = markSeen(p, "tmdb-movie-1");
    assert.equal(isSeen(p, "tmdb-movie-1"), true);
  });

  it("2. Rückgängig machen", () => {
    let p = markSeen(defaultPrefs(), "tmdb-movie-1");
    p = unmarkSeen(p, "tmdb-movie-1");
    assert.equal(isSeen(p, "tmdb-movie-1"), false);
  });

  it("3. Alle Episoden als gesehen markiert Serie als gesehen", () => {
    const t = series("tmdb-tv-10");
    const keys = ["S1E1", "S1E2", "S2E1"];
    const p = markSeriesSeen(defaultPrefs(), t, keys);
    assert.equal(isSeen(p, t.id), true);
    assert.equal(countSeenEpisodes(p, t.id), 3);
  });

  it("4. Undo bei Serie löscht Episoden + Serienstatus", () => {
    const t = series("tmdb-tv-10");
    let p = markSeriesSeen(defaultPrefs(), t, ["S1E1", "S1E2"]);
    p = unmarkSeries(p, t.id);
    assert.equal(isSeen(p, t.id), false);
    assert.equal(countSeenEpisodes(p, t.id), 0);
  });

  it("5. Einzelne Episode toggeln", () => {
    let p = toggleEpisodeSeen(defaultPrefs(), "tmdb-tv-10", 1, 1);
    assert.deepEqual(p.seenEpisodes["tmdb-tv-10"], ["S1E1"]);
    p = toggleEpisodeSeen(p, "tmdb-tv-10", 1, 1);
    assert.deepEqual(p.seenEpisodes["tmdb-tv-10"], []);
  });

  it("6. Staffel als gesehen / zurücksetzen (andere Staffel bleibt)", () => {
    let p = toggleEpisodeSeen(defaultPrefs(), "tmdb-tv-10", 2, 1);
    p = setSeasonSeen(p, "tmdb-tv-10", 1, ["S1E1", "S1E2"], true);
    assert.equal(countSeenEpisodes(p, "tmdb-tv-10"), 3);
    p = setSeasonSeen(p, "tmdb-tv-10", 1, ["S1E1", "S1E2"], false);
    assert.deepEqual(p.seenEpisodes["tmdb-tv-10"], ["S2E1"]);
  });

  it("7. countSeenEpisodes zählt korrekt", () => {
    let p = defaultPrefs();
    p = toggleEpisodeSeen(p, "tmdb-tv-10", 1, 1);
    p = toggleEpisodeSeen(p, "tmdb-tv-10", 1, 2);
    assert.equal(countSeenEpisodes(p, "tmdb-tv-10"), 2);
  });

  it("8. nextUnseenEpisode zeigt nächste offene Episode", () => {
    let p = toggleEpisodeSeen(defaultPrefs(), "tmdb-tv-10", 1, 1);
    const next = nextUnseenEpisode(p, "tmdb-tv-10", eps);
    assert.equal(next?.key, "S1E2");
    p = markSeriesSeen(p, series("tmdb-tv-10"), ["S1E1", "S1E2", "S2E1"]);
    assert.equal(nextUnseenEpisode(p, "tmdb-tv-10", eps), null);
  });

  it("9. Filter Gesehen / Noch nicht gesehen", () => {
    const titles = [movie("tmdb-movie-1"), movie("tmdb-movie-2")];
    const p = markSeen(defaultPrefs(), "tmdb-movie-1");
    assert.deepEqual(
      applySeenFilter(titles, p, "seen").map((t) => t.id),
      ["tmdb-movie-1"]
    );
    assert.deepEqual(
      applySeenFilter(titles, p, "unseen").map((t) => t.id),
      ["tmdb-movie-2"]
    );
  });

  it("10. Feed blendet gesehene Filme + voll gesehene Serien aus", () => {
    const titles = [movie("tmdb-movie-1"), series("tmdb-tv-10"), series("tmdb-tv-11")];
    let p = markSeen(defaultPrefs(), "tmdb-movie-1");
    p = markSeriesSeen(p, series("tmdb-tv-10"), ["S1E1"]);
    // teilweise gesehene Serie 11: nur Episoden, kein Serien-Gesehen
    p = toggleEpisodeSeen(p, "tmdb-tv-11", 1, 1);
    const feed = feedTitles(titles, p).map((t) => t.id);
    assert.ok(!feed.includes("tmdb-movie-1"));
    assert.ok(!feed.includes("tmdb-tv-10"));
    assert.ok(feed.includes("tmdb-tv-11"));
  });

  it("11. Migration v1→v2 + Speicher-Key sf:prefs:v2", () => {
    assert.equal(STORAGE_KEY, "sf:prefs:v2");
    const m = migrateV1toV2({ household: "Fam", seenIds: ["a"], watchlist: ["b"] });
    assert.equal(m.household, "Fam");
    assert.deepEqual(m.seenIds, ["a"]);
    assert.deepEqual(m.seenEpisodes, {});
  });
});
