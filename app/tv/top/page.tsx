"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { Genre, Title } from "@/lib/types";
import { apiDiscover, apiGenres } from "@/lib/api.ts";
import { usePrefs } from "@/lib/store";
import { posterUrl } from "@/lib/images";
import { BUILD_ID } from "@/lib/build";
import "../tv.css";

// Echte Unterseite für eine Auswahl: Genre (+ Filter) mit bis zu 220 Titeln.
// Ein Discover-Abruf liefert bis zu 40 Titel (Film- + Serien-Seite);
// 3 Abrufe parallel ≈ bis zu 120 Titel sofort, Rest per „Mehr laden“
// bis Seite 11 (bis zu 220 Titel).
const PAGES_PER_LOAD = 3;
const MAX_PAGES = 11;
const MAX_TITLES = 220;

type Media = "movie" | "tv" | "all";

interface Snap {
  genre: string;
  gid: number | null;
  media: Media;
  yearFrom: string;
  yearTo: string;
  onlyMine: boolean;
  included: boolean;
}

function includedOnly(list: Title[]): Title[] {
  return list.filter((t) =>
    t.availability.some((a) => a.kind === "flatrate" || a.kind === "free" || a.kind === "ads")
  );
}

function TopInner() {
  const params = useSearchParams();
  const { loaded, services } = usePrefs();

  const [movieG, setMovieG] = useState<Genre[]>([]);
  const [tvG, setTvG] = useState<Genre[]>([]);
  const [mergedG, setMergedG] = useState<Genre[]>([]);
  const [genresReady, setGenresReady] = useState(false);

  const [genre, setGenre] = useState(params.get("genre") ?? "");
  const [media, setMedia] = useState<Media>(
    params.get("media") === "tv" ? "tv" : params.get("media") === "movie" ? "movie" : "all"
  );
  const [yearFrom, setYearFrom] = useState(params.get("yearFrom") ?? "");
  const [yearTo, setYearTo] = useState(params.get("yearTo") ?? "");
  const [onlyMine, setOnlyMine] = useState(params.get("onlyMine") === "1");
  const [included, setIncluded] = useState(params.get("included") === "1");

  const [snap, setSnap] = useState<Snap | null>(null);
  const [titles, setTitles] = useState<Title[]>([]);
  const [pages, setPages] = useState(0);
  const [loading, setLoading] = useState(false);
  const [finished, setFinished] = useState(false);
  const [failed, setFailed] = useState(false);
  // Einzeln fehlgeschlagene Discover-Seiten (Netz/Server) – statt stiller
  // Kurz-Liste bekommt der User eine Meldung + Nachlade-Button.
  const [failedPages, setFailedPages] = useState<number[]>([]);

  const busy = useRef(false);
  const titlesRef = useRef<Title[]>([]);
  titlesRef.current = titles;
  const started = useRef(false);

  useEffect(() => {
    let cancelled = false;
    apiGenres()
      .then((g) => {
        if (cancelled) return;
        setMovieG(g.movie);
        setTvG(g.tv);
        const merged = new Map<string, Genre>();
        for (const x of [...g.movie, ...g.tv]) if (!merged.has(x.name)) merged.set(x.name, x);
        setMergedG([...merged.values()]);
        setGenresReady(true);
      })
      .catch(() => {
        if (!cancelled) setGenresReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Fokus für die Fernbedienung auf „Zurück“ legen.
  useEffect(() => {
    const t = window.setTimeout(() => {
      document.querySelector<HTMLElement>(".tv-top-page [data-tv]")?.focus({ preventScroll: true });
    }, 120);
    return () => window.clearTimeout(t);
  }, []);

  function gidFor(name: string, m: Media): number | null {
    const primary = m === "tv" ? tvG : m === "movie" ? movieG : mergedG;
    return (
      primary.find((x) => x.name === name)?.id ?? mergedG.find((x) => x.name === name)?.id ?? null
    );
  }

  async function runLoad(s: Snap, from: number, count: number, base: Title[]) {
    if (busy.current) return;
    busy.current = true;
    setLoading(true);
    setFailed(false);
    try {
      const provs = s.onlyMine ? services : [];
      const map = new Map<string, Title>();
      for (const t of base) map.set(t.id, t);
      let reachedEnd = false;
      // Seiten parallel laden statt nacheinander – sonst dauert Top 220 ewig.
      const pagesToLoad: number[] = [];
      for (let p = from; p < from + count && p <= MAX_PAGES; p += 1) pagesToLoad.push(p);
      let last = from - 1;
      const batches = await Promise.all(
        pagesToLoad.map((p) =>
          apiDiscover(provs, {
            genreId: s.gid,
            yearFrom: s.yearFrom ? Number(s.yearFrom) : null,
            yearTo: s.yearTo ? Number(s.yearTo) : null,
            mediaType: s.media,
            page: p
          }).then(
            (r) => ({ page: p, results: r, ok: true as const }),
            () => ({ page: p, results: [] as Title[], ok: false as const })
          )
        )
      );
      batches.sort((a, b) => a.page - b.page);
      const failedNow: number[] = [];
      for (const { page, results, ok } of batches) {
        last = page;
        if (!ok) {
          failedNow.push(page);
          continue;
        }
        // TMDb-Seiten sind fortlaufend: eine leere Seite heißt Ende aller Seiten.
        if (results.length === 0) reachedEnd = true;
        for (const t of results) if (!map.has(t.id)) map.set(t.id, t);
        if (map.size >= MAX_TITLES) break;
      }
      // Geladene Seiten von der Fehlerliste streichen, neu fehlgeschlagene dazu.
      setFailedPages((prev) => [...prev.filter((p) => !pagesToLoad.includes(p)), ...failedNow]);
      let list = [...map.values()].slice(0, MAX_TITLES);
      if (s.included) list = includedOnly(list);
      titlesRef.current = list;
      setTitles(list);
      setPages(last);
      if (reachedEnd || last >= MAX_PAGES || list.length >= MAX_TITLES) setFinished(true);
    } catch {
      setFailed(true);
    } finally {
      busy.current = false;
      setLoading(false);
    }
  }

  function apply(next: { genre: string; media: Media; yearFrom: string; yearTo: string; onlyMine: boolean; included: boolean }) {
    const s: Snap = { ...next, gid: gidFor(next.genre, next.media) };
    setSnap(s);
    setTitles([]);
    titlesRef.current = [];
    setPages(0);
    setFinished(false);
    setFailedPages([]);
    void runLoad(s, 1, PAGES_PER_LOAD, []);
  }

  // Einmalig mit den übergebenen Parametern starten (wartet auf Dienste + Genres).
  useEffect(() => {
    if (!loaded || !genresReady || started.current) return;
    started.current = true;
    apply({ genre, media, yearFrom, yearTo, onlyMine, included });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, genresReady]);

  function loadMore() {
    if (!snap || loading || finished) return;
    void runLoad(snap, pages + 1, PAGES_PER_LOAD, titlesRef.current);
  }

  function retryFailed() {
    if (!snap || loading || failedPages.length === 0) return;
    const from = Math.min(...failedPages);
    const count = Math.max(...failedPages) - from + 1;
    void runLoad(snap, from, count, titlesRef.current);
  }

  const options = media === "tv" ? tvG : media === "movie" ? movieG : mergedG;
  const optionNames = options.map((g) => g.name);
  const shownGenre = genre || "Alle Genres";

  return (
    <div className="tv-shell">
      <div className="tv-top-page tv-main" style={{ maxWidth: 1760 }}>
        <div className="tv-top-bar">
          <Link data-tv href="/tv" className="tv-focusable tv-btn bg-white text-black" style={{ textDecoration: "none" }}>
            ← Zurück
          </Link>
          <h1 className="tv-top-title">Top 220 · {shownGenre}</h1>
          <span className="tv-top-count" aria-live="polite">
            {loading && titles.length === 0 ? "Lädt …" : `${titles.length} Titel`} · Build {BUILD_ID}
          </span>
        </div>

        <div className="tv-filter-panel" aria-label="Filter für diese Auswahl">
          <label className="tv-filter-field">
            <span>Genre</span>
            <select
              data-tv
              value={genre}
              onChange={(e) => setGenre(e.target.value)}
              className="tv-focusable tv-input"
              style={{ background: "#fff" }}
            >
              <option value="">Alle Genres</option>
              {!optionNames.includes(genre) && genre !== "" && <option value={genre}>{genre}</option>}
              {optionNames.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </label>
          <label className="tv-filter-field">
            <span>Art</span>
            <select
              data-tv
              value={media}
              onChange={(e) => setMedia(e.target.value as Media)}
              className="tv-focusable tv-input"
              style={{ background: "#fff" }}
            >
              <option value="all">Filme & Serien</option>
              <option value="movie">Nur Filme</option>
              <option value="tv">Nur Serien</option>
            </select>
          </label>
          <label className="tv-filter-field">
            <span>Jahr von</span>
            <input
              data-tv
              value={yearFrom}
              onChange={(e) => setYearFrom(e.target.value)}
              inputMode="numeric"
              placeholder="z. B. 2015"
              className="tv-focusable tv-input"
            />
          </label>
          <label className="tv-filter-field">
            <span>Jahr bis</span>
            <input
              data-tv
              value={yearTo}
              onChange={(e) => setYearTo(e.target.value)}
              inputMode="numeric"
              placeholder="z. B. 2024"
              className="tv-focusable tv-input"
            />
          </label>
          <button
            data-tv
            type="button"
            onClick={() => setOnlyMine((v) => !v)}
            aria-pressed={onlyMine}
            className={`tv-focusable tv-chip${onlyMine ? " is-on" : ""}`}
          >
            {onlyMine ? "✓ " : ""}Auf meinen Diensten
          </button>
          <button
            data-tv
            type="button"
            onClick={() => setIncluded((v) => !v)}
            aria-pressed={included}
            className={`tv-focusable tv-chip${included ? " is-on" : ""}`}
          >
            {included ? "✓ " : ""}Nur inklusive
          </button>
          <button
            data-tv
            type="button"
            onClick={() => apply({ genre, media, yearFrom, yearTo, onlyMine, included })}
            className="tv-focusable tv-btn bg-white text-black"
          >
            Anwenden
          </button>
        </div>
        <div className="mt-3">
          <Link
            data-tv
            href={`/top220.html?${new URLSearchParams({ genre, media }).toString()}`}
            className="tv-focusable tv-more-btn"
            style={{ textDecoration: "none" }}
          >
            Einfache Ansicht (statische Top-220-Liste)
          </Link>
        </div>
        {failedPages.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <p className="text-sm text-amber-300">
              Seite {failedPages.join(", ")} konnte nicht geladen werden – es fehlen evtl. Titel.
            </p>
            <button
              data-tv
              type="button"
              onClick={retryFailed}
              className="tv-focusable tv-btn bg-white text-black"
            >
              Fehlende Seiten nachladen
            </button>
          </div>
        )}

        {failed && titles.length === 0 ? (
          <div className="mt-6">
            <p className="text-base text-slate-300">Laden fehlgeschlagen – prüfe die Internetverbindung.</p>
            <button
              data-tv
              type="button"
              onClick={() => apply({ genre, media, yearFrom, yearTo, onlyMine, included })}
              className="tv-focusable tv-btn mt-3 bg-white text-black"
            >
              Erneut versuchen
            </button>
          </div>
        ) : titles.length === 0 && !loading ? (
          <p className="mt-6 text-base text-slate-300">Keine Ergebnisse – passe Filter an.</p>
        ) : (
          <>
            <div className="tv-grid-all">
              {titles.map((t) => {
                const src = posterUrl(t.posterPath, "w342");
                return (
                  <Link
                    key={t.id}
                    data-tv
                    href={`/titel?id=${encodeURIComponent(t.id)}`}
                    aria-label={`${t.title} – Details ansehen`}
                    className="tv-focusable tv-card text-left"
                    style={{ textDecoration: "none" }}
                  >
                    <div className="relative aspect-[2/3] w-full bg-neutral-800">
                      {src ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={src} alt="" aria-hidden loading="lazy" className="h-full w-full object-cover" />
                      ) : (
                        <div aria-hidden className="flex h-full items-center justify-center text-2xl font-black text-neutral-500">
                          {(t.title ?? "?").slice(0, 2).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="p-3">
                      <p className="tv-card-title truncate font-bold text-white">{t.title}</p>
                      <p className="tv-card-meta text-neutral-400">
                        {t.year ?? "?"} · {t.mediaType === "tv" ? "Serie" : "Film"}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
            <div className="mt-6 flex justify-center">
              {loading ? (
                <p className="text-base text-slate-300" aria-live="polite">Lädt … ({titles.length} geladen)</p>
              ) : !finished ? (
                <button
                  data-tv
                  type="button"
                  onClick={loadMore}
                  className="tv-focusable tv-btn bg-white text-black"
                >
                  Mehr laden ({titles.length} von bis zu 220)
                </button>
              ) : (
                <p className="text-sm text-slate-400">{titles.length} Titel geladen.</p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function TopPage() {
  return (
    <Suspense fallback={<p className="text-slate-300">Top 220 wird geladen …</p>}>
      <TopInner />
    </Suspense>
  );
}
