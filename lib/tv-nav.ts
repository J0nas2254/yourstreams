"use client";

/** Einfache Fire-TV-Fernbedienungs-Navigation: Pfeiltasten bewegen den Fokus zwischen [data-tv] Elementen. */
export function initTvNav() {
  if (typeof window === "undefined") return () => {};
  const onKey = (e: KeyboardEvent) => {
    const focusables = Array.from(
      document.querySelectorAll<HTMLElement>("[data-tv]")
    ).filter((el) => !el.hasAttribute("disabled") && el.offsetParent !== null);
    if (focusables.length === 0) return;
    const active = document.activeElement as HTMLElement | null;
    const idx = active ? focusables.indexOf(active) : -1;
    const cols = 4;
    let next = -1;
    if (e.key === "ArrowRight") next = idx < 0 ? 0 : (idx + 1) % focusables.length;
    else if (e.key === "ArrowLeft")
      next = idx < 0 ? 0 : (idx - 1 + focusables.length) % focusables.length;
    else if (e.key === "ArrowDown") next = idx < 0 ? 0 : (idx + cols) % focusables.length;
    else if (e.key === "ArrowUp")
      next = idx < 0 ? 0 : (idx - cols + focusables.length) % focusables.length;
    else return;
    e.preventDefault();
    focusables[next]?.focus();
  };
  window.addEventListener("keydown", onKey);
  return () => window.removeEventListener("keydown", onKey);
}
