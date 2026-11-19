"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Browser } from "@capacitor/browser";
import type { Title } from "@/lib/types";
import { ApiError, apiDiscover, apiImdbRating, apiProviders, apiSeasonEpisodes, apiTitle, apiTrending, isCapacitorAndroid } from "@/lib/api.ts";
import { isOnMyServicesEntries, usePrefs } from "@/lib/store";
import { nextUnseenEpisode, scoreTitles } from "@/lib/prefs.ts";
import EpisodeTracker, { useSeriesEpisodes } from "@/components/episode-tracker";
import { backdropUrl, posterUrl } from "@/lib/images";
import { useTvFocus } from "@/lib/tv-focus";
import ImdbBadge from "@/components/imdb-badge";
import TitleActions from "@/components/title-actions";
import { FREE_TV_ID, FREE_TV_LABEL, filterFreeProviders } from "@/lib/free-tv";
import "./tv.css";

type Tab = "suchen" | "dienste" | "liste";

const TABS: Array<{ id: Tab; label: string }> = [
  { id: "suchen", label: "Suchen" },
  { id: "dienste", label: "Meine Dienste" },
  { id: "liste", label: "Meine Liste" }
];

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
  const [tab, setTab] = useState<Tab>("suchen");
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

  const forYou = useMemo(
    () => (loaded && status === "ok" ? scoreTitles(pool, prefs).filter((s) => s.score > 0).slice(0, 12) : []),
    [pool, prefs, loaded, status]
  );

  const onMine = useCallback(
    (t: Title) => isOnMyServicesEntries(t.availability, services),
    [services]
  );

  const shownSuchen = results ?? trending;
  const hero = useMemo(
    () => trending.find((t) => t.backdropPath) ?? trending[0] ?? null,
    [trending]
  );
  const heroBg = hero ? backdropUrl(hero.backdropPath, "w1280") : null;

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
        className="tv-focusable tv-card w-44 shrink-0 snap-start overflow-hidden rounded-2xl border border-white/10 bg-ink-800 text-left md:w-52"
      >
        <div className="relative aspect-[2/3] w-full bg-ink-700">
          {src ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={src} alt="" aria-hidden loading="lazy" className="h-full w-full object-cover" />
          ) : (
            <div aria-hidden className="flex h-full items-center justify-center text-4xl font-black text-slate-500">
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
        <div className="p-3">
          <p className="truncate text-lg font-bold text-white">{t.title}</p>
          <p className="text-sm text-slate-400">
            {t.year ?? "?"} · {t.mediaType === "tv" ? "Serie" : "Film"}
            {typeof imdbMap.get(t.id) === "number" ? ` · IMDb ★ ${(imdbMap.get(t.id) as number).toFixed(1)}` : ""}
          </p>
          {reason && <p className="mt-1 text-sm text-gold-300">{reason}</p>}
        </div>
      </button>
    );
  }

  function Row({ heading, titles, reasons }: { heading: string; titles: Title[]; reasons?: Map<string, string> }) {
    if (titles.length === 0) return null;
    return (
      <section aria-label={heading} className="mt-8">
        <h2 className="text-2xl font-extrabold text-white">{heading}</h2>
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
      <div className="tv-root bg-[#070b16] text-white">
        <h1 className="text-4xl font-black">StreamFinder TV</h1>
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
      <div className="tv-root bg-[#070b16] text-white" role="alert">
        <h1 className="text-4xl font-black">StreamFinder TV</h1>
        <p className="mt-6 text-2xl">Feed derzeit nicht verfügbar. Prüfe die Internetverbindung.</p>
      </div>
    );
  }

  const saved = pool.filter((t) => watchlist.some((w) => w.id === t.id));

  return (
    <div className="tv-root bg-[#070b16] text-white">
      <header className="mb-6">
        <h1 className="font-black tracking-tight">StreamFinder TV</h1>
        <p className="mt-1 text-xl text-slate-300">
          Echte Verfügbarkeiten deiner Abos · Deutschland (DE) · Mit Fernbedienung bedienbar
        </p>
      </header>

      {hero && tab === "suchen" && (
        <section aria-label="Empfehlung" className="relative mb-2 overflow-hidden rounded-3xl border border-white/10">
          <div className="relative aspect-[21/8] w-full">
            {heroBg && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={heroBg} alt="" aria-hidden className="absolute inset-0 h-full w-full object-cover" />
            )}
            <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-[#070b16] via-transparent to-transparent" />
            <div aria-hidden className="absolute inset-0 bg-gradient-to-r from-[#070b16]/80 via-transparent to-transparent" />
            <div className="absolute bottom-0 left-0 max-w-2xl p-8">
              <p className="text-xl font-bold uppercase tracking-wider text-gold-300">Empfehlung des Tages</p>
              <h2 className="text-glow mt-1 text-5xl font-black">{hero.title}</h2>
              <div className="mt-3 flex gap-3">
                <button
                  data-tv
                  type="button"
                  onClick={() => setDetailId(hero.id)}
                  className="tv-focusable rounded-2xl bg-white px-8 py-4 text-2xl font-extrabold text-slate-900"
                >
                  Details ansehen
                </button>
                <button
                  data-tv
                  type="button"
                  onClick={surprise}
                  className="tv-focusable rounded-2xl bg-gold-400 px-8 py-4 text-2xl font-extrabold text-slate-900"
                >
                  Überrasch mich
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      <nav aria-label="TV-Bereiche" className="mb-2 flex gap-4">
        {TABS.map((t) => (
          <button
            key={t.id}
            data-tv
            type="button"
            onClick={() => {
              setTab(t.id);
              setDetailId(null);
            }}
            aria-current={tab === t.id ? "page" : undefined}
            className={`tv-focusable rounded-2xl px-8 py-4 text-2xl font-bold ${
              tab === t.id ? "bg-white text-slate-900" : "bg-ink-800 text-white"
            }`}
          >
            {t.label}
            {t.id === "liste" && watchlist.length > 0 ? ` (${watchlist.length})` : ""}
          </button>
        ))}
      </nav>

      {tab === "suchen" && (
        <>
          <form
            role="search"
            className="mt-4 flex gap-4"
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
              className="tv-focusable w-full max-w-2xl rounded-2xl bg-white px-6 py-4 text-2xl text-slate-900"
            />
            <button data-tv type="submit" className="tv-focusable rounded-2xl bg-white px-8 py-4 text-2xl font-extrabold text-slate-900">
              Suchen
            </button>
          </form>
          {results !== null && (
            <Row heading={results.length === 0 ? "Keine Ergebnisse" : "Suchergebnisse"} titles={results} />
          )}
          {results === null && (
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
              {forYou.length > 0 && (
                <Row
                  heading="Für dich"
                  titles={forYou.map((s) => s.title)}
                  reasons={new Map(forYou.map((s) => [s.title.id, s.reasons[0] ?? ""] as [string, string]))}
                />
              )}
              <Row heading="Im Trend" titles={trending} />
            </>
          )}
        </>
      )}

      {tab === "dienste" && (
        <section aria-label="Dienste" className="mt-4 space-y-6">
          <p className="max-w-3xl text-2xl text-slate-300">
            Wähle mit OK deine Haushalts-Abos. Echte Anbieterliste von TMDb (DE). Alles bleibt auf diesem Gerät.
          </p>
          <ul className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            <li>
              <button
                data-tv
                type="button"
                onClick={() => toggleService(FREE_TV_ID)}
                aria-pressed={services.includes(FREE_TV_ID)}
                className="tv-focusable flex w-full items-center justify-between rounded-3xl p-6 text-2xl font-bold bg-white text-slate-900"
              >
                <span>{FREE_TV_LABEL}</span>
                <span aria-hidden>{services.includes(FREE_TV_ID) ? "✓" : "○"}</span>
              </button>
            </li>
            {filterFreeProviders(providers).map((p) => {
              const active = services.includes(p.provider_id);
              return (
                <li key={p.provider_id}>
                  <button
                    data-tv
                    type="button"
                    onClick={() => toggleService(p.provider_id)}
                    aria-pressed={active}
                    className={`tv-focusable flex w-full items-center justify-between rounded-3xl p-6 text-2xl font-bold ${
                      active ? "bg-emerald-400 text-slate-900" : "bg-white text-slate-900"
                    }`}
                  >
                    <span>{p.provider_name}</span>
                    <span aria-hidden>{active ? "✓" : "○"}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {tab === "liste" && (
        <section aria-label="Meine Liste" className="mt-4">
          {saved.length === 0 ? (
            <p className="text-2xl text-slate-300">
              Noch nichts gemerkt. Suche Titel und merke sie über die Detailansicht.
            </p>
          ) : (
            <div className="no-scrollbar -mx-1 mt-4 flex snap-x gap-4 overflow-x-auto px-1 pb-2">
              {saved.map((t) => (
                <Card key={t.id} t={t} />
              ))}
            </div>
          )}
        </section>
      )}

      <footer className="mt-10 text-lg text-slate-400">
        <p>
          Daten: TMDb (nicht von TMDB zertifiziert) · Verfügbarkeiten u. a. von JustWatch · IMDb via OMDb ·
          Region DE · Keine Wiedergabe in der App. Offline: gespeicherte Liste, sonst Internet nötig.
        </p>
      </footer>

      {detailId && detail && (
        <div role="dialog" aria-modal="true" aria-label={detail.title} className="fixed inset-0 z-50 overflow-y-auto bg-black/85 p-[4vw]">
          <div className="mx-auto max-w-4xl rounded-3xl border border-white/10 bg-ink-900 p-8 text-white">
            <h2 className="text-4xl font-black">{detail.title}</h2>
            <p className="mt-2 text-2xl text-slate-300">
              {detail.year ?? "?"} · {detail.mediaType === "tv" ? "Serie" : "Film"}
              {typeof detail.voteAverage === "number" ? ` · TMDb ★ ${detail.voteAverage.toFixed(1)}` : ""}
            </p>
            <div className="mt-2"><ImdbBadge imdbId={detail.imdbId} /></div>
            <p className="mt-4 text-2xl text-slate-200">{detail.overview || "Keine Beschreibung verfügbar."}</p>
            {detail.genres.length > 0 && (
              <p className="mt-2 text-xl text-slate-300">Genres: {detail.genres.join(", ")}</p>
            )}
            <h3 className="mt-6 text-2xl font-extrabold">Verfügbarkeit in Deutschland (DE)</h3>
            {detail.availability.length === 0 ? (
              <p className="mt-2 text-xl text-slate-300">
                Aktuell keine Verfügbarkeit für DE bekannt – Daten können veraltet oder unvollständig sein.
              </p>
            ) : (
              <div className="mt-3 flex flex-wrap gap-2">
                {detail.availability.map((a, i) => (
                  <span key={`${a.provider_id}-${i}`} className="rounded-full bg-white/10 px-4 py-2 text-xl">
                    {a.provider_name} · {a.kind === "flatrate" ? "Abo" : a.kind === "free" ? "Kostenlos" : a.kind === "ads" ? "Werbung" : a.kind === "rent" ? "Leihen" : "Kaufen"}
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
                onSetInterest={(dir) => detail && setInterest(detail.id, dir)}
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
            <div className="mt-4 flex flex-wrap gap-4">
              {detail.justWatchLink ? (
                <button
                  data-tv
                  type="button"
                  onClick={() => detail.justWatchLink && openExternal(detail.justWatchLink)}
                  className="tv-focusable rounded-2xl bg-blue-600 px-8 py-4 text-2xl font-bold text-white"
                >
                  Watch-Option öffnen ↗
                </button>
              ) : null}
              <button
                data-tv
                type="button"
                onClick={closeDetail}
                className="tv-focusable rounded-2xl bg-white px-8 py-4 text-2xl font-extrabold text-slate-900"
              >
                Schließen (Zurück)
              </button>
            </div>
            {!detail.justWatchLink && (
              <p className="mt-3 text-lg text-slate-400">
                Kein Link aus der API – bitte direkt in der App des Anbieters suchen. Keine Wiedergabe in dieser App.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
