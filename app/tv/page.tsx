"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Browser } from "@capacitor/browser";
import type { Title } from "@/lib/types";
import { ApiError, apiDiscover, apiImdbRating, apiProviders, apiSeasonEpisodes, apiTitle, apiTrending, isCapacitorAndroid } from "@/lib/api.ts";
import { isOnMyServicesEntries, usePrefs } from "@/lib/store";
import { genreWeights, nextUnseenEpisode } from "@/lib/prefs.ts";
import EpisodeTracker, { useSeriesEpisodes } from "@/components/episode-tracker";
import { posterUrl } from "@/lib/images";
import { AVAILABILITY_LABELS } from "@/lib/types";
import { useTvFocus } from "@/lib/tv-focus";
import ImdbBadge from "@/components/imdb-badge";
import TitleActions from "@/components/title-actions";
import { FREE_TV_ID, FREE_TV_LABEL, filterFreeProviders } from "@/lib/free-tv";
import ProviderGroupList from "@/components/provider-group-list";
import "./tv.css";

type View = "entdecken" | "serien" | "filme" | "dienste" | "liste";

const VIEWS: Array<{ id: View; label: string; icon: string }> = [
  { id: "entdecken", label: "Entdecken", icon: "✦" },
  { id: "serien", label: "Serien", icon: "📺" },
  { id: "filme", label: "Filme", icon: "🎬" },
  { id: "dienste", label: "Dienste", icon: "🧩" },
  { id: "liste", label: "Liste", icon: "♥" }
];

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
  const [view, setView] = useState<View>("entdecken");
  const [q, setQ] = useState("");
  const [trending, setTrending] = useState<Title[]>([]);
  const [household, setHousehold] = useState<Title[]>([]);
  const [results, setResults] = useState<Title[] | null>(null);
  const [providers, setProviders] = useState<{ provider_id: number; provider_name: string }[]>([]);
  const [status, setStatus] = useState<"loading" | "ok" | "setup" | "error">("loading");
  const [detailId, setDetailId] = useState<string | null>(null);
  const [detail, setDetail] = useState<(Title & { imdbId?: string | null }) | null>(null);
  const { prefs, loaded, services, toggleService, watchlist, toggleWatch, removeWatch, hasWatch, seen, toggleSeen, setInterest, seenEpisodes, toggleEpisodeSeen, setSeasonSeen, markSeriesSeen, unmarkSeries } = usePrefs();
  const [continueWatching, setContinueWatching] = useState<Array<{ title: Title; label: string }>>([]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([apiTrending(), apiProviders()])
      .then(([t, p]) => {
        if (cancelled) return;
        setTrending(t);
        setProviders(p);
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
  const filteredResults = useMemo(
    () =>
      results === null
        ? null
        : results.filter((t) =>
            view === "serien" ? t.mediaType === "tv" : view === "filme" ? t.mediaType === "movie" : true
          ),
    [results, view]
  );

  function surprise() {
    const mine = household.filter(onMine);
    const candidates = (mine.length > 0 ? mine : pool).filter((t) => !seen.includes(t.id));
    if (candidates.length === 0) return;
    setDetailId(candidates[Math.floor(Math.random() * candidates.length)].id);
  }

  function Card({ t, reason }: { t: Title; reason?: string }) {
    const src = posterUrl(t.posterPath, "w342");
    return (
      <button
        data-tv
        type="button"
        onClick={() => setDetailId(t.id)}
        aria-label={`${t.title} – Details ansehen`}
        className="tv-focusable tv-card w-36 shrink-0 snap-start overflow-hidden rounded-xl border border-white/10 bg-ink-800 text-left md:w-44"
      >
        <div className="relative aspect-[2/3] w-full bg-ink-700">
          {src ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={src} alt="" aria-hidden loading="lazy" className="h-full w-full object-cover" />
          ) : (
            <div aria-hidden className="flex h-full items-center justify-center text-2xl font-black text-slate-500">
              {initials(t.title)}
            </div>
          )}
          {onMine(t) && (
            <span className="absolute left-2 top-2 rounded-full bg-emerald-500 px-2 py-0.5 text-xs font-bold text-white">
              Deine Dienste
            </span>
          )}
          {seen.includes(t.id) && (
            <span className="absolute bottom-2 left-2 rounded-full bg-black/75 px-2 py-0.5 text-xs font-bold text-emerald-300">
              ✓ Gesehen
            </span>
          )}
        </div>
        <div className="p-2.5">
          <p className="truncate text-base font-bold text-white">{t.title}</p>
          <p className="text-xs text-slate-400">
            {t.year ?? "?"} · {t.mediaType === "tv" ? "Serie" : "Film"}
            {typeof imdbMap.get(t.id) === "number" ? ` · IMDb ★ ${(imdbMap.get(t.id) as number).toFixed(1)}` : ""}
          </p>
          {reason && <p className="mt-1 text-xs text-gold-300">{reason}</p>}
        </div>
      </button>
    );
  }

  function Row({ heading, titles, reasons }: { heading: string; titles: Title[]; reasons?: Map<string, string> }) {
    if (titles.length === 0) return null;
    return (
      <section aria-label={heading} className="mt-6">
        <h2 className="text-xl font-extrabold text-white">{heading}</h2>
        <div className="no-scrollbar -mx-1 mt-4 flex snap-x gap-4 overflow-x-auto px-1 pb-2">
          {titles.map((t) => (
            <Card key={t.id} t={t} reason={reasons?.get(t.id)} />
          ))}
        </div>
      </section>
    );
  }

  if (status === "setup") {
    return (
      <div className="tv-root text-white">
        <h1 className="text-4xl font-black">StreamFinder</h1>
        <div className="mt-6 max-w-2xl rounded-3xl border border-white/10 bg-ink-800 p-8" role="alert">
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
        <div aria-hidden className="tv-rail-logo">S</div>
        {VIEWS.map((v) => (
          <button
            key={v.id}
            data-tv
            type="button"
            onClick={() => {
              setView(v.id);
              setDetailId(null);
              setResults(null);
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
          <p className="tv-eyebrow">StreamFinder</p>
          <h1 className="font-black tracking-tight">{viewTitle[view]}</h1>
          <p className="mt-1 text-sm text-slate-300">
            Ganz nach links steuern öffnet das Menü · OK wählt · Zurück schließt die Info. Echte Daten · Deutschland (DE).
          </p>
        </header>

      {(view === "entdecken" || view === "serien" || view === "filme") && (
        <>
          <form
            role="search"
            className="mt-4 flex flex-wrap gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              runSearch(q);
            }}
          >
            <label htmlFor="tv-suche" className="sr-only">Titel oder Genre suchen</label>
            <input
              id="tv-suche"
              data-tv
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Film oder Serie suchen … (Tastatur öffnet sich automatisch)"
              className="tv-focusable w-full min-w-0 max-w-2xl flex-1 rounded-xl bg-white px-4 py-2.5 text-base text-slate-900 sm:text-lg"
            />
            <button data-tv type="submit" className="tv-focusable rounded-xl bg-white px-5 py-2.5 text-lg font-extrabold text-slate-900">
              Suchen
            </button>
            <button
              data-tv
              type="button"
              onClick={surprise}
              disabled={pool.length === 0}
              className="tv-focusable rounded-xl bg-gold-400 px-5 py-2.5 text-lg font-extrabold text-slate-900 disabled:opacity-40"
            >
              Überrasch mich
            </button>
          </form>
          {filteredResults !== null ? (
            <Row heading={filteredResults.length === 0 ? "Keine Ergebnisse" : "Suchergebnisse"} titles={filteredResults} />
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
              {entdecken?.genreRails.map((r) => (
                <Row key={r.heading} heading={r.heading} titles={r.titles} />
              ))}
              <Row heading="Im Trend" titles={freshTrending} />
            </>
          ) : view === "serien" ? (
            <>
              {serien && serien.spotlight.length > 0 && (
                <Row heading="Serien für dich" titles={serien.spotlight} reasons={serien.reasons} />
              )}
              {serien?.genreRails.map((r) => (
                <Row key={r.heading} heading={r.heading} titles={r.titles} />
              ))}
            </>
          ) : (
            <>
              {filme && filme.spotlight.length > 0 && (
                <Row heading="Filme für dich" titles={filme.spotlight} reasons={filme.reasons} />
              )}
              {filme?.genreRails.map((r) => (
                <Row key={r.heading} heading={r.heading} titles={r.titles} />
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
          Region DE · Keine Wiedergabe in der App. Offline: gespeicherte Liste, sonst Internet nötig.
        </p>
      </footer>

      {detailId && detail && (
        <div role="dialog" aria-modal="true" aria-label={detail.title} className="fixed inset-0 z-50 overflow-y-auto bg-black/85 p-[3vw]">
          <div className="mx-auto max-w-3xl rounded-2xl border border-white/10 bg-ink-900 p-5 text-white">
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
            {detail.availability.length === 0 ? (
              <p className="mt-2 text-base text-slate-300">
                Aktuell keine Verfügbarkeit für DE bekannt – Daten können veraltet oder unvollständig sein.
              </p>
            ) : (
              <div className="mt-3 flex flex-wrap gap-2">
                {detail.availability
                  .filter((a, i, arr) => arr.findIndex((b) => b.provider_id === a.provider_id && b.kind === a.kind) === i)
                  .map((a, i) => (
                    <span key={`${a.provider_id}-${i}`} className="rounded-full bg-white/10 px-3 py-1 text-sm">
                      {a.provider_name} · {AVAILABILITY_LABELS[a.kind] ?? a.kind}
                    </span>
                  ))}
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
                  className="tv-focusable rounded-xl bg-blue-600 px-5 py-2.5 text-lg font-bold text-white"
                >
                  Watch-Optionen zu diesem Titel öffnen ↗
                </button>
              ) : null}
              <button
                data-tv
                type="button"
                onClick={closeDetail}
                className="tv-focusable rounded-xl bg-white px-5 py-2.5 text-lg font-extrabold text-slate-900"
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
