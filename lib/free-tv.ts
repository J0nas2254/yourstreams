// Ein virtueller Sammel-Dienst für kostenlose / werbefinanzierte Angebote.
// TMDb listet jeden Free-Anbieter einzeln (ARD, ZDF, Pluto, …). Damit die
// Auswahl übersichtlich bleibt, werden die einzeln gelisteten Free-Anbieter
// ausgeblendet und als ein Punkt „Free TV“ zusammengefasst (standardmäßig an).
// Echte Logik: ein Titel zählt als Free-TV-Treffer, sobald er mindestens einen
// Verfügbarkeits-Eintrag mit kind „free“ oder „ads“ hat – unabhängig von IDs.

export const FREE_TV_ID = -1;
export const FREE_TV_LABEL = "Free TV (kostenlos)";

const FREE_NAME_HINTS = [
  "ard",
  "zdf",
  "arte",
  "3sat",
  "joyn",
  "pluto",
  "plex",
  "tubi",
  "freevee",
  "rakuten",
  "wedotv",
  "youtube",
  "dailymotion",
  "rtl+",
  "rtl plus",
  "sat.1",
  "kabel",
  "prosieben",
  "vox",
  "mediathek"
];

/** Heuristik zum Ausblenden einzeln gelisteter Free-Anbieter aus der Auswahl. */
export function isKnownFreeProvider(providerName: string): boolean {
  const n = (providerName ?? "").toLowerCase();
  return FREE_NAME_HINTS.some((h) => n.includes(h));
}

export function filterFreeProviders<T extends { provider_name: string }>(list: T[]): T[] {
  return list.filter((p) => !isKnownFreeProvider(p.provider_name));
}

export function isFreeKind(kind: string): boolean {
  return kind === "free" || kind === "ads";
}
