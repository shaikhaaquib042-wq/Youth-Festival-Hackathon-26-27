import { useEffect, useRef } from "react";

/**
 * The street of doors. At prerender the SVG from /public/img/street-of-doors.svg is inlined (if the file exists).
 * The client never bundles it: hydration keeps the server markup, and a client-side navigation fetches it once.
 */
const serverSvgs: Record<string, string> = import.meta.env.SSR
  ? (import.meta.glob("../../public/img/street-of-doors.svg", { query: "?raw", import: "default", eager: true }) as Record<string, string>)
  : {};
const SERVER_SVG = Object.values(serverSvgs)[0] ?? "";

export function StreetOfDoors({ id }: { id?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || el.querySelector("svg")) return;
    let cancelled = false;
    fetch("/img/street-of-doors.svg")
      .then((r) => (r.ok ? r.text() : ""))
      .then((txt) => {
        if (!cancelled && txt.includes("<svg") && !el.querySelector("svg")) el.innerHTML = txt;
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div
      ref={ref}
      id={id}
      className="door-street"
      data-street=""
      aria-hidden="true"
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: SERVER_SVG }}
    />
  );
}
