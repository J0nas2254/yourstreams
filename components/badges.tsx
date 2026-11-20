import { AVAILABILITY_LABELS, type AvailabilityKind } from "@/lib/types";

// Monochrom-Premium: alle Badges in Schwarz/Weiß/Grau statt Bunt.
const KIND_STYLES: Record<AvailabilityKind, string> = {
  flatrate: "bg-white text-black border-white",
  free: "bg-neutral-200 text-black border-neutral-200",
  ads: "bg-neutral-800 text-white border-neutral-600",
  rent: "bg-neutral-900 text-white border-neutral-600",
  buy: "bg-black text-white border-neutral-500"
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
    <span className="inline-flex items-center rounded-md bg-neutral-900 border border-white/15 px-2 py-1 text-xs font-semibold text-white">
      {name}
    </span>
  );
}
