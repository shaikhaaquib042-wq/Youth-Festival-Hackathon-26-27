// The Raasta mark, in one place: a doorway arch framing a road that winds up to a rising sun ("raasta" means "the way").
// Used by the website header, the Worker page header, the landing chat avatar and favicon.svg (a test keeps them in sync).
export const LOGO_VIEWBOX = "0 0 48 48";
export const LOGO_PATHS = {
  /** inside of the doorway */
  inner: "M9 44V21a15 15 0 0 1 30 0v23z",
  /** the road: wide at the step, narrowing and winding to the horizon */
  road: "M13.5 44C15.5 35.5 29.5 33.5 26.6 26.6C25.2 23.2 22.3 21.9 23.4 18.6H24.8C24.3 21.6 27.9 22.8 29.8 26.4C33.6 33.6 22.5 36.2 31 44Z",
  /** the doorway arch, drawn as a stroke */
  arch: "M9 44V21a15 15 0 0 1 30 0v23",
  sun: { cx: 24, cy: 14, r: 2.7 },
} as const;
export const LOGO_COLORS = { inner: "#E3F4EA", road: "#E56420", arch: "#2D7341", sun: "#FFB547" } as const;
export const LOGO_ARCH_WIDTH = 4.4;

/** Full SVG markup. */
export function logoSvg(size = 36, cls = "sh-logo-mark"): string {
  const p = LOGO_PATHS;
  const c = LOGO_COLORS;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="${LOGO_VIEWBOX}" aria-hidden="true" focusable="false" class="${cls}"><path d="${p.inner}" fill="${c.inner}"/><path d="${p.road}" fill="${c.road}"/><circle cx="${p.sun.cx}" cy="${p.sun.cy}" r="${p.sun.r}" fill="${c.sun}"/><path d="${p.arch}" fill="none" stroke="${c.arch}" stroke-width="${LOGO_ARCH_WIDTH}" stroke-linecap="round"/></svg>`;
}
