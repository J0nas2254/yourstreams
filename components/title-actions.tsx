"use client";

import type { Title } from "@/lib/types";

export function TitleActions({
  title,
  seen,
  inWatchlist,
  onToggleSeen,
  onToggleWatchlist,
  tvMode = false,
}: {
  title: Title;
  seen: boolean;
  inWatchlist: boolean;
  onToggleSeen: () => void;
  onToggleWatchlist: () => void;
  tvMode?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        data-tv
        onClick={onToggleSeen}
        aria-pressed={seen}
        className={`rounded-lg px-4 py-2 font-semibold focus:outline-none focus:ring-2 focus:ring-green-400 ${
          seen ? "bg-neutral-700 text-white" : "bg-green-600 text-white"
        }`}
      >
        {seen
          ? tvMode
            ? "Als ungesehen markieren"
            : "Als ungesehen markieren"
          : tvMode
            ? "Als gesehen markieren"
            : "Als gesehen markieren"}
      </button>
      <button
        type="button"
        data-tv
        onClick={onToggleWatchlist}
        aria-pressed={inWatchlist}
        className="rounded-lg bg-neutral-800 px-4 py-2 font-semibold text-white focus:outline-none focus:ring-2 focus:ring-green-400"
      >
        {inWatchlist ? "Von Merkliste entfernen" : "Auf Merkliste"}
      </button>
      <span className="sr-only">
        {title.kind === "movie" ? "Film" : "Serie"}: {title.title}
      </span>
    </div>
  );
}
