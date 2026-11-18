"use client";

import Link from "next/link";
import type { Prefs, Title } from "@/lib/types";

export function ContinueWatching({
  series,
  prefs,
}: {
  series: Title[];
  prefs: Prefs;
}) {
  // Teilweise gesehene Serien: gesehene Episoden vorhanden, aber Serie nicht als gesehen markiert
  const partial = series.filter((t) => {
    if (t.kind !== "tv") return false;
    if (prefs.seenIds.includes(t.id)) return false;
    return (prefs.seenEpisodes[t.id] ?? []).length > 0;
  });
  if (partial.length === 0) return null;
  return (
    <section aria-label="Weiterschauen" className="mt-8">
      <h2 className="text-xl font-bold">Weiterschauen</h2>
      <p className="text-sm text-neutral-400">
        Nächste noch nicht markierte Episode (manuelle Markierung, kein erkannter
        Wiedergabefortschritt).
      </p>
      <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {partial.map((t) => (
          <li key={t.id} className="rounded-xl border border-neutral-800 bg-neutral-900 p-3">
            <Link
              href={`/titel/${encodeURIComponent(t.id)}`}
              data-tv
              className="font-semibold focus:outline-none focus:ring-2 focus:ring-green-400 rounded"
            >
              {t.title}
            </Link>
            <p className="text-sm text-neutral-400">
              {(prefs.seenEpisodes[t.id] ?? []).length} Episode(n) als gesehen markiert
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
