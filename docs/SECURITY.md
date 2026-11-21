# Security

Raasta stores almost nothing and treats every input as hostile. This page lists what is in place and what only the owner can do.

## In place

| Area | Measure |
|---|---|
| Headers | Strict CSP on every page (script hashes computed at build into `dist/_headers`; no inline style attributes), HSTS `max-age=31536000; includeSubDomains`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, frame-ancestors none |
| Requests | Every POST must come from an allowed Origin (or Referer). Production allows only `https://raasta.safalmutha.in`; local origins exist only in `apps/api/wrangler.local.jsonc` |
| Size limits | 4 KB forms, 16 KB JSON API and documents, 64 KB for the no-JS chat page |
| Rate limits | Workers rate-limit bindings: chat 20/min, forms 5/min, translate 60/min |
| Validation | zod schemas on every body and query; generic error messages; no stack traces to clients |
| Personal data | Aadhaar, PAN, phone, card, account and OTP-like numbers are masked (`packages/rules` redact) before any AI call or log. Logs record provider name and error only, never prompts or bodies |
| Links | Result links are HMAC-signed tokens that expire in 7 days. AI output passes a URL filter: only URLs from the verified registry or this site survive |
| Prompt injection | The chat answers from the route and registry only; history is client-supplied, so the server re-grounds every turn and filters output links |
| JSON-LD | `<` escaped as `<` so structured data cannot close the script tag |
| Dependencies | `npm audit --omit=dev`: 0 vulnerabilities (zod 4.6.7) |
| Secrets | Only in Worker secrets or git-ignored `.dev.vars` / `.env`; a secret scan runs before every push |
| Local runs | Use simulated KV/D1 and never contact the hosted API |

<!-- ## Owner actions

1. Keep `TOKEN_SECRET` set on the Worker (rotate it if it ever leaks; old result links then stop working).
2. Turnstile: create a free widget for `raasta.safalmutha.in`, set `TURNSTILE_SECRET_KEY` on the Worker and the site key in the web build. Forms skip the check until then.
3. WAF: a rate-limiting rule on `/api/*` and `/r/*` in the Cloudflare dashboard as a second layer.
4. Confirm the privacy page wording (12-month retention for feedback, grievance contact through /feedback).
5. BHASHINI and DIGIT/UPYOG credentials when available; until then the demo sandbox is clearly labelled. -->
