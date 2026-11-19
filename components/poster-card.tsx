import Link from "next/link";
import type { Title } from "@/lib/types";
import { posterUrl } from "@/lib/images";


function initials(title: string): string {
  return title
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0] ?? "")
    .join("")
    .toUpperCase();
}

export default function PosterCard({
  title,
  reason,
  onMyServices,
  seen,
  extra
}: {
  title: Title;
  reason?: string;
  onMyServices?: boolean;
  seen?: boolean;
  extra?: React.ReactNode;
}) {
  const src = posterUrl(title.posterPath, "w342");
  return (
    <article className="group w-36 max-w-full shrink-0 snap-start sm:w-44">
      <Link
        href={`/titel?id=${encodeURIComponent(title.id)}`}
        aria-label={`${title.title} – Details ansehen`}
        className="block overflow-hidden rounded-2xl border border-white/10 bg-ink-800 transition duration-200 group-focus-within:scale-[1.04] hover:scale-[1.04] focus-visible:scale-[1.04] focus-visible:border-sky-300"
      >
        <div className="relative aspect-[2/3] w-full">
          {src ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={src}
              alt={`Poster: ${title.title}`}
              loading="lazy"
              className="h-full w-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          ) : null}
          <div
            aria-hidden={!src}
            className={`absolute inset-0 flex items-center justify-center bg-gradient-to-br from-ink-700 to-ink-900 ${
              src ? "hidden" : ""
            }`}
          >
            <span className="px-2 text-center text-3xl font-black text-slate-500">{initials(title.title)}</span>
          </div>
          {onMyServices && (
            <span className="absolute left-2 top-2 rounded-full bg-emerald-500 px-2 py-0.5 text-[11px] font-bold text-white">
              Deine Dienste
            </span>
          )}
          {seen && (
            <span className="absolute bottom-2 left-2 rounded-full bg-ink-950/85 px-2 py-0.5 text-[11px] font-bold text-emerald-300">
              ✓ Gesehen
            </span>
          )}
        </div>
      </Link>
      <div className="mt-2 px-0.5">
        <h3 className="truncate text-sm font-bold text-white">
          <Link href={`/titel?id=${encodeURIComponent(title.id)}`} className="hover:underline">
            {title.title}
          </Link>
        </h3>
        <p className="text-xs text-slate-400">
          {title.year ?? "?"} · {title.mediaType === "tv" ? "Serie" : "Film"}
        </p>
        {typeof title.voteAverage === "number" && (
          <p className="mt-1 text-xs text-slate-400" aria-label={`TMDb-Bewertung ${title.voteAverage.toFixed(1)} von 10`}>
            TMDb ★ {title.voteAverage.toFixed(1)}
          </p>
        )}
        {reason && <p className="mt-1 text-[11px] leading-snug text-gold-300">{reason}</p>}
        {extra}
      </div>
    </article>
  );
}
