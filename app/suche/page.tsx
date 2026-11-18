"use client";

import { useState } from "react";
import { TitleCard } from "@/components/title-card";
import { usePrefs } from "@/lib/use-prefs";
import { applySeenFilter } from "@/lib/prefs";
import type { SeenFilter, Title } from "@/lib/types";

export default function SuchePage() {
  const { prefs, toggleSeen } = usePrefs();
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<"all" | "movie" | "tv">("all");
  const [provider, setProvider] = useState("all");
  const [seenFilter, setSeenFilter] = useState<SeenFilter>("all");
  const [results, setResults] = useState<Title[]>([]);
  const [note, setNote] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function search(e?: React.FormEvent) {
    e?.preventDefault();
    setLoading(true);
    setNote(null);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setResults([]);
        setNote(j.hint ?? "Suche fehlgeschlagen. Echte Daten erfordern TMDB_API_KEY.");
        return;
      }
      const data: Title[] = await res.json();
      setResults(data);
    } finally {
      setLoading(false);
    }
  }

  let filtered = results.filter((t) =>
    kind === "all" ? true : t.kind === kind
  );
  if (provider !== "all") {
    filtered = filtered.filter((t) => t.providers?.includes(provider));
  }
  filtered = applySeenFilter(filtered, prefs, seenFilter);

  const providers = Array.from(new Set(results.flatMap((t) => t.providers ?? [])));

  return (
    <div>
      <h1 className="text-2xl font-bold">Suche</h1>
      <form onSubmit={search} className="mt-3 flex flex-wrap gap-2">
        <input
          data-tv
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Film oder Serie suchen (echte Daten)"
          aria-label="Suche"
          className="min-w-0 flex-1 rounded-lg bg-neutral-900 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-400"
        />
        <button
          type="submit"
          data-tv
          className="rounded-lg bg-green-600 px-4 py-2 font-semibold focus:outline-none focus:ring-2 focus:ring-green-400"
        >
          Suchen
        </button>
      </form>

      <div className="mt-3 flex flex-wrap gap-2 text-sm">
        <label className="flex items-center gap-1">
          Typ:
          <select
            data-tv
            value={kind}
            onChange={(e) => setKind(e.target.value as typeof kind)}
            className="rounded bg-neutral-900 px-2 py-1"
          >
            <option value="all">Filme + Serien</option>
            <option value="movie">Nur Filme</option>
            <option value="tv">Nur Serien</option>
          </select>
        </label>
        <label className="flex items-center gap-1">
          Anbieter:
          <select
            data-tv
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
            className="rounded bg-neutral-900 px-2 py-1"
          >
            <option value="all">Alle</option>
            {providers.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-1">
          Gesehen:
          <select
            data-tv
            value={seenFilter}
            onChange={(e) => setSeenFilter(e.target.value as SeenFilter)}
            className="rounded bg-neutral-900 px-2 py-1"
          >
            <option value="all">Alle</option>
            <option value="seen">Nur gesehene</option>
            <option value="unseen">Noch nicht gesehen</option>
          </select>
        </label>
      </div>

      {loading && <p className="mt-3 text-sm">Suche läuft (echte TMDb-Daten) …</p>}
      {note && (
        <p role="status" className="mt-3 rounded-lg bg-neutral-900 p-3 text-sm text-amber-300">
          {note}
        </p>
      )}

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {filtered.map((t) => (
          <TitleCard
            key={t.id}
            title={t}
            seen={prefs.seenIds.includes(t.id)}
            onToggleSeen={() =>
              toggleSeen(t)
            }
          />
        ))}
      </div>
    </div>
  );
}
