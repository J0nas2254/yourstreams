"use client";

import type { Title } from "@/lib/types";

export default function TitleActions({
  title,
  watched,
  marked,
  interest,
  onToggleWatch,
  onToggleSeen,
  onSetInterest,
  tvMode = false
}: {
  title: Title;
  watched: boolean;
  marked: boolean;
  interest: "up" | "down" | null;
  onToggleWatch: () => void;
  onToggleSeen: () => void;
  onSetInterest: (dir: "up" | "down" | null) => void;
  tvMode?: boolean;
}) {
  const focus = tvMode ? { "data-tv": true } : {};
  const btn = "rounded-full px-4 py-2 text-sm font-bold transition";
  return (
    <div className="flex flex-wrap gap-2" aria-label={`Aktionen für ${title.title}`}>
      <button
        type="button"
        {...focus}
        onClick={onToggleWatch}
        aria-pressed={marked}
        className={`${btn} ${marked ? "bg-white text-slate-900" : "bg-white/15 text-white"}`}
      >
        {marked ? "✓ Gemerkt" : "+ Merken"}
      </button>
      <button
        type="button"
        {...focus}
        onClick={onToggleSeen}
        aria-pressed={watched}
        aria-label={watched ? `${title.title} als ungesehen markieren` : `${title.title} als gesehen markieren`}
        className={`${btn} ${watched ? "bg-emerald-400 text-slate-900" : "bg-white/15 text-white"}`}
      >
        {watched ? "✓ Gesehen" : "Als gesehen markieren"}
      </button>
      <button
        type="button"
        {...focus}
        onClick={() => onSetInterest(interest === "up" ? null : "up")}
        aria-pressed={interest === "up"}
        className={`${btn} ${interest === "up" ? "bg-gold-400 text-slate-900" : "bg-white/15 text-white"}`}
      >
        {interest === "up" ? "♥ Interessiert mich" : "Interessiert mich"}
      </button>
      <button
        type="button"
        {...focus}
        onClick={() => onSetInterest(interest === "down" ? null : "down")}
        aria-pressed={interest === "down"}
        className={`${btn} ${interest === "down" ? "bg-red-400 text-slate-900" : "bg-white/15 text-white"}`}
      >
        {interest === "down" ? "✕ Nicht interessiert (rückgängig? erneut tippen)" : "Nicht interessiert"}
      </button>
    </div>
  );
}
