"use client";

import { useEffect, useState } from "react";
import { TitleActions } from "@/components/title-actions";
import { EpisodeTracker } from "@/components/episode-tracker";
import { SeenBadge } from "@/components/title-card";
import { usePrefs } from "@/lib/use-prefs";
import { countSeenEpisodes } from "@/lib/prefs";
import type { Title, TvEpisode } from "@/lib/types";

export function DetailClient({ id }: { id: string }) {
  const decoded = decodeURIComponent(id);
  const { prefs, toggleSeen, toggleEpisode, setSeason, markAll, unmarkAll, toggleWatchlist } =
    usePrefs();
  const [title, setTitle] = useState<Title | null>(null);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/title/${encodeURIComponent(decoded)}`)
      .then(async (r) => {
        if (!r.ok) {
          const j = await r.json().catch(() => ({}));
          setNote(j.hint ?? "Echte Daten erfordern TMDB_API_KEY.");
          return null;
        }
        return r.json();
      })
      .then(setTitle)
      .catch(() => setNote("Titel konnte nicht geladen werden."));
  }, [decoded]);

  if (note && !title) {
    return (
      <p role="status" className="rounded-lg bg-neutral-900 p-4 text-amber-300">
        {note}
      </p>
    );
  }
  if (!title) return <p>Lädt (echte Daten) …</p>;

  const seen = prefs.seenIds.includes(title.id);
  const inWatchlist = prefs.watchlist.includes(title.id);
  const seenEps = prefs.seenEpisodes[title.id] ?? [];

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row">
        {title.poster && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={title.poster} alt={title.title} className="w-48 rounded-xl" />
        )}
        <div>
          <h1 className="text-2xl font-bold">
            {title.title} <SeenBadge seen={seen} />
          </h1>
          <p className="mt-1 text-sm text-neutral-400">
            {title.kind === "movie" ? "Film" : "Serie"}
            {typeof title.rating === "number" && ` · TMDb ★ ${title.rating.toFixed(1)}`}
            {title.genres?.length ? ` · ${title.genres.join(", ")}` : ""}
            {title.providers?.length ? ` · ${title.providers.join(", ")}` : ""}
          </p>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed">{title.overview}</p>
          <div className="mt-4">
            <TitleActions
              title={title}
              seen={seen}
              inWatchlist={inWatchlist}
              onToggleSeen={() => toggleSeen(title)}
              onToggleWatchlist={() => toggleWatchlist(title.id)}
              tvMode={title.kind === "tv"}
            />
          </div>
          {title.kind === "tv" && (
            <p className="mt-2 text-sm text-neutral-400">
              {countSeenEpisodes(prefs, title.id)} Episode(n) als gesehen markiert.
            </p>
          )}
        </div>
      </div>

      {title.kind === "tv" && (
        <EpisodeTracker
          title={title}
          seenEpisodes={seenEps}
          onToggleEpisode={(s, e) => toggleEpisode(title.id, s, e)}
          onSetSeason={(s, eps: TvEpisode[], v) => setSeason(title.id, s, eps, v)}
          onMarkAll={(keys) => markAll(title, keys)}
          onUnmarkAll={() => unmarkAll(title.id)}
        />
      )}
      <p className="mt-4 text-xs text-neutral-500">
        Status bleibt nach Neustart erhalten (lokal, Schlüssel sf:prefs:v2, passend zum
        Haushaltsprofil).
      </p>
    </div>
  );
}
