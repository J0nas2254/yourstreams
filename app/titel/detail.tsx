"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { Title } from "@/lib/types";
import { AVAILABILITY_LABELS, AVAILABILITY_ORDER } from "@/lib/types";
import { usePrefs } from "@/lib/store";
import { ApiError, apiTitle } from "@/lib/api.ts";
import { backdropUrl, posterUrl } from "@/lib/images";
import { KindBadge, ProviderBadge } from "@/components/badges";
import ImdbBadge from "@/components/imdb-badge";
import SetupNotice from "@/components/setup-notice";
import TitleActions from "@/components/title-actions";
import EpisodeTracker, { useSeriesEpisodes } from "@/components/episode-tracker";

export default function TitelDetail() {
  const params = useSearchParams();
  const id = params.get("id") ?? "";
  const [title, setTitle] = useState<(Title & { imdbId?: string | null }) | null>(null);
  const [status, setStatus] = useState<"loading" | "ok" | "setup" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const {
    prefs,
    toggleWatch,
    hasWatch,
    seen,
    toggleSeen,
    setInterest,
    seenEpisodes,
    toggleEpisodeSeen,
    setSeasonSeen,
    markSeriesSeen,
    unmarkSeries
  } = usePrefs();

  useEffect(() => {
    if (!id) {
      setStatus("error");
      setErrorMsg("Kein Titel ausgewählt.");
      return;
    }
    setStatus("loading");
    apiTitle(id)
      .then((t) => {
        setTitle(t);
        setStatus("ok");
      })
      .catch((e) => {
        if (e instanceof ApiError && e.notConfigured) setStatus("setup");
        else {
          setStatus("error");
          setErrorMsg(e instanceof Error ? e.message : "Titel konnte nicht geladen werden.");
        }
      });
  }, [id]);

  const isSeriesPending = title?.mediaType === "tv";
  const seasonsPending = isSeriesPending ? title?.tvInfo?.seasons ?? [] : [];
  const series = useSeriesEpisodes(
    id,
    isSeriesPending ? title?.tmdbId : undefined,
    seasonsPending
  );

  if (status === "loading") return <p className="text-slate-300">Titel wird geladen …</p>;
  if (status === "setup") {
    return <SetupNotice title="Titel nicht verfügbar" message="Die TMDb-API ist nicht konfiguriert (TMDB_API_KEY fehlt)." />;
  }
  if (status === "error" || !title) {
    return (
      <div className="space-y-3">
        <SetupNotice title="Titel nicht gefunden" message={errorMsg} showSettingsLink={false} />
        <Link href="/suche" className="font-semibold text-white underline">Zurück zur Suche</Link>
      </div>
    );
  }

  const grouped = AVAILABILITY_ORDER.map((kind) => ({
    kind,
    // Gleicher Anbieter ggf. mehrfach in der API-Antwort -> pro Art nur 1x zeigen.
    entries: title.availability
      .filter((a) => a.kind === kind)
      .filter((a, i, arr) => arr.findIndex((b) => b.provider_id === a.provider_id) === i)
  })).filter((g) => g.entries.length > 0);

  const bg = backdropUrl(title.backdropPath, "w1280");
  const poster = posterUrl(title.posterPath, "w342");
  const interest = prefs.interests[title.id] ?? null;
  const isSeries = title.mediaType === "tv";
  const seasons = seasonsPending;
  const { bySeason, loading, failed, loadSeason, loadAll } = series;
  const seenEpIds = seenEpisodes[title.id] ?? [];
  const fullySeen = seen.includes(title.id);

  const handleToggleSeen = async () => {
    if (fullySeen) {
      // Rückgängig: Serien-Status und alle Episoden-Markierungen entfernen (Filme: nur Flag)
      if (isSeries) unmarkSeries(title.id);
      else toggleSeen(title.id);
      return;
    }
    if (isSeries) {
      const all = await loadAll();
      markSeriesSeen(title.id, all.map((e) => e.id));
    } else {
      toggleSeen(title.id);
    }
  };

  const onToggleWatch = () =>
    toggleWatch(title.id, {
      title: title.title,
      year: title.year,
      mediaType: title.mediaType,
      posterPath: title.posterPath
    });

  return (
    <article className="space-y-4">
      <Link href="/suche" className="text-sm font-semibold text-slate-300 underline">← Zurück</Link>
      <div className="relative overflow-hidden rounded-3xl border border-white/10">
        {bg && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={bg} alt="" aria-hidden className="absolute inset-0 h-full w-full object-cover opacity-40" loading="lazy" />
        )}
        <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/70 to-transparent" />
        <div className="relative flex flex-col gap-5 p-5 sm:flex-row sm:p-8">
          <div className="w-36 shrink-0 sm:w-52">
            {poster ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={poster} alt={`Poster: ${title.title}`} loading="lazy" className="w-full rounded-2xl border border-white/10" />
            ) : (
              <div aria-hidden className="flex aspect-[2/3] w-full items-center justify-center rounded-2xl bg-ink-700 text-3xl font-black text-slate-500">
                {title.title.slice(0, 2).toUpperCase()}
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-glow text-2xl font-black text-white sm:text-4xl">{title.title}</h1>
            <p className="mt-1 text-sm text-slate-300">
              {title.year ?? "Jahr unbekannt"} · {title.mediaType === "tv" ? "Serie" : "Film"}
              {typeof title.voteAverage === "number" ? ` · TMDb ★ ${title.voteAverage.toFixed(1)}` : ""}
            </p>
            <div className="mt-2">
              <ImdbBadge imdbId={title.imdbId} />
            </div>
            <p className="mt-3 max-w-2xl text-slate-200">{title.overview || "Keine Beschreibung verfügbar."}</p>
            {title.genres.length > 0 && (
              <p className="mt-2 text-sm text-slate-300"><strong>Genres:</strong> {title.genres.join(", ")}</p>
            )}
            <div className="mt-4">
              <TitleActions
                title={title}
                watched={fullySeen}
                marked={hasWatch(title.id)}
                interest={interest}
                onToggleWatch={onToggleWatch}
                onToggleSeen={handleToggleSeen}
                onSetInterest={(dir) => setInterest(title.id, dir, title.genres)}
              />
            </div>
            {isSeries && seasons.length > 0 && (
              <div className="mt-2">
                <EpisodeTracker
                  title={title.title}
                  seasons={seasons}
                  seenEpisodeIds={seenEpIds}
                  fullySeen={fullySeen}
                  episodesBySeason={bySeason}
                  loadingSeasons={loading}
                  loadFailed={failed}
                  onLoadSeason={loadSeason}
                  onToggleEpisode={(epId) => toggleEpisodeSeen(title.id, epId)}
                  onMarkSeason={(epIds, v) => setSeasonSeen(title.id, epIds, v)}
                  onMarkAll={async () => {
                    const all = await loadAll();
                    markSeriesSeen(title.id, all.map((e) => e.id));
                  }}
                  onUnmarkAll={() => unmarkSeries(title.id)}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-white/10 bg-ink-800/60 p-5 sm:p-6">
        <h2 className="text-lg font-extrabold text-white">Verfügbarkeit in Deutschland (DE)</h2>
        <p className="mt-1 text-xs text-slate-400">
          Echte TMDb-Watch-Provider-Daten (u. a. von JustWatch). Angaben ohne Gewähr und können sich ändern.
        </p>
        {grouped.length === 0 ? (
          <p className="mt-3 text-sm text-slate-300">
            Für diesen Titel liegt aktuell keine Verfügbarkeit für DE vor – oder die Daten konnten nicht geladen werden.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {grouped.map((g) => (
              <li key={g.kind} className="rounded-2xl bg-ink-950/60 p-3">
                <div className="mb-2 flex items-center gap-2">
                  <KindBadge kind={g.kind} />
                  <span className="text-xs text-slate-400">{AVAILABILITY_LABELS[g.kind]}</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {g.entries.map((e, i) => {
                    const href = title.justWatchLink ?? `https://www.justwatch.com/de/Suche?q=${encodeURIComponent(title.title)}`;
                    return (
                      <a
                        key={`${e.provider_id}-${i}`}
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`${e.provider_name} bei JustWatch öffnen`}
                        title="Bei JustWatch öffnen"
                        className="underline decoration-dotted underline-offset-4"
                      >
                        <ProviderBadge name={`${e.provider_name} ↗`} />
                      </a>
                    );
                  })}
                </div>
              </li>
            ))}
          </ul>
        )}
        {title.justWatchLink ? (
          <p className="mt-4 text-sm">
            <a href={title.justWatchLink} target="_blank" rel="noopener noreferrer" className="font-bold text-sky-300 underline">
              Watch-Optionen beim Anbieter ansehen (externer Link aus der TMDb-API)
            </a>
          </p>
        ) : (
          <p className="mt-4 text-sm text-slate-400">
            Kein externer Anbieter-Link aus der API verfügbar – bitte direkt in der App des Anbieters suchen.
          </p>
        )}
        <p className="mt-2 text-xs text-slate-500">
          Videos werden nicht in StreamFinder abgespielt. Links stammen ausschließlich aus der API und werden nicht erfunden.
        </p>
      </div>
    </article>
  );
}
