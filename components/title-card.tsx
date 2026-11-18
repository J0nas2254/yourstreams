"use client";

import Link from "next/link";
import type { Title } from "@/lib/types";

export function SeenBadge({ seen }: { seen: boolean }) {
  if (!seen) return null;
  return (
    <span
      aria-label="Gesehen"
      className="inline-flex items-center gap-1 rounded-full bg-green-600 px-2 py-0.5 text-xs font-semibold text-white"
    >
      ✓ Gesehen
    </span>
  );
}

export function TitleCard({
  title,
  seen,
  onToggleSeen,
}: {
  title: Title;
  seen: boolean;
  onToggleSeen: () => void;
}) {
  const detailHref = `/titel/${encodeURIComponent(title.id)}`;
  return (
    <article className="rounded-xl border border-neutral-800 bg-neutral-900 p-3 focus-within:ring-2 focus-within:ring-green-500">
      <Link href={detailHref} data-tv className="block rounded focus:outline-none">
        {title.poster ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={title.poster}
            alt={title.title}
            className="aspect-[2/3] w-full rounded-lg object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex aspect-[2/3] w-full items-center justify-center rounded-lg bg-neutral-800 text-sm text-neutral-400">
            Kein Bild
          </div>
        )}
        <h3 className="mt-2 font-semibold leading-tight">{title.title}</h3>
      </Link>
      <div className="mt-1 flex items-center gap-2 text-sm text-neutral-300">
        <span>{title.kind === "movie" ? "Film" : "Serie"}</span>
        {typeof title.rating === "number" && <span>★ {title.rating.toFixed(1)}</span>}
        <SeenBadge seen={seen} />
      </div>
      <button
        type="button"
        data-tv
        onClick={onToggleSeen}
        aria-pressed={seen}
        className={`mt-2 w-full rounded-lg px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-green-400 ${
          seen ? "bg-neutral-700 text-white" : "bg-green-600 text-white"
        }`}
      >
        {seen ? "Als ungesehen markieren" : "Als gesehen markieren"}
      </button>
    </article>
  );
}
