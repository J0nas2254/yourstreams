// Ein virtueller Sammel-Dienst für rein kostenlose / werbefinanzierte Angebote.
// TMDb listet jeden Free-Anbieter einzeln (ARD, ZDF, Pluto, …). Damit die
// Auswahl übersichtlich bleibt, werden rein kostenlose Anbieter ausgeblendet
// und als ein Punkt „Free TV“ zusammengefasst (standardmäßig an).
//
// Wichtig: keine Namens-Heuristik (kein includes/substring). Es gilt eine
// genaue Liste: exakte TMDb-Provider-IDs plus exakte Provider-Namen.
// Bezahl-Varianten wie Joyn (304, 421) und RTL+ (2750, 2578) bleiben bewusst
// sichtbar, weil sie auch Abos haben – sie gehören NICHT in diese Liste.
//
// Echte Logik für Treffer: ein Titel zählt als Free-TV-Treffer, sobald er
// mindestens einen Verfügbarkeits-Eintrag mit kind „free“ oder „ads“ hat –
// unabhängig von IDs.

export const FREE_TV_ID = -1;
export const FREE_TV_LABEL = "Free TV (kostenlos)";

/** Exakte TMDb-IDs rein kostenloser Anbieter (keine Joyn-/RTL+-IDs!). */
const FREE_PROVIDER_IDS: ReadonlySet<number> = new Set([
  28, // Netzkino
  12, // Crackle
  73, // Tubi TV
  191, // Kanopy
  207, // The Roku Channel
  212, // Hoopla
  235, // YouTube Free (nicht YouTube 192)
  300, // Pluto TV
  332, // Fandango at Home Free
  538, // Plex
  613, // Amazon Prime Video Free with Ads (Freevee-Nachfolger)
  2077 // Plex Channel
]);

function normalizeName(name: string): string {
  return (name ?? "").toLowerCase().trim().replace(/\s+/g, " ");
}

/** Exakte TMDb-Anzeigenamen rein kostenloser Anbieter (kleingeschrieben). */
const FREE_PROVIDER_NAMES_EXACT: ReadonlySet<string> = new Set(
  [
    "ard mediathek",
    "zdf",
    "arte",
    "3sat",
    "pluto tv",
    "plex",
    "plex channel",
    "tubi tv",
    "freevee",
    "netzkino",
    "wedotv",
    "wedo tv",
    "youtube free",
    "dailymotion",
    "the roku channel",
    "roku channel",
    "hoopla",
    "kanopy",
    "crackle",
    "fandango at home free",
    "amazon prime video free with ads"
  ].map((n) => n.toLowerCase())
);

/**
 * Genau-Prüfung: true nur bei exakter ID oder exaktem Namen.
 * Joyn / Joyn Plus / RTL+ ergeben bewusst false und bleiben sichtbar.
 */
export function isKnownFreeProvider(providerName: string, providerId?: number): boolean {
  if (typeof providerId === "number" && FREE_PROVIDER_IDS.has(providerId)) return true;
  return FREE_PROVIDER_NAMES_EXACT.has(normalizeName(providerName));
}

export function filterFreeProviders<T extends { provider_id: number; provider_name: string }>(
  list: T[]
): T[] {
  return list.filter((p) => !isKnownFreeProvider(p.provider_name, p.provider_id));
}

export function isFreeKind(kind: string): boolean {
  return kind === "free" || kind === "ads";
}
