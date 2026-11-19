import Link from "next/link";
import type { Title } from "@/lib/types";
import { backdropUrl } from "@/lib/images";
import { KindBadge, ProviderBadge } from "./badges";
import ImdbBadge from "./imdb-badge";

export default function Hero({ title, kicker }: { title: Title; kicker?: string }) {
  const bg = backdropUrl(title.backdropPath, "w1280");
  const providers = [...new Set(title.availability.map((a) => a.provider_name))].slice(0, 4);
  return (
    <section aria-label="Empfehlung des Tages" className="relative overflow-hidden rounded-3xl border border-white/10">
      <div className="relative aspect-[16/10] w-full sm:aspect-[21/8]">
        {bg ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={bg}
            alt=""
            aria-hidden
            className="absolute inset-0 h-full w-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        ) : null}
        <div aria-hidden className="absolute inset-0 bg-gradient-to-br from-ink-700 via-ink-900 to-ink-950" />
        <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/60 to-transparent" />
        <div aria-hidden className="absolute inset-0 bg-gradient-to-r from-ink-950/80 via-transparent to-transparent" />
        <div className="text-glow absolute bottom-0 left-0 max-w-2xl p-5 sm:p-8">
          {kicker && (
            <p className="mb-2 inline-block rounded-full bg-white/15 px-3 py-1 text-xs font-bold uppercase tracking-wider text-white">
              {kicker}
            </p>
          )}
          <h2 className="text-2xl font-black text-white sm:text-5xl">{title.title}</h2>
          <p className="mt-2 text-sm text-slate-200 sm:text-base">
            {title.year ?? "?"} · {title.mediaType === "tv" ? "Serie" : "Film"}
            {title.genres.length > 0 ? ` · ${title.genres.slice(0, 3).join(" · ")}` : ""}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {title.imdbId ? (
              <ImdbBadge imdbId={title.imdbId} />
            ) : typeof title.voteAverage === "number" ? (
              <span className="text-sm text-slate-200">TMDb ★ {title.voteAverage.toFixed(1)} / 10</span>
            ) : null}
          </div>
          <p className="mt-3 line-clamp-2 max-w-xl text-sm text-slate-200 sm:line-clamp-3 sm:text-base">
            {title.overview || "Keine Beschreibung verfügbar."}
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {[...new Set(title.availability.map((a) => a.kind))].map((k) => (
              <KindBadge key={k} kind={k} />
            ))}
            {providers.map((n) => (
              <ProviderBadge key={n} name={n} />
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href={`/titel?id=${encodeURIComponent(title.id)}`}
              className="rounded-full bg-white px-6 py-3 text-sm font-extrabold text-slate-900 sm:text-base"
            >
              Details & Watch-Optionen
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
