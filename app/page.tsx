"use client";

import { useEffect, useState } from "react";
import { TitleCard } from "@/components/title-card";
import { ContinueWatching } from "@/components/continue-watching";
import { usePrefs } from "@/lib/use-prefs";
import { feedTitles } from "@/lib/prefs";
import type { Title } from "@/lib/types";

export default function StartPage() {
  const { prefs, toggleSeen, ready } = usePrefs();
  const [titles, setTitles] = useState<Title[]>([]);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/trending")
      .then(async (r) => {
        if (!r.ok) {
          const j = await r.json().catch(() => ({}));
          setNote(
            j.hint ??
              "Echte Daten erfordern TMDB_API_KEY (siehe .env.example). Keine Demo-Daten."
          );
          return [];
        }
        return r.json();
      })
      .then(setTitles)
      .catch(() =>
        setNote("Echte Daten erfordern TMDB_API_KEY (siehe .env.example).")
      );
  }, []);

  const feed = feedTitles(titles, prefs);
  const movies = feed.filter((t) => t.kind === "movie");
  const series = titles.filter((t) => t.kind === "tv");

  return (
    <div>
      <h1 className="text-2xl font-bold">Für dich</h1>
      <p className="text-sm text-neutral-400">
        Haushaltsprofil: {prefs.household} · Bereits gesehene Filme und vollständig gesehene
        Serien erscheinen hier nicht erneut. {ready ? "" : "(lädt …)"}
      </p>
      {note && (
        <p role="status" className="mt-3 rounded-lg bg-neutral-900 p-3 text-sm text-amber-300">
          {note}
        </p>
      )}
      <ContinueWatching series={series} prefs={prefs} />
      <h2 className="mt-8 text-xl font-bold">Filme</h2>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {movies.map((t) => (
          <TitleCard
            key={t.id}
            title={t}
            seen={prefs.seenIds.includes(t.id)}
            onToggleSeen={() => toggleSeen(t)}
          />
        ))}
      </div>
      <h2 className="mt-8 text-xl font-bold">Serien</h2>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {series
          .filter((t) => !prefs.seenIds.includes(t.id))
          .map((t) => (
            <TitleCard
              key={t.id}
              title={t}
              seen={prefs.seenIds.includes(t.id)}
              onToggleSeen={() => toggleSeen(t)}
            />
          ))}
      </div>
    </div>
  );
}
