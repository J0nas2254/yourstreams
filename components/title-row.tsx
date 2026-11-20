"use client";

import { useRef, useState } from "react";
import type { Title } from "@/lib/types";
import PosterCard from "./poster-card";

export default function TitleRow({
  heading,
  titles,
  reasons,
  onMyServicesIds,
  seenIds,
  emptyText = "Keine Titel verfügbar."
}: {
  heading: string;
  titles: Title[];
  reasons?: Map<string, string>;
  onMyServicesIds?: Set<string>;
  seenIds?: Set<string>;
  emptyText?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  // Hooks immer vor dem frühen Return aufrufen (Rules of Hooks).
  const listRef = useRef<HTMLUListElement>(null);
  if (titles.length === 0) {
    return (
      <section aria-label={heading} className="mt-8">
        <h2 className="px-1 text-lg font-extrabold text-white sm:text-xl">{heading}</h2>
        <p className="mt-2 px-1 text-sm text-slate-400">{emptyText}</p>
      </section>
    );
  }

  function scrollByPage(dir: 1 | -1) {
    const el = listRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.max(el.clientWidth * 0.8, 300), behavior: "smooth" });
  }

  const preview = expanded ? titles : titles.slice(0, 20);

  return (
    <section aria-label={heading} className="mt-8">
      <div className="flex items-center justify-between gap-2 px-1">
        <h2 className="text-lg font-extrabold text-white sm:text-xl">{heading}</h2>
        <div className="flex shrink-0 items-center gap-2">
          {titles.length > 12 && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              aria-expanded={expanded}
              className="rounded-full border border-white/20 bg-white px-4 py-1 text-sm font-bold text-black hover:bg-neutral-200"
            >
              {expanded ? "Weniger" : `Mehr (${titles.length})`}
            </button>
          )}
          {!expanded && (
            <>
              <button
                type="button"
                onClick={() => scrollByPage(-1)}
                aria-label={`${heading}: nach links scrollen`}
                className="rounded-full border border-white/15 bg-neutral-900 px-3 py-1 text-lg font-bold text-white hover:bg-neutral-800"
              >
                ‹
              </button>
              <button
                type="button"
                onClick={() => scrollByPage(1)}
                aria-label={`${heading}: nach rechts scrollen`}
                className="rounded-full border border-white/15 bg-neutral-900 px-3 py-1 text-lg font-bold text-white hover:bg-neutral-800"
              >
                ›
              </button>
            </>
          )}
        </div>
      </div>
      {expanded ? (
        <ul className="sf-grid-all mt-4" aria-label={`${heading} – alle Titel`}>
          {titles.map((t) => (
            <li key={t.id} className="min-w-0">
              <PosterCard
                title={t}
                reason={reasons?.get(t.id)}
                onMyServices={onMyServicesIds?.has(t.id)}
                seen={seenIds?.has(t.id)}
              />
            </li>
          ))}
        </ul>
      ) : (
        <ul ref={listRef} className="no-scrollbar -mx-1 mt-3 flex snap-x gap-3 overflow-x-auto px-1 pb-2">
          {preview.map((t) => (
            <li key={t.id} className="shrink-0 snap-start">
              <PosterCard
                title={t}
                reason={reasons?.get(t.id)}
                onMyServices={onMyServicesIds?.has(t.id)}
                seen={seenIds?.has(t.id)}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
