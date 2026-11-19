import { AVAILABILITY_LABELS, type AvailabilityKind } from "@/lib/types";

const KIND_STYLES: Record<AvailabilityKind, string> = {
  flatrate: "bg-emerald-100 text-emerald-900 border-emerald-300",
  free: "bg-sky-100 text-sky-900 border-sky-300",
  ads: "bg-amber-100 text-amber-900 border-amber-300",
  rent: "bg-violet-100 text-violet-900 border-violet-300",
  buy: "bg-slate-200 text-slate-900 border-slate-300"
};

export function KindBadge({ kind }: { kind: AvailabilityKind }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${KIND_STYLES[kind]}`}
    >
      {AVAILABILITY_LABELS[kind]}
    </span>
  );
}

export function ProviderBadge({ name }: { name: string }) {
  return (
    <span className="inline-flex items-center rounded-md bg-slate-900 px-2 py-1 text-xs font-semibold text-white">
      {name}
    </span>
  );
}
