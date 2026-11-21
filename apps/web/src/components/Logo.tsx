import { LOGO_ARCH_WIDTH, LOGO_COLORS as C, LOGO_PATHS as P, LOGO_VIEWBOX } from "@raasta/config";

/** The Raasta mark (shared definition in packages/config/src/logo.ts). */
export function Logo({ size = 36, className = "sh-logo-mark" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox={LOGO_VIEWBOX} aria-hidden="true" focusable="false" className={className}>
      <path d={P.inner} fill={C.inner} />
      <path d={P.road} fill={C.road} />
      <circle cx={P.sun.cx} cy={P.sun.cy} r={P.sun.r} fill={C.sun} />
      <path d={P.arch} fill="none" stroke={C.arch} strokeWidth={LOGO_ARCH_WIDTH} strokeLinecap="round" />
    </svg>
  );
}
