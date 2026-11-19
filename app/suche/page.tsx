"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { Genre, Title } from "@/lib/types";
import { ApiError, apiDiscover, apiGenres, apiImdbRating, apiProviders, apiSearch } from "@/lib/api.ts";
import { isOnMyServicesEntries, usePrefs } from "@/lib/store";
import { applySearchFilters } from "@/lib/prefs.ts";
import { ProviderBadge } from "@/components/badges";
import PosterCard from "@/components/poster-card";
import { filterFreeProviders } from "@/lib/free-tv";
import { groupProviders } from "@/lib/provider-groups";
import SetupNotice from "@/components/setup-notice";

function SucheInner() {
  const params = useSearchParams();
  const router = useRouter();
  const initialQ = params.get("q") ?? "";
  const [q, setQ] = useState(initialQ);
  const [results, setResults] = useState<Title[]>([]);
  const [mode, setMode] = useState<"titel" | "browse">("titel");
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "setup" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [onlyMine, setOnlyMine] = useState(false);
  const [mediaType, setMediaType] = useState<"all" | "movie" | "tv">("all");
  const [genre, setGenre] = useState("");
  const [yearFrom, setYearFrom] = useState("");
  const [yearTo, setYearTo] = useState("");
  const [providerId, setProviderId] = useState("");
  const [includedOnly, setIncludedOnly] = useState(false);
  const [minImdb, setMinImdb] = useState("");
  const [seenFilter, setSeenFilter] = useState<"all" | "unseen" | "seen">("unseen");
  const [genres, setGenres] = useState<Genre[]>([]);
  const [genresTv, setGenresTv] = useState<Genre[]>([]);
  const [providers, setProviders] = useState<{ provider_id: number; provider_name: string }[]>([]);
  const [imdbById, setImdbById] = useState<Map<string, number | null>>(new Map());
  const { prefs, loaded } = usePrefs();

  useEffect(() => {
    apiGenres()
      .then((g) => {
        const all = [...g.movie, ...g.tv];
        const seen = new Map(all.map((x) => [x.name, x]));
        setGenres([...seen.values()].sort((a, b) => a.name.localeCompare(b.name, "de")));
        setGenresTv(g.tv);
      })
      .catch(() => {});
    apiProviders()
      .then(setProviders)
      .catch(() => {});
  }, []);

  function genreIdFor(name: string): number | null {
    if (!name) return null;
    const all = [...genres, ...genresTv];
    return all.find((g) => g.name === name)?.id ?? null;
  }

  const runBrowse = useCallback(async () => {
    setStatus("loading");
    setMode("browse");
    try {
      const providersForBrowse = providerId
        ? [Number(providerId)]
        : onlyMine
          ? prefs.services
          : [];
      const r = await apiDiscover(providersForBrowse, {
        genreId: genreIdFor(genre),
        yearFrom: yearFrom ? Number(yearFrom) : null,
        yearTo: yearTo ? Number(yearTo) : null,
        mediaType
      });
      setResults(r);
      setStatus("ok");
    } catch (e) {
      if (e instanceof ApiError && e.notConfigured) setStatus("setup");
      else {
        setStatus("error");
        setErrorMsg(e instanceof Error ? e.message : "Stöbern fehlgeschlagen.");
      }
      setResults([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [providerId, onlyMine, prefs.services, genre, genres, genresTv, yearFrom, yearTo, mediaType]);

  const run = useCallback(
    async (query: string) => {
      const trimmed = query.trim();
      if (!trimmed) {
        await runBrowse();
        return;
      }
      setMode("titel");
      setStatus("loading");
      try {
        const r = await apiSearch(trimmed);
        setResults(r);
        setStatus("ok");
      } catch (e) {
        if (e instanceof ApiError && e.notConfigured) setStatus("setup");
        else {
          setStatus("error");
          setErrorMsg(e instanceof Error ? e.message : "Suche fehlgeschlagen.");
        }
        setResults([]);
      }
    },
    [runBrowse]
  );

  useEffect(() => {
    if (initialQ) run(initialQ);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQ]);

  // IMDb-Bewertungen für sichtbare Treffer nachladen (gecacht, max. 1×/Tag pro Titel)
  useEffect(() => {
    let cancelled = false;
    async function load() {
      const withId = results.filter((t) => t.imdbId);
      if (withId.length === 0) return;
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
      if (!cancelled) setImdbById(new Map(entries));
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [results]);

  // Detail-IDs (für IMDb-Filter) bei Bedarf nachladen
  useEffect(() => {
    let cancelled = false;
    async function enrich() {
      const missing = results.filter((t) => !t.imdbId);
      if (missing.length === 0) return;
      const { apiTitle } = await import("@/lib/api.ts");
      const full = await Promise.all(
        missing.slice(0, 12).map(async (t) => {
          try {
            return await apiTitle(t.id);
          } catch {
            return t;
          }
        })
      );
      if (cancelled) return;
      setResults((prev) => {
        const map = new Map(full.map((f) => [f.id, f]));
        return prev.map((p) => map.get(p.id) ?? p);
      });
    }
    enrich();
    return () => {
      cancelled = true;
    };
  }, [results.length]);

  const filtered = useMemo(
    () =>
      applySearchFilters(results, {
        onlyMine,
        services: prefs.services,
        mediaType,
        genre: genre || undefined,
        yearFrom: yearFrom ? Number(yearFrom) : null,
        yearTo: yearTo ? Number(yearTo) : null,
        providerId: providerId ? Number(providerId) : null,
        includedOnly,
        minImdb: minImdb ? Number(minImdb) : null,
        imdbById,
        seenFilter,
        seenIds: new Set(prefs.seen)
      }),
    [results, onlyMine, prefs.services, prefs.seen, mediaType, genre, yearFrom, yearTo, providerId, includedOnly, minImdb, imdbById, seenFilter]
  );

  const onMineIds = useMemo(
    () =>
      new Set(
        filtered
          .filter((t) => isOnMyServicesEntries(t.availability, prefs.services))
          .map((t) => t.id)
      ),
    [filtered, prefs.services]
  );

  function surprise() {
    if (filtered.length === 0) return;
    const pick = filtered[Math.floor(Math.random() * filtered.length)];
    router.push(`/titel?id=${encodeURIComponent(pick.id)}`);
  }

  const inputCls =
    "w-full min-w-0 max-w-full rounded-xl border border-white/15 bg-ink-950 px-2.5 py-2 text-sm text-white placeholder:text-slate-500 sm:px-3";
  const labelCls = "flex min-w-0 flex-col gap-1 text-xs font-bold text-slate-300";

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-black text-white">Suche & Stöbern</h1>
      <form
        role="search"
        aria-label="Titel suchen oder stöbern"
        className="flex flex-col gap-2 sm:flex-row"
        onSubmit={(e) => {
          e.preventDefault();
          run(q);
        }}
      >
        <label htmlFor="suche-input" className="sr-only">
          Film oder Serie suchen
        </label>
        <input
          id="suche-input"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Titel eingeben – oder leer lassen und nur Filter nutzen …"
          className="w-full flex-1 rounded-2xl border border-white/15 bg-ink-950 px-4 py-3 text-white placeholder:text-slate-500"
        />
        <button type="submit" className="rounded-2xl bg-white px-6 py-3 font-extrabold text-slate-900">
          {q.trim() ? "Suchen" : "Stöbern"}
        </button>
        <button
          type="button"
          onClick={runBrowse}
          className="rounded-2xl border border-white/20 px-6 py-3 font-extrabold text-white"
        >
          Nur Filter
        </button>
      </form>
      <p className="text-xs text-slate-400">
        Kein Titel im Kopf? Filter setzen (z. B. Genre + Anbieter + Zeitraum) und auf „Stöbern“ oder „Nur
        Filter“ tippen – die App schlägt passende Titel vor.
      </p>

      <fieldset className="grid grid-cols-2 gap-2 overflow-hidden rounded-2xl border border-white/10 bg-ink-800/60 p-3 sm:grid-cols-4">
        <legend className="px-1 text-xs font-bold text-slate-400">Filter</legend>
        <label className={labelCls}>
          Art
          <select value={mediaType} onChange={(e) => setMediaType(e.target.value as typeof mediaType)} className={inputCls}>
            <option value="all">Filme & Serien</option>
            <option value="movie">Nur Filme</option>
            <option value="tv">Nur Serien</option>
          </select>
        </label>
        <label className={labelCls}>
          Genre
          <select value={genre} onChange={(e) => setGenre(e.target.value)} className={inputCls}>
            <option value="">Alle Genres</option>
            {genres.map((g) => (
              <option key={g.name} value={g.name}>{g.name}</option>
            ))}
          </select>
        </label>
        <label className={labelCls}>
          Jahr von
          <input value={yearFrom} onChange={(e) => setYearFrom(e.target.value)} inputMode="numeric" placeholder="z. B. 2015" className={inputCls} />
        </label>
        <label className={labelCls}>
          Jahr bis
          <input value={yearTo} onChange={(e) => setYearTo(e.target.value)} inputMode="numeric" placeholder="z. B. 2024" className={inputCls} />
        </label>
        <label className={labelCls}>
          Anbieter
          <select value={providerId} onChange={(e) => setProviderId(e.target.value)} className={inputCls}>
            <option value="">Alle Anbieter</option>
            <option value="-1">Free TV (kostenlos)</option>
            {groupProviders(filterFreeProviders(providers).filter((p) => p.provider_id !== -1)).map((g) =>
              g.items.length === 1 ? (
                <option key={g.items[0].provider_id} value={g.items[0].provider_id}>{g.items[0].provider_name}</option>
              ) : (
                <optgroup key={g.key} label={`${g.label} (${g.items.length})`}>
                  {g.items.map((p) => (
                    <option key={p.provider_id} value={p.provider_id}>{p.provider_name}</option>
                  ))}
                </optgroup>
              )
            )}
          </select>
        </label>
        <label className={labelCls}>
          Gesehen-Status
          <select value={seenFilter} onChange={(e) => setSeenFilter(e.target.value as typeof seenFilter)} className={inputCls}>
            <option value="unseen">Nur ungesehene</option>
            <option value="all">Alle</option>
            <option value="seen">Nur gesehene</option>
          </select>
        </label>
        <label className={labelCls}>
          Mindest-IMDb
          <select value={minImdb} onChange={(e) => setMinImdb(e.target.value)} className={inputCls}>
            <option value="">Egal</option>
            <option value="6">★ 6+</option>
            <option value="7">★ 7+</option>
            <option value="8">★ 8+</option>
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm font-bold text-slate-200">
          <input type="checkbox" checked={onlyMine} onChange={(e) => setOnlyMine(e.target.checked)} className="h-5 w-5 accent-emerald-400" />
          Auf meinen Diensten
        </label>
        <label className="flex items-center gap-2 text-sm font-bold text-slate-200" title="Nur Titel, die ohne zusätzliche Zahlung pro Titel verfügbar sind (Abo, kostenlos, werbefinanziert)">
          <input type="checkbox" checked={includedOnly} onChange={(e) => setIncludedOnly(e.target.checked)} className="h-5 w-5 accent-emerald-400" />
          Nur inklusive
        </label>
      </fieldset>

      {status === "loading" && <p aria-live="polite" className="text-slate-300">{mode === "browse" ? "Stöbere …" : "Suche läuft …"}</p>}
      {status === "setup" && (
        <SetupNotice
          title="Suche nicht möglich"
          message="Die TMDb-API ist nicht konfiguriert (TMDB_API_KEY fehlt). Es werden keine Beispieltitel angezeigt."
        />
      )}
      {status === "error" && <SetupNotice title="Suche fehlgeschlagen" message={errorMsg} showSettingsLink={false} />}

      {status === "ok" && (
        <div className="flex flex-wrap items-center gap-2">
          <p aria-live="polite" className="text-sm text-slate-400">
            {filtered.length === 0
              ? "Keine Ergebnisse – passe Filter an (z. B. Zeitraum weiter fassen oder anderen Anbieter wählen)."
              : mode === "browse"
                ? `${filtered.length} Vorschlag/Vorschläge zum Stöbern.`
                : `${filtered.length} Ergebnis(se).`}
          </p>
          {filtered.length > 0 && (
            <button
              type="button"
              onClick={surprise}
              className="rounded-full border border-gold-400/50 px-4 py-1.5 text-sm font-bold text-gold-300"
            >
              Überrasch mich
            </button>
          )}
        </div>
      )}

      {status === "ok" && filtered.length > 0 && (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-6" aria-label="Suchergebnisse">
          {filtered.map((t) => (
            <li key={t.id}>
              <PosterCard title={t} onMyServices={onMineIds.has(t.id)} seen={prefs.seen.includes(t.id)} />
              {t.imdbId && typeof imdbById.get(t.id) === "number" && (
                <p className="mt-1 px-0.5 text-[11px] text-gold-300">IMDb ★ {(imdbById.get(t.id) as number).toFixed(1)}</p>
              )}
            </li>
          ))}
        </ul>
      )}
      {status === "ok" && filtered.length > 0 && (
        <div className="flex flex-wrap gap-1.5" aria-label="Anbieter-Legende">
          {[...new Set(filtered.flatMap((t) => t.availability.map((a) => a.provider_name)))].slice(0, 12).map((n) => (
            <ProviderBadge key={n} name={n} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function SuchePage() {
  return (
    <Suspense fallback={<p className="text-slate-300">Suche wird geladen …</p>}>
      <SucheInner />
    </Suspense>
  );
}
