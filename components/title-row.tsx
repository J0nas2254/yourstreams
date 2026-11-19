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
  return (
    <section aria-label={heading} className="mt-8">
      <h2 className="px-1 text-lg font-extrabold text-white sm:text-xl">{heading}</h2>
      <ul className="no-scrollbar -mx-1 mt-3 flex snap-x gap-3 overflow-x-auto px-1 pb-2">
        {titles.map((t) => (
          <li key={t.id}>
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
