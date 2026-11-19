"use client";

import { groupProviders, type ProviderLike } from "@/lib/provider-groups";

interface Props {
  providers: ProviderLike[];
  services: number[];
  onToggle: (id: number) => void;
  /** Große TV-Buttons statt kompakter Liste. */
  large?: boolean;
}

export default function ProviderGroupList({ providers, services, onToggle, large }: Props) {
  const groups = groupProviders(providers);
  return (
    <ul className={large ? "space-y-3" : "grid gap-2 sm:grid-cols-2"} aria-label="Streaminganbieter">
      {groups.map((g) => {
        if (g.items.length === 1) {
          const p = g.items[0];
          const active = services.includes(p.provider_id);
          return (
            <li key={p.provider_id}>
              <button
                type="button"
                data-tv={large || undefined}
                onClick={() => onToggle(p.provider_id)}
                aria-pressed={active}
                className={
                  large
                    ? `tv-focusable flex w-full items-center justify-between rounded-3xl p-6 text-2xl font-bold ${active ? "bg-emerald-400 text-slate-900" : "bg-white text-slate-900"}`
                    : `flex w-full items-center justify-between gap-3 rounded-2xl border p-4 text-left font-semibold ${active ? "border-emerald-400 bg-emerald-400/10 text-white" : "border-white/10 bg-ink-800 text-slate-200"}`
                }
              >
                <span>{p.provider_name}</span>
                <span
                  aria-hidden
                  className={
                    large
                      ? ""
                      : `rounded-full px-3 py-1 text-xs font-bold ${active ? "bg-emerald-400 text-slate-900" : "bg-white/10 text-slate-300"}`
                  }
                >
                  {large ? (active ? "✓" : "○") : active ? "Ausgewählt ✓" : "Auswählen"}
                </span>
              </button>
            </li>
          );
        }
        const selected = g.items.filter((i) => services.includes(i.provider_id)).length;
        return (
          <li key={g.key}>
            <details
              className={
                large
                  ? "rounded-3xl bg-white p-6 text-slate-900"
                  : "rounded-2xl border border-white/10 bg-ink-800 p-4"
              }
            >
              <summary className={`flex cursor-pointer list-none items-center justify-between gap-3 font-semibold ${large ? "text-2xl font-bold" : "text-slate-200"}`}>
                <span>
                  {g.label}
                  <span className={`block text-xs font-normal ${large ? "text-slate-600" : "text-slate-400"}`}>
                    {g.items.length} Varianten · {selected} ausgewählt – aufklappen
                  </span>
                </span>
                <span
                  aria-hidden
                  className={
                    large
                      ? ""
                      : `rounded-full px-3 py-1 text-xs font-bold ${selected > 0 ? "bg-emerald-400 text-slate-900" : "bg-white/10 text-slate-300"}`
                  }
                >
                  {large ? (selected > 0 ? `✓ ${selected}/${g.items.length}` : `○ ${g.items.length}`) : selected > 0 ? `${selected}/${g.items.length} ✓` : `${g.items.length}`}
                </span>
              </summary>
              <div className={`mt-3 space-y-2 ${large ? "" : ""}`}>
                {g.items.map((p) => {
                  const active = services.includes(p.provider_id);
                  return (
                    <button
                      key={p.provider_id}
                      type="button"
                      data-tv={large || undefined}
                      onClick={() => onToggle(p.provider_id)}
                      aria-pressed={active}
                      className={
                        large
                          ? `tv-focusable flex w-full items-center justify-between rounded-2xl p-4 text-xl font-bold ${active ? "bg-emerald-400 text-slate-900" : "bg-slate-100 text-slate-900"}`
                          : `flex w-full items-center justify-between gap-3 rounded-xl border p-3 text-left text-sm font-semibold ${active ? "border-emerald-400 bg-emerald-400/10 text-white" : "border-white/10 bg-ink-950 text-slate-200"}`
                      }
                    >
                      <span>{p.provider_name}</span>
                      <span aria-hidden>{active ? "✓" : "○"}</span>
                    </button>
                  );
                })}
              </div>
            </details>
          </li>
        );
      })}
    </ul>
  );
}
