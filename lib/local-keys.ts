// Private API-Schlüssel-Eingabe auf dem Gerät (kein Commit, kein Bundle).
// Die Werte liegen nur im localStorage dieses Geräts und werden pro Anfrage
// als Header an das eigene Backend mitgeschickt. Server-Env bleibt vorrangig.
"use client";

export const LOCAL_TMDB_KEY = "sf:tmdb-key:v1";
export const LOCAL_OMDB_KEY = "sf:omdb-key:v1";

export function getLocalTmdbKey(): string {
  if (typeof window === "undefined") return "";
  try {
    return (window.localStorage.getItem(LOCAL_TMDB_KEY) ?? "").trim();
  } catch {
    return "";
  }
}

export function getLocalOmdbKey(): string {
  if (typeof window === "undefined") return "";
  try {
    return (window.localStorage.getItem(LOCAL_OMDB_KEY) ?? "").trim();
  } catch {
    return "";
  }
}

export function setLocalApiKeys(tmdbKey: string, omdbKey: string) {
  const t = (tmdbKey ?? "").trim();
  const o = (omdbKey ?? "").trim();
  try {
    if (t) window.localStorage.setItem(LOCAL_TMDB_KEY, t);
    else window.localStorage.removeItem(LOCAL_TMDB_KEY);
    if (o) window.localStorage.setItem(LOCAL_OMDB_KEY, o);
    else window.localStorage.removeItem(LOCAL_OMDB_KEY);
  } catch {
    // Speicher blockiert: still weitermachen
  }
}

export function clearLocalApiKeys() {
  try {
    window.localStorage.removeItem(LOCAL_TMDB_KEY);
    window.localStorage.removeItem(LOCAL_OMDB_KEY);
  } catch {
    // ignorieren
  }
}
