export const EMAIL_URL_LIMIT = 1800;
export const ATTACH_NOTE = "Full letter attached, please attach the downloaded file.";

export interface EmailArgs {
  to: string | string[];
  cc?: string | string[];
  subject: string;
  body: string;
}

export interface EmailLink {
  url: string;
  trimmed: boolean;
}

function list(x?: string | string[]): string {
  if (!x) return "";
  return (Array.isArray(x) ? x : [x]).map((s) => s.trim()).filter(Boolean).join(",");
}

const enc = (s: string) => encodeURIComponent(s);
const crlf = (s: string) => s.replace(/\r?\n/g, "\r\n");

/** Shortens the body to a summary plus the attach note until the URL fits. */
function fit(args: EmailArgs, make: (body: string) => string): EmailLink {
  const full = make(crlf(args.body));
  if (full.length <= EMAIL_URL_LIMIT) return { url: full, trimmed: false };

  const body = args.body.trim();
  let lo = 0;
  let hi = body.length;
  const attempt = (n: number) => {
    let cut = body.slice(0, n);
    const sp = cut.lastIndexOf(" ");
    if (n < body.length && sp > 40) cut = cut.slice(0, sp);
    const text = `${cut.trimEnd()}...\n\n${ATTACH_NOTE}`;
    return crlf(text);
  };
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (make(attempt(mid)).length <= EMAIL_URL_LIMIT) lo = mid;
    else hi = mid - 1;
  }
  const text = lo > 0 ? attempt(lo) : crlf(ATTACH_NOTE);
  return { url: make(text), trimmed: true };
}

export function buildMailto(args: EmailArgs): EmailLink {
  const to = list(args.to).split(",").map(enc).join(",");
  const cc = list(args.cc).split(",").filter(Boolean).map(enc).join(",");
  return fit(args, (body) => {
    const q = [`subject=${enc(args.subject)}`, `body=${enc(body)}`];
    if (cc) q.unshift(`cc=${cc}`);
    return `mailto:${to}?${q.join("&")}`;
  });
}

export function buildGmail(args: EmailArgs): EmailLink {
  return fit(args, (body) =>
    `https://mail.google.com/mail/?view=cm&to=${enc(list(args.to))}&cc=${enc(list(args.cc))}&su=${enc(args.subject)}&body=${enc(body)}`);
}

export function buildOutlook(args: EmailArgs): EmailLink {
  return fit(args, (body) =>
    `https://outlook.office.com/mail/deeplink/compose?to=${enc(list(args.to))}&cc=${enc(list(args.cc))}&subject=${enc(args.subject)}&body=${enc(body)}`);
}

/** wa.me link. The number may include +, spaces or dashes; only digits are kept. */
export function buildWhatsApp(number: string, text: string): string {
  const digits = number.replace(/\D/g, "");
  return `https://wa.me/${digits}?text=${enc(text)}`;
}
