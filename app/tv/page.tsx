"use client";

import { useEffect, useState } from "react";
import { TitleCard } from "@/components/title-card";
import { ContinueWatching } from "@/components/continue-watching";
import { usePrefs } from "@/lib/use-prefs";
import { applySeenFilter } from "@/lib/prefs";
import type { SeenFilter, Title } from "@/lib/types";

export default function TvPage() {
  const { prefs, toggleSeen } = usePrefs();
  const [titles, setTitles] = useState<Title[]>([]);
  const [seenFilter, setSeenFilter] = useState<SeenFilter>("all");
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/trending")
      .then(async (r) => {
        if (!r.ok) {
          const j = await r.json().catch(() => ({}));
          setNote(j.hint ?? "Echte Daten erfordern TMDB_API_KEY.");
          return [];
        }
        return r.json();
      })
      .then((all: Title[]) => setTitles(all.filter((t) => t.kind === "tv")))
      .catch(() => setNote("Echte Daten erfordern TMDB_API_KEY."));
  }, []);

  const filtered = applySeenFilter(titles, prefs, seenFilter);

  return (
    <div>
      <h1 className="text-2xl font-bold">Serien</h1>
      <label className="mt-2 flex items-center gap-2 text-sm">
        Filter:
        <select
          data-tv
          value={seenFilter}
          onChange={(e) => setSeenFilter(e.target.value as SeenFilter)}
          className="rounded bg-neutral-900 px-2 py-1"
        >
          <option value="all">Alle</option>
          <option value="seen">Gesehen</option>
          <option value="unseen">Noch nicht gesehen</option>
        </select>
      </label>
      {note && (
        <p role="status" className="mt-3 rounded-lg bg-neutral-900 p-3 text-sm text-amber-300">
          {note}
        </p>
      )}
      <ContinueWatching series={titles} prefs={prefs} />
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {filtered.map((t) => (
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
