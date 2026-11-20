"use client";

// Räumliche D-Pad-Navigation für Fire TV (1080p / 65 Zoll):
// Pfeiltasten bewegen den Fokus geometrisch zum nächstgelegenen Element.
// Optimiert für große Schrift/Karten: großzügige Schwellen, stabiles Scrollen,
// Seitenwechsel mit PageUp/PageDown, Fokus nie verlieren.
import { useEffect } from "react";

function dialogScope(): HTMLElement | null {
  return document.querySelector<HTMLElement>('[role="dialog"]');
}

function visibleRect(el: HTMLElement): DOMRect | null {
  const r = el.getBoundingClientRect();
  if (r.width === 0 && r.height === 0) return null;
  if (el.hasAttribute("disabled")) return null;
  if (el.getAttribute("aria-hidden") === "true") return null;
  const style = window.getComputedStyle(el);
  if (style.visibility === "hidden" || style.display === "none") return null;
  return r;
}

function focusables(root: Document | HTMLElement): HTMLElement[] {
  // Wenn eine Film-Info offen ist, bleibt der Fokus darin.
  const scope = dialogScope();
  const queryRoot: Document | HTMLElement = scope ?? root;
  const els = Array.from(queryRoot.querySelectorAll<HTMLElement>("[data-tv]"));
  return els.filter((el) => visibleRect(el) !== null);
}

function center(r: DOMRect) {
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

function overlap(a: DOMRect, b: DOMRect, axis: "x" | "y"): number {
  if (axis === "x") {
    return Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
  }
  return Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
}

function bestInDirection(current: HTMLElement, dir: "up" | "down" | "left" | "right"): HTMLElement | null {
  const scope = dialogScope();
  const all = focusables(scope ?? document);
  const curRect = current.getBoundingClientRect();
  const c = center(curRect);
  let best: HTMLElement | null = null;
  let bestScore = Infinity;
  for (const el of all) {
    if (el === current) continue;
    const r = el.getBoundingClientRect();
    const p = center(r);
    const dx = p.x - c.x;
    const dy = p.y - c.y;
    // Großzügige Schwelle für 1080p: kleine Versätze zählen nicht als Richtung.
    const T = 24;
    if (dir === "right" && dx <= T) continue;
    if (dir === "left" && dx >= -T) continue;
    if (dir === "down" && dy <= T) continue;
    if (dir === "up" && dy >= -T) continue;
    let primary = 0;
    let secondary = 0;
    let alignedBonus = 0;
    if (dir === "right" || dir === "left") {
      primary = Math.abs(dx);
      secondary = Math.abs(dy);
      // Bevorzuge Elemente auf gleicher Zeile (Reihen-Navigation).
      alignedBonus = overlap(curRect, r, "y") > 16 ? -220 : 0;
    } else {
      primary = Math.abs(dy);
      secondary = Math.abs(dx);
      // Bevorzuge Elemente in gleicher Spalte (Rail-/Grid-Navigation).
      alignedBonus = overlap(curRect, r, "x") > 16 ? -220 : 0;
    }
    // Leicht gedehnte Achse: geradeaus ist wichtiger als diagonal.
    const score = primary + secondary * 3 + alignedBonus;
    if (score < bestScore) {
      bestScore = score;
      best = el;
    }
  }
  return best;
}

function ensureVisible(el: HTMLElement) {
  try {
    el.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
  } catch {
    // ignore
  }
  // Horizontale Reihe zusätzlich mitscrollen.
  let node: HTMLElement | null = el.parentElement;
  for (let i = 0; i < 4 && node; i++) {
    const style = window.getComputedStyle(node);
    if (style.overflowX === "auto" || style.overflowX === "scroll") {
      const r = el.getBoundingClientRect();
      const c = node.getBoundingClientRect();
      if (r.right > c.right) node.scrollBy({ left: r.right - c.right + 32, behavior: "smooth" });
      else if (r.left < c.left) node.scrollBy({ left: r.left - c.left - 32, behavior: "smooth" });
      break;
    }
    node = node.parentElement;
  }
}

export function useTvFocus(enabled: boolean, onBack?: () => void) {
  useEffect(() => {
    if (!enabled) return;
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const dirs: Record<string, "up" | "down" | "left" | "right"> = {
        ArrowUp: "up",
        ArrowDown: "down",
        ArrowLeft: "left",
        ArrowRight: "right"
      };
      const dir = dirs[e.key];
      if (dir) {
        const current =
          target && target.hasAttribute("data-tv") ? target : (document.activeElement as HTMLElement | null);
        if (current && current.hasAttribute?.("data-tv") && visibleRect(current)) {
          const next = bestInDirection(current, dir);
          if (next) {
            e.preventDefault();
            next.focus({ preventScroll: true });
            ensureVisible(next);
          } else {
            // Am Rand: kein Fokusverlust, kein Springen – optional sanft scrollen.
            e.preventDefault();
          }
        } else {
          const first = focusables(document)[0];
          if (first) {
            e.preventDefault();
            first.focus({ preventScroll: true });
            ensureVisible(first);
          }
        }
        return;
      }
      // Seitenweises Blättern auf langen Listen (Fire TV: oft Kanal+/-).
      if (e.key === "PageDown" || e.key === "PageUp") {
        const current = document.activeElement as HTMLElement | null;
        if (current && current.hasAttribute?.("data-tv")) {
          e.preventDefault();
          const delta = e.key === "PageDown" ? window.innerHeight * 0.8 : -window.innerHeight * 0.8;
          window.scrollBy({ top: delta, behavior: "smooth" });
        }
        return;
      }
      // Enter/Space auf TV-Fernbedienungen kommt als keydown – nativ behandeln lassen.
      if (e.key === "Escape" || e.key === "Backspace" || e.key === "GoBack") {
        if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) {
          // In Eingabefeldern erst Tastatur schließen lassen (2. Zurück schließt Dialog).
          if (document.activeElement === target) {
            (target as HTMLInputElement).blur();
            e.preventDefault();
            return;
          }
        }
        e.preventDefault();
        onBack?.();
      }
    };
    window.addEventListener("keydown", handler, { capture: false });
    return () => window.removeEventListener("keydown", handler);
  }, [enabled, onBack]);
}
