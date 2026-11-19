"use client";

import { useRef } from "react";
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
  if (titles.length === 0) {
    return (
      <section aria-label={heading} className="mt-8">
        <h2 className="px-1 text-lg font-extrabold text-white sm:text-xl">{heading}</h2>
        <p className="mt-2 px-1 text-sm text-slate-400">{emptyText}</p>
      </section>
    );
  }
  const listRef = useRef<HTMLUListElement>(null);

  function scrollByPage(dir: 1 | -1) {
    const el = listRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.max(el.clientWidth * 0.8, 300), behavior: "smooth" });
  }

  return (
    <section aria-label={heading} className="mt-8">
      <div className="flex items-center justify-between gap-2 px-1">
        <h2 className="text-lg font-extrabold text-white sm:text-xl">{heading}</h2>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={() => scrollByPage(-1)}
            aria-label={`${heading}: nach links scrollen`}
            className="rounded-full border border-white/15 bg-ink-800 px-3 py-1 text-lg font-bold text-white hover:bg-ink-700"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={() => scrollByPage(1)}
            aria-label={`${heading}: nach rechts scrollen`}
            className="rounded-full border border-white/15 bg-ink-800 px-3 py-1 text-lg font-bold text-white hover:bg-ink-700"
          >
            ›
          </button>
        </div>
      </div>
      <ul ref={listRef} className="no-scrollbar -mx-1 mt-3 flex snap-x gap-3 overflow-x-auto px-1 pb-2">
        {titles.map((t) => (
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
    </section>
  );
}
