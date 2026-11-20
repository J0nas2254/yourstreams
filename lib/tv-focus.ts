"use client";

// Räumliche D-Pad-Navigation für Fire TV: Pfeiltasten bewegen den Fokus
// geometrisch zum nächstgelegenen Element in Druckrichtung.
// Funktioniert ohne Touchscreen und ohne zusätzliche Abhängigkeiten.
import { useEffect } from "react";

function dialogScope(): HTMLElement | null {
  return document.querySelector<HTMLElement>('[role="dialog"]');
}

function focusables(root: Document | HTMLElement): HTMLElement[] {
  // Wenn eine Film-Info offen ist, bleibt der Fokus darin:
  // Hintergrund-Buttons sind dann nicht erreichbar und bewegen sich nicht mit.
  const scope = dialogScope();
  const queryRoot: Document | HTMLElement = scope ?? root;
  const els = Array.from(queryRoot.querySelectorAll<HTMLElement>("[data-tv]"));
  return els.filter((el) => {
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) return false;
    if (el.hasAttribute("disabled")) return false;
    const style = window.getComputedStyle(el);
    return style.visibility !== "hidden" && style.display !== "none";
  });
}

function center(r: DOMRect) {
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

function bestInDirection(current: HTMLElement, dir: "up" | "down" | "left" | "right"): HTMLElement | null {
  const scope = dialogScope();
  const all = focusables(scope ?? document);
  const c = center(current.getBoundingClientRect());
  let best: HTMLElement | null = null;
  let bestScore = Infinity;
  for (const el of all) {
    if (el === current) continue;
    const p = center(el.getBoundingClientRect());
    const dx = p.x - c.x;
    const dy = p.y - c.y;
    let primary = 0;
    let secondary = 0;
    if (dir === "right" && dx <= 8) continue;
    if (dir === "left" && dx >= -8) continue;
    if (dir === "down" && dy <= 8) continue;
    if (dir === "up" && dy >= -8) continue;
    if (dir === "right" || dir === "left") {
      primary = Math.abs(dx);
      secondary = Math.abs(dy);
    } else {
      primary = Math.abs(dy);
      secondary = Math.abs(dx);
    }
    const score = primary + secondary * 2.5;
    if (score < bestScore) {
      bestScore = score;
      best = el;
    }
  }
  return best;
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
        const current = target && target.hasAttribute("data-tv") ? target : document.activeElement as HTMLElement | null;
        if (current && current.hasAttribute?.("data-tv")) {
          const next = bestInDirection(current, dir);
          if (next) {
            e.preventDefault();
            next.focus({ preventScroll: true });
            next.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
            // Horizontale Reihe zusätzlich mitscrollen, falls scrollIntoView nur vertikal wirkt.
            const row = next.parentElement?.parentElement as HTMLElement | null;
            if (row && row.scrollBy) {
              const r = next.getBoundingClientRect();
              const c = row.getBoundingClientRect();
              if (r.right > c.right) row.scrollBy({ left: r.right - c.right + 24, behavior: "smooth" });
              else if (r.left < c.left) row.scrollBy({ left: r.left - c.left - 24, behavior: "smooth" });
            }
          }
        } else {
          const first = focusables(document)[0];
          if (first) {
            e.preventDefault();
            first.focus();
          }
        }
        return;
      }
      if (e.key === "Escape" || e.key === "Backspace") {
        if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;
        e.preventDefault();
        onBack?.();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [enabled, onBack]);
}
