// Gruppiert TMDb-Anbieter-Varianten (z. B. „Netflix“ + „Netflix basic with Ads“,
// „Amazon Prime Video“ + „Amazon Video“ + „… with Ads“ / „… Amazon Channel“),
// damit die Auswahl nicht 6x denselben Markennamen zeigt.
// Exakte IDs/Namen bleiben erhalten – es wird nur die Anzeige gruppiert.

export interface ProviderLike {
  provider_id: number;
  provider_name: string;
}

export interface ProviderGroup {
  key: string;
  label: string;
  items: ProviderLike[];
}

function stripVariantSuffix(name: string): string {
  let s = (name ?? "").trim();
  // „Basic/Standard with Ads“ am Ende entfernen (Netflix, Disney+, Prime …)
  s = s.replace(/\s+((basic|standard)\s+)?with\s+ads\s*$/i, "").trim();
  // Channel-Varianten auf Marke zurückführen („Paramount+ Amazon Channel“)
  s = s.replace(/\s+(amazon|apple\s*tv|roku)\s+channel\s*$/i, "").trim();
  // Einzelnes „Channel“ am Ende (z. B. „Plex Channel“) entfernen
  s = s.replace(/\s+channel\s*$/i, "").trim();
  return s || (name ?? "").trim();
}

function normalizeBase(name: string): string {
  return stripVariantSuffix(name)
    .toLowerCase()
    .replace(/\+/g, " plus ")
    .replace(/[^a-z0-9äöüß ]+/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\bplus\b/g, "+");
}

/** Gruppen-Schlüssel für einen Anbieternamen (nur Anzeige, keine Filterlogik). */
export function providerGroupKey(name: string): string {
  return normalizeBase(name);
}

/** Gruppiert Anbieter; Einzel-Anbieter bleiben eigene Gruppe mit 1 Eintrag. */
export function groupProviders<T extends ProviderLike>(list: T[]): Array<{ key: string; label: string; items: T[] }> {
  const map = new Map<string, T[]>();
  for (const p of list) {
    const key = providerGroupKey(p.provider_name) || p.provider_name.toLowerCase();
    const arr = map.get(key);
    if (arr) arr.push(p);
    else map.set(key, [p]);
  }
  const groups: ProviderGroup[] & Array<{ key: string; label: string; items: T[] }> = [];
  for (const [key, items] of map) {
    const sorted = [...items].sort((a, b) => a.provider_name.localeCompare(b.provider_name, "de"));
    // Label: häufigste gestrippte Variante, bei Gleichstand die kürzeste.
    const counts = new Map<string, { label: string; n: number }>();
    for (const it of sorted) {
      const label = stripVariantSuffix(it.provider_name);
      const k = label.toLowerCase();
      const e = counts.get(k);
      if (e) e.n += 1;
      else counts.set(k, { label, n: 1 });
    }
    const label =
      [...counts.values()].sort((a, b) => b.n - a.n || a.label.length - b.label.length)[0]?.label ??
      sorted[0].provider_name;
    groups.push({ key, label, items: sorted });
  }
  groups.sort((a, b) => a.label.localeCompare(b.label, "de"));
  return groups;
}
