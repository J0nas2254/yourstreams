// Echte TMDb-Bilder, passende Größen, Lazy-Loading.
// Fehlt ein Bild oder lädt es nicht, zeigt die UI einen neutralen Hintergrund –
// niemals ein erfundenes Ersatzposter.
const IMG_BASE = "https://image.tmdb.org/t/p";

export function posterUrl(path: string | null | undefined, size: "w342" | "w500" = "w342"): string | null {
  if (!path) return null;
  return `${IMG_BASE}/${size}${path}`;
}

export function backdropUrl(path: string | null | undefined, size: "w1280" | "original" = "w1280"): string | null {
  if (!path) return null;
  return `${IMG_BASE}/${size}${path}`;
}
