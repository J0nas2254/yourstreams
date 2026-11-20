"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Browser } from "@capacitor/browser";
import type { Genre, Title } from "@/lib/types";
import { ApiError, apiDiscover, apiGenres, apiImdbRating, apiProviders, apiSeasonEpisodes, apiSimilar, apiTitle, apiTrending, isCapacitorAndroid } from "@/lib/api.ts";
import { isOnMyServicesEntries, usePrefs } from "@/lib/store";
import { genreWeights, nextUnseenEpisode } from "@/lib/prefs.ts";
import EpisodeTracker, { useSeriesEpisodes } from "@/components/episode-tracker";
import { posterUrl } from "@/lib/images";
import { AVAILABILITY_LABELS } from "@/lib/types";
import { useTvFocus } from "@/lib/tv-focus";
import ImdbBadge from "@/components/imdb-badge";
import { BUILD_ID } from "@/lib/build";
import TitleActions from "@/components/title-actions";
import { FREE_TV_ID, FREE_TV_LABEL, filterFreeProviders } from "@/lib/free-tv";
import ProviderGroupList from "@/components/provider-group-list";
import "./tv.css";

type View = "entdecken" | "serien" | "filme" | "dienste" | "liste";

function TvIcon({ d }: { d: React.ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden width={26} height={26}>
      {d}
    </svg>
  );
}

const VIEWS: Array<{ id: View; label: string; icon: React.ReactNode }> = [
  { id: "entdecken", label: "Entdecken", icon: <TvIcon d={<><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="3" /></>} /> },
  { id: "serien", label: "Serien", icon: <TvIcon d={<><rect x="2.5" y="5" width="19" height="12" rx="2" /><path strokeLinecap="round" d="M9 21h6" /></>} /> },
  { id: "filme", label: "Filme", icon: <TvIcon d={<><rect x="3" y="5" width="18" height="14" rx="2" /><path strokeLinecap="round" d="M7 5v14M17 5v14M3 10h4M3 14h4M17 10h4M17 14h4" /></>} /> },
  { id: "dienste", label: "Dienste", icon: <TvIcon d={<><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></>} /> },
  { id: "liste", label: "Liste", icon: <TvIcon d={<path strokeLinecap="round" strokeLinejoin="round" d="M6 7h12M6 12h12M6 17h7" />} /> }
];

// Genre-Schnellfilter ohne Texteingabe (z. B. „ich weiß: Actionfilm“).
const GENRE_PRESETS = ["Action", "Abenteuer", "Animation", "Komödie", "Krimi", "Drama", "Fantasy", "Horror", "Romantik", "Science-Fiction", "Thriller", "Western"];

interface Discovery {
  spotlight: Title[];
  reasons: Map<string, string>;
  genreRails: Array<{ heading: string; titles: Title[] }>;
}


// Stellt Rails aus echten Titeln zusammen: Lieblings-Genres zuerst, täglich
// neu rotiert und ohne Wiederholung über die Rails hinweg.
function buildDiscovery(pool: Title[], liked: Set<string>, day: number): Discovery {
  const rotated = (arr: Title[], n: number) =>
    arr.length === 0 ? arr : [...arr.slice(n % arr.length), ...arr.slice(0, n % arr.length)];
  const likedTitles = pool.filter((t) => (t.genres ?? []).some((g) => liked.has(g)));
  const rest = pool.filter((t) => !(t.genres ?? []).some((g) => liked.has(g)));
  const ordered = [...rotated(likedTitles, day), ...rotated(rest, day + 3)];
  const used = new Set<string>();
  const spotlight: Title[] = [];
  const reasons = new Map<string, string>();
  for (const t of ordered) {
    if (used.has(t.id)) continue;
    used.add(t.id);
    const matched = (t.genres ?? []).filter((g) => liked.has(g)).slice(0, 2);
    if (matched.length > 0) reasons.set(t.id, `Weil: ${matched.join(" & ")} – passt zu deinen 👍`);
    spotlight.push(t);
    if (spotlight.length >= 12) break;
  }
  const counts = new Map<string, number>();
  for (const t of pool) {
    if (used.has(t.id)) continue;
    for (const g of t.genres ?? []) counts.set(g, (counts.get(g) ?? 0) + 1);
  }
  const tops = [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([g]) => g).slice(0, 6);
  const genreRails: Array<{ heading: string; titles: Title[] }> = [];
  tops.forEach((g, gi) => {
    const titles = rotated(
      pool.filter((t) => !used.has(t.id) && (t.genres ?? []).includes(g)),
      day + gi * 5
    ).slice(0, 10);
    titles.forEach((t) => used.add(t.id));
    if (titles.length >= 3) genreRails.push({ heading: g, titles });
  });
  return { spotlight, reasons, genreRails };
}

async function openExternal(url: string) {
  try {
    if (isCapacitorAndroid()) {
      await Browser.open({ url });
      return;
    }
  } catch {
    // Fallback unten
  }
  window.open(url, "_blank", "noopener,noreferrer");
}

function initials(title: string) {
  return title.split(/\s+/).slice(0, 2).map((w) => w[0] ?? "").join("").toUpperCase();
}

export default function TvPage() {
  const router = useRouter();
  const [view, setView] = useState<View>("entdecken");
  const [q, setQ] = useState("");
  const [presetGenre, setPresetGenre] = useState<string | null>(null);
  const [trending, setTrending] = useState<Title[]>([]);
  const [household, setHousehold] = useState<Title[]>([]);
  const [results, setResults] = useState<Title[] | null>(null);
  const [resultsLoading, setResultsLoading] = useState(false);
  const [showFilter, setShowFilter] = useState(false);
  const [fYearFrom, setFYearFrom] = useState("");
  const [fYearTo, setFYearTo] = useState("");
  const [fOnlyMine, setFOnlyMine] = useState(false);
  const [fIncluded, setFIncluded] = useState(false);
  const [genreMap, setGenreMap] = useState<Genre[]>([]);
  const [genresMovie, setGenresMovie] = useState<Genre[]>([]);
  const [genresTv, setGenresTv] = useState<Genre[]>([]);
  const [providers, setProviders] = useState<{ provider_id: number; provider_name: string }[]>([]);
  const [status, setStatus] = useState<"loading" | "ok" | "setup" | "error">("loading");
  const [detailId, setDetailId] = useState<string | null>(null);
  const [detail, setDetail] = useState<(Title & { imdbId?: string | null }) | null>(null);
  const { prefs, loaded, services, toggleService, watchlist, toggleWatch, removeWatch, hasWatch, seen, toggleSeen, setInterest, seenEpisodes, toggleEpisodeSeen, setSeasonSeen, markSeriesSeen, unmarkSeries } = usePrefs();
  const [continueWatching, setContinueWatching] = useState<Array<{ title: Title; label: string }>>([]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([apiTrending(), apiProviders(), apiGenres().catch(() => ({ movie: [], tv: [] }))])
      .then(([t, p, g]) => {
        if (cancelled) return;
        setTrending(t);
        setProviders(p);
        const merged = new Map<string, Genre>();
        for (const x of [...g.movie, ...g.tv]) if (!merged.has(x.name)) merged.set(x.name, x);
        setGenreMap([...merged.values()]);
        setGenresMovie(g.movie);
        setGenresTv(g.tv);
        setStatus("ok");
      })
      .catch((e) => {
        if (!cancelled) setStatus(e instanceof ApiError && e.notConfigured ? "setup" : "error");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!loaded || services.length === 0 || status !== "ok") {
      setHousehold([]);
      return;
    }
    let cancelled = false;
    apiDiscover(services)
      .then((r) => {
        if (!cancelled) setHousehold(r);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [loaded, services, status]);

  useEffect(() => {
    if (!detailId) {
      setDetail(null);
      return;
    }
    let cancelled = false;
    const known = [...trending, ...household, ...(results ?? [])].find((t) => t.id === detailId);
    if (known && known.imdbId !== undefined && (known as Title & { imdbId?: string | null }).imdbId) {
      setDetail(known as Title & { imdbId?: string | null });
      return;
    }
    apiTitle(detailId)
      .then((t) => {
        if (!cancelled) setDetail(t);
      })
      .catch(() => {
        if (!cancelled) setDetail(known ?? null);
      });
    return () => {
      cancelled = true;
    };
  }, [detailId, trending, household, results]);

  // IMDb-Bewertungen für sichtbare Karten nachladen (gecacht)
  const [imdbMap, setImdbMap] = useState<Map<string, number | null>>(new Map());
  useEffect(() => {
    let cancelled = false;
    async function load() {
      const withId = trending.filter((t) => t.imdbId);
      const entries = await Promise.all(
        withId.slice(0, 12).map(async (t) => {
          try {
            const r = await apiImdbRating(t.imdbId as string);
            return [t.id, r.rating] as [string, number | null];
          } catch {
            return [t.id, null] as [string, number | null];
          }
        })
      );
      if (!cancelled) setImdbMap(new Map(entries));
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [trending]);

  const closeDetail = useCallback(() => setDetailId(null), []);
  useTvFocus(true, () => {
    if (detailId) closeDetail();
  });

  // Beim Start direkt das erste bedienbare Element fokussieren,
  // damit die Fernbedienung sofort funktioniert.
  useEffect(() => {
    if (status !== "ok" || detailId) return;
    const t = window.setTimeout(() => {
      const first = document.querySelector<HTMLElement>(".tv-main [data-tv], .tv-shell [data-tv]");
      first?.focus({ preventScroll: true });
    }, 150);
    return () => window.clearTimeout(t);
  }, [status, detailId, view]);

  // Wenn die Film-Info aufgeht, Fokus in den Dialog holen.
  // Zusammen mit der Fokus-Falle in lib/tv-focus.ts bewegt sich
  // dadurch nichts mehr im Hintergrund mit.
  useEffect(() => {
    if (!detailId || !detail) return;
    const t = window.setTimeout(() => {
      document
        .querySelector<HTMLElement>('[role="dialog"] [data-tv]')
        ?.focus({ preventScroll: true });
    }, 80);
    return () => window.clearTimeout(t);
  }, [detailId, detail]);

  const tvIsSeries = detail?.mediaType === "tv";
  const tvSeasons = tvIsSeries ? detail?.tvInfo?.seasons ?? [] : [];
  const tvSeries = useSeriesEpisodes(detailId ?? "", tvIsSeries ? detail?.tmdbId : undefined, tvSeasons);
  const tvSeenEpIds = detailId ? seenEpisodes[detailId] ?? [] : [];
  const tvFullySeen = detailId ? seen.includes(detailId) : false;

  async function tvToggleSeen() {
    if (!detail || !detailId) return;
    if (tvFullySeen) {
      if (tvIsSeries) unmarkSeries(detailId);
      else toggleSeen(detailId);
      return;
    }
    if (tvIsSeries) {
      const all = await tvSeries.loadAll();
      markSeriesSeen(detailId, all.map((e) => e.id));
    } else {
      toggleSeen(detailId);
    }
  }

  // „Weiterschauen“: lokal gespeicherter Episodenstand – kein Abgleich mit Anbietern.
  useEffect(() => {
    if (!loaded || status !== "ok") return;
    let cancelled = false;
    async function load() {
      const started = Object.keys(seenEpisodes).filter((sid) => sid.startsWith("tmdb-tv-") && !seen.includes(sid)).slice(0, 6);
      const out: Array<{ title: Title; label: string }> = [];
      for (const sid of started) {
        try {
          const t = await apiTitle(sid);
          if (cancelled) return;
          const ids = seenEpisodes[sid] ?? [];
          let found = null;
          for (const s of (t.tvInfo?.seasons ?? []).filter((x) => x.season_number > 0)) {
            const eps = await apiSeasonEpisodes(sid, s.season_number);
            if (cancelled) return;
            found = nextUnseenEpisode(eps, ids);
            if (found) break;
          }
          if (found) out.push({ title: t, label: `Weiter: S${found.season_number} E${found.episode_number}` });
        } catch {
          // überspringen
        }
      }
      if (!cancelled) setContinueWatching(out);
    }
    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, status, JSON.stringify(Object.keys(seenEpisodes).sort()), seen.join(",")]);

  async function runSearch(query: string) {
    const trimmed = query.trim();
    setPresetGenre(null);
    if (!trimmed) {
      setResults(null);
      return;
    }
    const { apiSearch } = await import("@/lib/api.ts");
    try {
      const r = await apiSearch(trimmed);
      setResults(r);
    } catch {
      setResults([]);
    }
  }

  const pool = useMemo(() => {
    const map = new Map<string, Title>();
    for (const t of [...trending, ...household, ...(results ?? [])]) map.set(t.id, t);
    return [...map.values()];
  }, [trending, household, results]);

  const onMine = useCallback(
    (t: Title) => isOnMyServicesEntries(t.availability, services),
    [services]
  );

  const unseen = useMemo(
    () => pool.filter((t) => !seen.includes(t.id) && !prefs.notInterested.includes(t.id)),
    [pool, seen, prefs.notInterested]
  );

  const likedGenres = useMemo(() => {
    const w = loaded && status === "ok" ? genreWeights(prefs, pool) : new Map<string, number>();
    return new Set([...w.entries()].filter(([, v]) => v > 0).map(([g]) => g));
  }, [loaded, status, prefs, pool]);

  // Gelikte Titel (neueste zuerst), je Ansicht gefiltert – Algorithmus-Input.
  const likedForView = useMemo(() => {
    const ups = Object.entries(prefs.interests ?? {}).filter(([, d]) => d === "up");
    const scoped =
      view === "serien"
        ? ups.filter(([id]) => id.startsWith("tmdb-tv-"))
        : view === "filme"
          ? ups.filter(([id]) => id.startsWith("tmdb-movie-"))
          : ups;
    return scoped
      .slice(-3)
      .reverse()
      .map(([id]) => {
        const m = id.match(/^tmdb-(movie|tv)-(\d+)$/);
        if (!m) return null;
        return {
          key: id,
          media: m[1] as "movie" | "tv",
          num: Number(m[2]),
          name: pool.find((t) => t.id === id)?.title ?? null
        };
      })
      .filter((x): x is { key: string; media: "movie" | "tv"; num: number; name: string | null } => x !== null);
  }, [prefs.interests, view, pool]);

  // Genre-Schienen nach deinen 👍 sortieren: Lieblingsgenres zuerst.
  const genreWeightOf = useCallback(
    (name: string) => {
      if (!loaded || status !== "ok") return 0;
      return genreWeights(prefs, pool).get(name) ?? 0;
    },
    [loaded, status, prefs, pool]
  );

  // Tagesversatz: mischt die Reihenfolge jeden Tag neu, damit nicht immer
  // dieselben Titel oben stehen. Echte Daten, nur anders rotiert.
  const dayOffset = useMemo(() => {
    const now = new Date();
    const start = Date.UTC(now.getFullYear(), 0, 0);
    const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
    return Math.floor((today - start) / 864e5);
  }, []);

  const entdecken = useMemo(
    () => (loaded && status === "ok" ? buildDiscovery(unseen, likedGenres, dayOffset) : null),
    [loaded, status, unseen, likedGenres, dayOffset]
  );
  const serien = useMemo(
    () =>
      loaded && status === "ok"
        ? buildDiscovery(
            unseen.filter((t) => t.mediaType === "tv"),
            likedGenres,
            dayOffset + 1
          )
        : null,
    [loaded, status, unseen, likedGenres, dayOffset]
  );
  const filme = useMemo(
    () =>
      loaded && status === "ok"
        ? buildDiscovery(
            unseen.filter((t) => t.mediaType === "movie"),
            likedGenres,
            dayOffset + 2
          )
        : null,
    [loaded, status, unseen, likedGenres, dayOffset]
  );
  const freshTrending = useMemo(() => trending.filter((t) => !seen.includes(t.id)), [trending, seen]);
  // Auch bei Textsuche gelten Jahr/Dienste/Inklusive aus dem Filter-Panel.
  const filteredResults = useMemo(() => {
    if (results === null) return null;
    const yf = fYearFrom ? Number(fYearFrom) : null;
    const yt = fYearTo ? Number(fYearTo) : null;
    return results.filter((t) => {
      if (view === "serien" && t.mediaType !== "tv") return false;
      if (view === "filme" && t.mediaType !== "movie") return false;
      if (yf !== null && (t.year ?? 0) < yf) return false;
      if (yt !== null && (t.year ?? 9999) > yt) return false;
      if (fOnlyMine && !isOnMyServicesEntries(t.availability, services)) return false;
      if (fIncluded && !t.availability.some((a) => a.kind === "flatrate" || a.kind === "free" || a.kind === "ads")) return false;
      return true;
    });
  }, [results, view, fYearFrom, fYearTo, fOnlyMine, fIncluded, services]);

  function surprise() {
    const mine = household.filter(onMine);
    const candidates = (mine.length > 0 ? mine : pool).filter((t) => !seen.includes(t.id));
    if (candidates.length === 0) return;
    setDetailId(candidates[Math.floor(Math.random() * candidates.length)].id);
  }

  // Genre-ID passend zur Ansicht wählen (TV-Genres haben eigene IDs).
  function genreIdFor(name: string, want: "movie" | "tv" | "all"): number | null {
    const primary = want === "tv" ? genresTv : want === "movie" ? genresMovie : genreMap;
    return (
      primary.find((x) => x.name === name)?.id ??
      genreMap.find((x) => x.name === name)?.id ??
      null
    );
  }

  // Stöbern mit ALLEN Filterkriterien: Genre + Jahr + Dienste + Inklusive.
  // Lädt automatisch die besten bis zu 220 Treffer (3er-Blöcke parallel, bis Seite 11).
  async function runBrowse(genre: string | null, wantView?: View) {
    const want = wantView ?? view;
    const wantMedia = want === "serien" ? "tv" : want === "filme" ? "movie" : "all";
    setResultsLoading(true);
    try {
      const gid = genre ? genreIdFor(genre, wantMedia) : null;
      const map = new Map<string, Title>();
      const provs = fOnlyMine ? services : [];
      for (let from = 1; from <= 11; from += 3) {
        const pages = [from, from + 1, from + 2].filter((p) => p <= 11);
        const batches = await Promise.all(
          pages.map((page) =>
            apiDiscover(provs, {
              genreId: gid,
              yearFrom: fYearFrom ? Number(fYearFrom) : null,
              yearTo: fYearTo ? Number(fYearTo) : null,
              mediaType: wantMedia,
              page
            }).then(
              (r) => r,
              () => [] as Title[]
            )
          )
        );
        let empty = false;
        for (const r of batches) {
          if (r.length === 0) empty = true;
          for (const t of r) if (!map.has(t.id)) map.set(t.id, t);
          if (map.size >= 220) break;
        }
        if (map.size >= 220 || empty) break;
      }
      let list = [...map.values()].slice(0, 220);
      if (fIncluded) {
        list = list.filter((t) => t.availability.some((a) => a.kind === "flatrate" || a.kind === "free" || a.kind === "ads"));
      }
      setResults(list);
    } catch {
      setResults([]);
    } finally {
      setResultsLoading(false);
    }
  }

  // Filter ohne Texteingabe: Genre-Chip + Jahr + Dienste → Discover.
  function runTvFilter() {
    void runBrowse(presetGenre);
  }

  function Card({ t, reason, wide }: { t: Title; reason?: string; wide?: boolean }) {
    const src = posterUrl(t.posterPath, "w342");
    return (
      <button
        data-tv
        type="button"
        onClick={() => setDetailId(t.id)}
        aria-label={`${t.title} – Details ansehen`}
        className={`tv-focusable tv-card text-left ${wide ? "w-full" : "w-36 shrink-0 snap-start md:w-44"}`}
      >
        <div className="relative aspect-[2/3] w-full bg-neutral-800">
          {src ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={src} alt="" aria-hidden loading="lazy" className="h-full w-full object-cover" />
          ) : (
            <div aria-hidden className="flex h-full items-center justify-center text-2xl font-black text-neutral-500">
              {initials(t.title)}
            </div>
          )}
          {onMine(t) && (
            <span className="absolute left-2 top-2 rounded-full bg-white px-2.5 py-0.5 text-xs font-bold text-black">
              Deine Dienste
            </span>
          )}
          {seen.includes(t.id) && (
            <span className="absolute bottom-2 left-2 rounded-full bg-black/80 px-2.5 py-0.5 text-xs font-bold text-white">
              ✓ Gesehen
            </span>
          )}
        </div>
        <div className="p-3">
          <p className="tv-card-title truncate font-bold text-white">{t.title}</p>
          <p className="tv-card-meta text-neutral-400">
            {t.year ?? "?"} · {t.mediaType === "tv" ? "Serie" : "Film"}
            {typeof imdbMap.get(t.id) === "number" ? ` · ★ ${(imdbMap.get(t.id) as number).toFixed(1)}` : ""}
          </p>
          {reason && <p className="mt-1 text-sm text-neutral-300">{reason}</p>}
        </div>
      </button>
    );
  }

  // App-Stil: Überschrift + „Top 220“-Button lädt die besten Titel des Genres
  // per Discover-Seiten (bis zu 220) und zeigt sie im Raster.
  function Row({
    heading,
    titles,
    reasons,
    genreId,
    media,
    topLabel,
    onTop,
  }: {
    heading: string;
    titles: Title[];
    reasons?: Map<string, string>;
    genreId?: number | null;
    media?: "movie" | "tv" | "all";
    topLabel?: string;
    onTop?: () => void;
  }) {
    const [open, setOpen] = useState(false);
    const [all, setAll] = useState<Title[] | null>(null);
    const [loadingMore, setLoadingMore] = useState(false);
    if (titles.length === 0) return null;
    const canExpand = titles.length > 10 || genreId != null || onTop != null;
    async function toggle() {
      if (open) {
        setOpen(false);
        return;
      }
      setOpen(true);
      if (genreId == null || all || loadingMore) return;
      setLoadingMore(true);
      try {
        const map = new Map<string, Title>();
        for (const t of titles) map.set(t.id, t);
        for (let from = 1; from <= 11; from += 3) {
          const pages = [from, from + 1, from + 2].filter((p) => p <= 11);
          const batches = await Promise.all(
            pages.map((page) =>
              apiDiscover([], { genreId, mediaType: media ?? "all", page }).then(
                (r) => r,
                () => [] as Title[]
              )
            )
          );
          let empty = false;
          for (const r of batches) {
            if (r.length === 0) empty = true;
            for (const t of r) if (!map.has(t.id)) map.set(t.id, t);
            if (map.size >= 220) break;
          }
          if (map.size >= 220 || empty) break;
        }
        setAll([...map.values()].slice(0, 220));
      } finally {
        setLoadingMore(false);
      }
    }
    const grid = (open ? (all ?? titles) : titles).slice(0, 220);
    return (
      <section aria-label={heading} className="mt-8">
        <div className="tv-row-head">
          <h2 className="tv-row-title">{heading}</h2>
          {canExpand &&
            (onTop ? (
              <button data-tv type="button" onClick={onTop} className="tv-focusable tv-more-btn">
                {topLabel ?? "Top 220 ansehen"}
              </button>
            ) : (
              <button data-tv type="button" onClick={() => void toggle()} aria-expanded={open} className="tv-focusable tv-more-btn">
                {open ? "Weniger" : genreId != null ? "Top 220" : `Mehr (${titles.length})`}
              </button>
            ))}
        </div>
        {loadingMore && open && (
          <p className="mt-2 text-base text-slate-300" aria-live="polite">Lade Top 220 …</p>
        )}
        {open ? (
          <div className="tv-grid-all">
            {grid.map((t) => (
              <Card key={t.id} t={t} reason={reasons?.get(t.id)} wide />
            ))}
          </div>
        ) : (
          <div className="tv-row no-scrollbar">
            {titles.slice(0, 20).map((t) => (
              <Card key={t.id} t={t} reason={reasons?.get(t.id)} />
            ))}
          </div>
        )}
      </section>
    );
  }

  // Netflix-Stil: eine Schiene pro Genre, jede mit echten Discover-Daten.
  // Vorschaureihe lädt sofort, „Top 220“ lädt bis zu 220 Titel des Genres.
  function GenreRow({ name, genreId, media }: { name: string; genreId: number | null; media: "movie" | "tv" | "all" }) {
    const [preview, setPreview] = useState<Title[] | null>(null);
    // Lazy: erst laden, wenn die Schiene in Srollnähe kommt – spart
    // Anfragen beim Start (8 Schienen × 2 Seiten würden sofort feuern).
    const rowRef = useRef<HTMLElement | null>(null);
    const [visible, setVisible] = useState(false);
    useEffect(() => {
      const el = rowRef.current;
      if (!el || typeof IntersectionObserver === "undefined") {
        setVisible(true);
        return;
      }
      const obs = new IntersectionObserver(
        (entries) => {
          if (entries.some((e) => e.isIntersecting)) {
            setVisible(true);
            obs.disconnect();
          }
        },
        { rootMargin: "600px 0px" }
      );
      obs.observe(el);
      return () => obs.disconnect();
    }, []);
    useEffect(() => {
      if (!visible) return;
      let cancelled = false;
      async function load() {
        if (genreId == null) {
          if (!cancelled) setPreview([]);
          return;
        }
        try {
          const map = new Map<string, Title>();
          for (let page = 1; page <= 2; page += 1) {
            const r = await apiDiscover([], { genreId, mediaType: media, page });
            if (r.length === 0) break;
            for (const t of r) if (!map.has(t.id)) map.set(t.id, t);
          }
          if (!cancelled) setPreview([...map.values()]);
        } catch {
          if (!cancelled) setPreview([]);
        }
      }
      void load();
      return () => {
        cancelled = true;
      };
    }, [genreId, media, visible]);
    if (preview === null) {
      return (
        <section aria-label={name} className="mt-8" ref={rowRef as React.RefObject<HTMLElement>}>
          <h2 className="tv-row-title">{name}</h2>
          <p className="mt-2 text-sm text-slate-400" aria-live="polite">Lädt …</p>
        </section>
      );
    }
    if (preview.length === 0) return null;
    return (
      <section aria-label={name} className="mt-8" ref={rowRef as React.RefObject<HTMLElement>}>
        <div className="tv-row-head">
          <h2 className="tv-row-title">{name}</h2>
          <button
            data-tv
            type="button"
            onClick={() =>
              router.push(`/tv/top?${new URLSearchParams({ genre: name, media }).toString()}`)
            }
            className="tv-focusable tv-more-btn"
          >
            Top 220
          </button>
        </div>
        <div className="tv-row no-scrollbar">
          {preview.slice(0, 20).map((t) => (
            <Card key={t.id} t={t} />
          ))}
        </div>
      </section>
    );
  }

  // „Weil dir X gefällt“-Schiene: echte TMDb-Ähnlichkeiten zu deinen 👍.
  // Gesehene und 👎-Titel fliegen raus; Name wird bei Bedarf nachgeladen.
  function SimilarRail({
    idNum,
    media,
    name,
    titleId
  }: {
    idNum: number;
    media: "movie" | "tv";
    name: string | null;
    titleId: string;
  }) {
    const [titles, setTitles] = useState<Title[] | null>(null);
    const [label, setLabel] = useState(name);
    const rowRef = useRef<HTMLElement | null>(null);
    const [visible, setVisible] = useState(false);
    useEffect(() => {
      const el = rowRef.current;
      if (!el || typeof IntersectionObserver === "undefined") {
        setVisible(true);
        return;
      }
      const obs = new IntersectionObserver(
        (entries) => {
          if (entries.some((e) => e.isIntersecting)) {
            setVisible(true);
            obs.disconnect();
          }
        },
        { rootMargin: "600px 0px" }
      );
      obs.observe(el);
      return () => obs.disconnect();
    }, []);
    useEffect(() => {
      if (!visible) return;
      let cancelled = false;
      (async () => {
        try {
          if (!label) {
            try {
              const t = await apiTitle(titleId);
              if (!cancelled && t) setLabel(t.title);
            } catch {
              // ohne Namen weiter
            }
          }
          const r = await apiSimilar(idNum, media);
          if (cancelled) return;
          const downs = new Set(
            Object.entries(prefs.interests ?? {})
              .filter(([, d]) => d === "down")
              .map(([k]) => k)
          );
          setTitles(
            r.filter((t) => t.id !== titleId && !seen.includes(t.id) && !downs.has(t.id))
          );
        } catch {
          if (!cancelled) setTitles([]);
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [visible, idNum, media, titleId]);
    return (
      <section aria-label="Persönliche Empfehlung" ref={rowRef as React.RefObject<HTMLElement>}>
        {titles === null ? (
          <p className="mt-8 text-sm text-slate-400" aria-live="polite">Persönliche Empfehlung lädt …</p>
        ) : titles.length === 0 ? null : (
          <Row heading={`Weil dir ${label ?? "dieser Titel"} gefällt`} titles={titles} />
        )}
      </section>
    );
  }

  if (status === "setup") {
    return (
      <div className="tv-root text-white">
        <h1 className="text-4xl font-black">StreamFinder</h1>
        <div className="mt-6 max-w-2xl rounded-3xl border border-white/10 bg-neutral-900 p-8" role="alert">
          <h2 className="text-2xl font-bold">API-Schlüssel fehlt</h2>
          <p className="mt-2 text-xl text-slate-300">
            Ohne TMDb-Schlüssel zeigt die App keine Titel – es werden keine Beispieldaten angezeigt. Lege
            TMDB_API_KEY als Server-Variable an (lokal .env.local, gehostet: Einstellungen → Secrets; Anleitung in
            der README) oder konfiguriere für die APK ein HTTPS-Backend (NEXT_PUBLIC_API_BASE).
          </p>
        </div>
      </div>
    );
  }
  if (status === "error") {
    return (
      <div className="tv-root text-white" role="alert">
        <h1 className="text-4xl font-black">StreamFinder</h1>
        <p className="mt-6 text-2xl">Feed derzeit nicht verfügbar. Prüfe die Internetverbindung.</p>
      </div>
    );
  }

  const saved = pool.filter((t) => watchlist.some((w) => w.id === t.id));

  const viewTitle: Record<View, string> = {
    entdecken: "Entdecken",
    serien: "Serien",
    filme: "Filme",
    dienste: "Meine Dienste",
    liste: "Meine Liste"
  };

  return (
    <div className="tv-shell">
      <nav aria-label="Bereiche" className="tv-rail">
        <div aria-hidden className="tv-rail-logo"><span className="tv-rail-logo-mark">S</span><span>StreamFinder</span></div>
        {VIEWS.map((v) => (
          <button
            key={v.id}
            data-tv
            type="button"
            onClick={() => {
              setView(v.id);
              setDetailId(null);
              setResults(null);
              setPresetGenre(null);
            }}
            aria-current={view === v.id ? "page" : undefined}
            aria-label={v.label}
            title={v.label}
            className={`tv-focusable tv-rail-item ${view === v.id ? "is-active" : ""}`}
          >
            <span aria-hidden className="tv-rail-icon">{v.icon}</span>
            <span className="tv-rail-label">
              {v.label}
              {v.id === "liste" && watchlist.length > 0 ? ` (${watchlist.length})` : ""}
            </span>
          </button>
        ))}
      </nav>

      <div className="tv-main">
        <header className="mb-2">
          <p className="tv-eyebrow">StreamFinder · DE</p>
          <h1 className="font-black tracking-tight">{viewTitle[view]}</h1>
          <p className="tv-hint mt-1">
            Hoch / Runter: Zeilen wechseln · Links / Rechts: Titel wählen · OK: Details · Zurück: schließen.
          </p>
        </header>

      {(view === "entdecken" || view === "serien" || view === "filme") && (
        <>
          <form
            role="search"
            className="mt-4 flex flex-wrap gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              runSearch(q);
            }}
          >
            <label htmlFor="tv-suche" className="sr-only">Titel suchen (optional)</label>
            <input
              id="tv-suche"
              data-tv
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Titel suchen – oder leer lassen und Genre wählen …"
              className="tv-focusable tv-input w-full min-w-0 max-w-2xl flex-1 bg-white text-black"
            />
            <button data-tv type="submit" className="tv-focusable tv-btn bg-white text-black">
              Suchen
            </button>
            <button
              data-tv
              type="button"
              onClick={surprise}
              disabled={pool.length === 0}
              className="tv-focusable tv-btn bg-neutral-800 text-white disabled:opacity-40"
            >
              Überrasch mich
            </button>
          </form>
          <div className="mt-3 flex flex-wrap gap-2" aria-label="Genre-Schnellfilter ohne Texteingabe">
            {GENRE_PRESETS.map((g) => (
              <button
                key={g}
                data-tv
                type="button"
                aria-pressed={presetGenre === g}
                onClick={() => {
                  const next = presetGenre === g ? null : g;
                  setPresetGenre(next);
                  if (!next) {
                    setResults(null);
                    return;
                  }
                  // Genre-Chip nutzt dieselben Filterkriterien (Jahr/Dienste/Inklusive).
                  void runBrowse(next);
                }}
                className={`tv-focusable tv-chip${presetGenre === g ? " is-on" : ""}`}
              >
                {g}
              </button>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              data-tv
              type="button"
              onClick={() => setShowFilter((v) => !v)}
              aria-expanded={showFilter}
              className={`tv-focusable tv-chip${showFilter ? " is-on" : ""}`}
            >
              ⏷ Filter{(fYearFrom || fYearTo || fOnlyMine || fIncluded) ? " ●" : ""}
            </button>
            {(presetGenre || fYearFrom || fYearTo || fOnlyMine || fIncluded) && (
              <button
                data-tv
                type="button"
                onClick={() => {
                  setPresetGenre(null);
                  setFYearFrom("");
                  setFYearTo("");
                  setFOnlyMine(false);
                  setFIncluded(false);
                  setResults(null);
                }}
                className="tv-focusable tv-chip"
              >
                Zurücksetzen
              </button>
            )}
          </div>
          {showFilter && (
            <div className="tv-filter-panel">
              <label className="tv-filter-field">
                <span>Jahr von</span>
                <input
                  data-tv
                  value={fYearFrom}
                  onChange={(e) => setFYearFrom(e.target.value)}
                  inputMode="numeric"
                  placeholder="z. B. 2015"
                  className="tv-focusable tv-input"
                />
              </label>
              <label className="tv-filter-field">
                <span>Jahr bis</span>
                <input
                  data-tv
                  value={fYearTo}
                  onChange={(e) => setFYearTo(e.target.value)}
                  inputMode="numeric"
                  placeholder="z. B. 2024"
                  className="tv-focusable tv-input"
                />
              </label>
              <button
                data-tv
                type="button"
                onClick={() => setFOnlyMine((v) => !v)}
                aria-pressed={fOnlyMine}
                className={`tv-focusable tv-chip${fOnlyMine ? " is-on" : ""}`}
              >
                {fOnlyMine ? "✓ " : ""}Auf meinen Diensten
              </button>
              <button
                data-tv
                type="button"
                onClick={() => setFIncluded((v) => !v)}
                aria-pressed={fIncluded}
                className={`tv-focusable tv-chip${fIncluded ? " is-on" : ""}`}
              >
                {fIncluded ? "✓ " : ""}Nur inklusive
              </button>
              <button
                data-tv
                type="button"
                onClick={() => void runTvFilter()}
                className="tv-focusable tv-btn bg-white text-black"
              >
                Filtern – ohne Text
              </button>
            </div>
          )}
          {resultsLoading ? (
            <p className="mt-6 text-lg text-slate-300" aria-live="polite">Genre wird geladen …</p>
          ) : filteredResults !== null ? (
            filteredResults.length === 0 ? (
              <p className="mt-6 text-base text-slate-300">Keine Ergebnisse – passe Filter an (z. B. Zeitraum weiter fassen oder Genre wechseln).</p>
            ) : (
              <Row
                heading={`Top ${filteredResults.length}${presetGenre ? ` · ${presetGenre}` : ""}`}
                titles={filteredResults}
                topLabel="Top 220 ansehen"
                onTop={() => {
                  const q = new URLSearchParams({
                    media: view === "serien" ? "tv" : view === "filme" ? "movie" : "all"
                  });
                  if (presetGenre) q.set("genre", presetGenre);
                  if (fYearFrom) q.set("yearFrom", fYearFrom);
                  if (fYearTo) q.set("yearTo", fYearTo);
                  if (fOnlyMine) q.set("onlyMine", "1");
                  if (fIncluded) q.set("included", "1");
                  router.push(`/tv/top?${q.toString()}`);
                }}
              />
            )
          ) : view === "entdecken" ? (
            <>
              {continueWatching.length > 0 && (
                <Row
                  heading="Weiterschauen"
                  titles={continueWatching.map((c) => c.title)}
                  reasons={new Map(continueWatching.map((c) => [c.title.id, `${c.label} (lokal gespeichert)`] as [string, string]))}
                />
              )}
              {services.length > 0 && (
                <Row heading="Für meinen Haushalt" titles={household.filter(onMine)} />
              )}
              {entdecken && entdecken.spotlight.length > 0 && (
                <Row heading="Neu für dich – gemischt" titles={entdecken.spotlight} reasons={entdecken.reasons} />
              )}
              {likedForView.map((l) => (
                <SimilarRail key={l.key} idNum={l.num} media={l.media} name={l.name} titleId={l.key} />
              ))}
              {[...GENRE_PRESETS]
                .sort((a, b) => genreWeightOf(b) - genreWeightOf(a))
                .slice(0, 8)
                .map((g) => (
                  <GenreRow key={g} name={g} genreId={genreMap.find((x) => x.name === g)?.id ?? null} media="all" />
                ))}
              <Row heading="Im Trend" titles={freshTrending} />
            </>
          ) : view === "serien" ? (
            <>
              {serien && serien.spotlight.length > 0 && (
                <Row heading="Serien für dich" titles={serien.spotlight} reasons={serien.reasons} />
              )}
              {likedForView.map((l) => (
                <SimilarRail key={l.key} idNum={l.num} media={l.media} name={l.name} titleId={l.key} />
              ))}
              {[...genresTv]
                .sort((a, b) => genreWeightOf(b.name) - genreWeightOf(a.name))
                .slice(0, 8)
                .map((g) => (
                  <GenreRow key={g.id} name={g.name} genreId={g.id} media="tv" />
                ))}
            </>
          ) : (
            <>
              {filme && filme.spotlight.length > 0 && (
                <Row heading="Filme für dich" titles={filme.spotlight} reasons={filme.reasons} />
              )}
              {likedForView.map((l) => (
                <SimilarRail key={l.key} idNum={l.num} media={l.media} name={l.name} titleId={l.key} />
              ))}
              {[...genresMovie]
                .sort((a, b) => genreWeightOf(b.name) - genreWeightOf(a.name))
                .slice(0, 8)
                .map((g) => (
                  <GenreRow key={g.id} name={g.name} genreId={g.id} media="movie" />
                ))}
            </>
          )}
        </>
      )}

      {view === "dienste" && (
        <section aria-label="Dienste" className="mt-4 space-y-4">
          <p className="max-w-3xl text-base text-slate-300">
            Wähle mit OK deine Haushalts-Abos. Echte Anbieterliste von TMDb (DE). Alles bleibt auf diesem Gerät.
          </p>
          <button
            data-tv
            type="button"
            onClick={() => toggleService(FREE_TV_ID)}
            aria-pressed={services.includes(FREE_TV_ID)}
            className="tv-focusable flex w-full items-center justify-between rounded-2xl p-4 text-lg font-bold bg-white text-slate-900"
          >
            <span>{FREE_TV_LABEL}</span>
            <span aria-hidden>{services.includes(FREE_TV_ID) ? "✓" : "○"}</span>
          </button>
          <ProviderGroupList large providers={filterFreeProviders(providers)} services={services} onToggle={toggleService} />
        </section>
      )}

      {view === "liste" && (
        <section aria-label="Meine Liste" className="mt-4">
          {saved.length === 0 ? (
            <p className="text-base text-slate-300">
              Noch nichts gemerkt. Suche Titel und merke sie über die Detailansicht.
            </p>
          ) : (
            <Row heading="Gespeichert" titles={saved} />
          )}
        </section>
      )}

      <footer className="mt-8 text-sm text-slate-400">
        <p>
          Daten: TMDb (nicht von TMDB zertifiziert) · Verfügbarkeiten u. a. von JustWatch · IMDb via OMDb ·
          Region DE · Keine Wiedergabe in der App. Offline: gespeicherte Liste, sonst Internet nötig. ·
          Build {BUILD_ID}
        </p>
      </footer>

      {detailId && detail && (
        <div role="dialog" aria-modal="true" aria-label={detail.title} className="fixed inset-0 z-50 overflow-y-auto bg-black/85 p-[3vw]">
          <div className="mx-auto max-w-3xl rounded-2xl border border-white/15 bg-neutral-950 p-5 text-white">
            <h2 className="text-2xl font-black">{detail.title}</h2>
            <p className="mt-1 text-base text-slate-300">
              {detail.year ?? "?"} · {detail.mediaType === "tv" ? "Serie" : "Film"}
              {typeof detail.voteAverage === "number" ? ` · TMDb ★ ${detail.voteAverage.toFixed(1)}` : ""}
            </p>
            <div className="mt-2"><ImdbBadge imdbId={detail.imdbId} /></div>
            <p className="mt-3 text-base text-slate-200">{detail.overview || "Keine Beschreibung verfügbar."}</p>
            {detail.genres.length > 0 && (
              <p className="mt-2 text-sm text-slate-300">Genres: {detail.genres.join(", ")}</p>
            )}
            <h3 className="mt-5 text-lg font-extrabold">Verfügbarkeit in Deutschland (DE)</h3>
            <p className="mt-1 text-sm text-slate-400">Anbieter antippen zum Öffnen (Link aus der TMDb-API).</p>
            {detail.availability.length === 0 ? (
              <p className="mt-2 text-base text-slate-300">
                Aktuell keine Verfügbarkeit für DE bekannt – Daten können veraltet oder unvollständig sein.
              </p>
            ) : (
              <div className="mt-3 flex flex-wrap gap-2">
                {detail.availability
                  .filter((a, i, arr) => arr.findIndex((b) => b.provider_id === a.provider_id && b.kind === a.kind) === i)
                  .map((a, i) => {
                    const href = detail.justWatchLink ?? `https://www.justwatch.com/de/Suche?q=${encodeURIComponent(detail.title)}`;
                    return (
                      <button
                        key={`${a.provider_id}-${i}`}
                        data-tv
                        type="button"
                        onClick={() => openExternal(href)}
                        aria-label={`${a.provider_name} öffnen`}
                        title="Bei JustWatch öffnen"
                        className="tv-focusable rounded-full bg-white/10 px-3 py-1 text-sm underline decoration-dotted underline-offset-2"
                      >
                        {a.provider_name} · {AVAILABILITY_LABELS[a.kind] ?? a.kind} ↗
                      </button>
                    );
                  })}
              </div>
            )}
            <div className="mt-6">
              <TitleActions
                title={detail}
                watched={tvFullySeen}
                marked={hasWatch(detail.id)}
                interest={prefs.interests[detail.id] ?? null}
                tvMode
                onToggleWatch={() => detail && toggleWatch(detail.id, { title: detail.title, year: detail.year, mediaType: detail.mediaType, posterPath: detail.posterPath })}
                onToggleSeen={tvToggleSeen}
                onSetInterest={(dir) => detail && setInterest(detail.id, dir, detail.genres)}
              />
            </div>
            {tvIsSeries && tvSeasons.length > 0 && detailId && (
              <EpisodeTracker
                title={detail.title}
                seasons={tvSeasons}
                seenEpisodeIds={tvSeenEpIds}
                fullySeen={tvFullySeen}
                episodesBySeason={tvSeries.bySeason}
                loadingSeasons={tvSeries.loading}
                loadFailed={tvSeries.failed}
                onLoadSeason={tvSeries.loadSeason}
                onToggleEpisode={(epId) => toggleEpisodeSeen(detailId, epId)}
                onMarkSeason={(epIds, v) => setSeasonSeen(detailId, epIds, v)}
                onMarkAll={async () => {
                  const all = await tvSeries.loadAll();
                  markSeriesSeen(detailId, all.map((e) => e.id));
                }}
                onUnmarkAll={() => unmarkSeries(detailId)}
                tvMode
              />
            )}
            <div className="mt-4 flex flex-wrap gap-2">
              {detail.justWatchLink ? (
                <button
                  data-tv
                  type="button"
                  onClick={() => detail.justWatchLink && openExternal(detail.justWatchLink)}
                  className="tv-focusable tv-btn bg-white text-black"
                >
                  Watch-Optionen zu diesem Titel öffnen ↗
                </button>
              ) : null}
              <button
                data-tv
                type="button"
                onClick={closeDetail}
                className="tv-focusable tv-btn bg-neutral-800 text-white"
              >
                Schließen (Zurück)
              </button>
            </div>
            <p className="mt-3 text-sm text-slate-400">
              {detail.justWatchLink
                ? "Der Button öffnet den echten Titel-Link aus der TMDb-API (u. a. JustWatch). Dort wählst du den Anbieter. Keine Wiedergabe in dieser App."
                : "Kein externer Titel-Link aus der API – bitte direkt in der App des Anbieters suchen. Keine Wiedergabe in dieser App."}
            </p>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
