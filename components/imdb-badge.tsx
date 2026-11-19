"use client";

import { useEffect, useState } from "react";
import { apiImdbRating } from "@/lib/api.ts";

// Echte IMDb-Bewertung via OMDb – niemals als TMDb-Wert ausgeben, niemals erfinden.
export default function ImdbBadge({ imdbId, compact = false }: { imdbId: string | null | undefined; compact?: boolean }) {
  const [state, setState] = useState<{ status: "idle" | "loading" | "ok" | "empty" | "error"; rating?: number | null; votes?: string | null }>({
    status: "idle"
  });

  useEffect(() => {
    if (!imdbId) {
      setState({ status: "empty" });
      return;
    }
    setState({ status: "loading" });
    apiImdbRating(imdbId)
      .then((r) => {
        if (typeof r.rating === "number") setState({ status: "ok", rating: r.rating, votes: r.votes });
        else setState({ status: "empty" });
      })
      .catch(() => setState({ status: "error" }));
  }, [imdbId]);

  if (!imdbId || state.status === "empty") {
    return <span className="text-sm text-slate-400">Keine IMDb-Bewertung verfügbar</span>;
  }
  if (state.status === "loading" || state.status === "idle") {
    return <span className="text-sm text-slate-400">IMDb …</span>;
  }
  if (state.status === "error") {
    return <span className="text-sm text-slate-400">IMDb-Bewertung derzeit nicht verfügbar</span>;
  }
  return (
    <a
      href={`https://www.imdb.com/title/${imdbId}/`}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-1.5 rounded-lg bg-gold-400 font-extrabold text-slate-900 ${
        compact ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-sm"
      }`}
      aria-label={`IMDb-Bewertung ${state.rating} von 10, IMDb-Seite öffnen`}
    >
      <span className="text-[0.7em] font-black tracking-tight">IMDb</span>
      <span>★ {state.rating?.toFixed(1)}</span>
      {state.votes && !compact && <span className="font-semibold text-slate-700">({state.votes})</span>}
    </a>
  );
}
