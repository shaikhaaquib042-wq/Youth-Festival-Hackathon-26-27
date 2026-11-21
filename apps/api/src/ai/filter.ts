import { platforms } from "@raasta/data";
import { SITE_URL } from "@raasta/config";

const URL_RE = /https?:\/\/[^\s<>"'`)\]}]+/gi;
// Bare domains such as "example.gov.in/path". Requires a known-looking TLD to avoid hitting "e.g." or file names.
const BARE_RE = /\b(?:[a-z0-9-]+\.)+(?:gov\.in|nic\.in|org\.in|co\.in|in|com|org|net|gov|edu|io|app|info)\b(?:\/[^\s<>"'`)\]}]*)?/gi;
const TRAILING = /[.,;:!?]+$/;

function normalize(raw: string): string | undefined {
  try {
    const u = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    return `${u.hostname.toLowerCase().replace(/^www\./, "")}${u.pathname.replace(/\/+$/, "")}`;
  } catch {
    return undefined;
  }
}

function collectUrls(value: unknown, out: Set<string>): void {
  if (typeof value === "string") {
    if (/^https?:\/\//i.test(value)) {
      const n = normalize(value);
      if (n) out.add(n);
    }
  } else if (Array.isArray(value)) {
    for (const v of value) collectUrls(v, out);
  } else if (value && typeof value === "object") {
    for (const v of Object.values(value)) collectUrls(v, out);
  }
}

let cached: Set<string> | undefined;

/** Every URL that appears in platforms.json (plus the site itself), normalised for comparison. */
export function allowedUrlSet(extra: string[] = []): Set<string> {
  if (!cached) {
    cached = new Set<string>();
    collectUrls(platforms, cached);
    const site = normalize(SITE_URL);
    if (site) cached.add(site);
  }
  if (!extra.length) return cached;
  const s = new Set(cached);
  for (const e of extra) {
    const n = normalize(e);
    if (n) s.add(n);
  }
  return s;
}

const REMOVED = "[link removed]";

/** Strips any URL or bare domain that is not in the registry. Safe to call on text that ends at a whitespace boundary. */
export function filterUrls(text: string, allowed: Set<string> = allowedUrlSet()): string {
  const hosts = new Set([...allowed].map((a) => a.split("/")[0]));
  const check = (m: string): string => {
    const trail = TRAILING.exec(m)?.[0] ?? "";
    const core = trail ? m.slice(0, -trail.length) : m;
    const n = normalize(core);
    return n && allowed.has(n) ? m : REMOVED + trail;
  };
  let out = text.replace(URL_RE, check);
  out = out.replace(BARE_RE, (m) => {
    const n = normalize(m.replace(TRAILING, ""));
    if (!n) return m;
    // A bare domain is allowed only when it is itself in the registry (host alone or host plus path).
    return allowed.has(n) || (!n.includes("/") && hosts.has(n) && allowed.has(n)) ? m : REMOVED;
  });
  return out;
}

/**
 * Streaming wrapper: URLs are contiguous non-whitespace runs, so we only emit text up to the last whitespace and keep
 * the tail until more text (or the end) arrives. A URL can therefore never be split across two filtered pieces.
 */
export class StreamUrlFilter {
  private tail = "";
  constructor(private allowed: Set<string> = allowedUrlSet()) {}

  push(chunk: string): string {
    const s = this.tail + chunk;
    const m = /[\s]+(?=\S*$)/.exec(s);
    if (!m) {
      this.tail = s;
      return "";
    }
    const cut = m.index + m[0].length;
    this.tail = s.slice(cut);
    return filterUrls(s.slice(0, cut), this.allowed);
  }

  flush(): string {
    const out = filterUrls(this.tail, this.allowed);
    this.tail = "";
    return out;
  }
}
