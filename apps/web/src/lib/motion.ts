/** True only on devices that can afford motion: enough memory, no reduced-motion, no Save-Data. */
export function canAnimate(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
    const nav = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
    if (typeof nav.deviceMemory === "number" && nav.deviceMemory < 2) return false;
    if (nav.connection?.saveData) return false;
    if (typeof Element === "undefined" || typeof Element.prototype.animate !== "function") return false;
    return true;
  } catch {
    return false;
  }
}

export function loadFramer() {
  return import("framer-motion/dom");
}

const EASE = [0.16, 1, 0.3, 1] as const;

/** Short dotted path sweep plus content rise (y 16 to 0). Only used on client navigations. */
export async function runPageTransition(content: HTMLElement | null, sweepPath: SVGPathElement | null): Promise<void> {
  if (!content || !canAnimate()) return;
  try {
    const { animate } = await loadFramer();
    animate(content, { opacity: [0, 1], y: [16, 0] }, { duration: 0.42, ease: EASE });
    if (sweepPath) {
      const svg = sweepPath.ownerSVGElement;
      if (svg) animate(svg, { opacity: [0, 1, 0] }, { duration: 0.52, ease: "linear" });
      animate(sweepPath, { strokeDashoffset: [1, 0] }, { duration: 0.52, ease: EASE });
    }
  } catch {
    /* motion is optional */
  }
}
