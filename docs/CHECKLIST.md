# Pre-ship checklist

Status as of 2026-11-21. Legend: **pass**, **fixed** (found and fixed in the final pass), **n.a.**, **owner** (needs the owner).

## Function
| Item | Status |
|---|---|
| Live site: static pages on Pages, `/api/*` and `/r/*` on the Worker, same hostname | pass |
| Typed intake, tiles, guided questions, result, letter PDF, label, chat | pass |
| UPI fraud "just now" shows 1930 with no questions first | fixed |
| Violence never gets money questions; safety step first | pass |
| Small local AI shrugging ("other") falls back to the keyword table | fixed |
| One command local run that never contacts the hosted API (`npm run local`) | fixed |
| Works without JavaScript (plain forms post to `/r/*`) | pass |
| Plain-language step-by-step guide with highlighted links for every door that cannot take a direct API filing, in every state (36 states x 19 problems tested) | fixed |
| Guide links only from the registry (test fails on any URL key or phone number not in `packages/data`) | pass |
| Minimal questions: guided flows ask only what changes the route (73 to 53 questions), city skipped when known, one-tap GPS for place and nearby offices | fixed |
| Letter form shows required and prefilled fields first; optional extras folded | fixed |

## Quality
| Item | Status |
|---|---|
| 271 unit tests, 3 TypeScript projects clean | pass |
| Guides and guided questions translated into 11 languages (4,191 + 1,353 lines, each kept only if numbers and placeholders survive) | fixed |
| Dynamic pages follow the language of the static page the visitor came from | fixed |
| Ollama intake sweep (10 cases, 3 languages, local qwen3.5:4b) | pass 10/10 after fixes |
| Playwright journeys at 375/768/1280, no-JS, axe, static pages (`qa/agy`), against the local stack | pass: full run 160/168; the 8 failures were tests written for the old longer flows, updated, and the 3 affected specs rerun 38/38 (axe with reduced motion 21/21) |
| No horizontal scroll at 320 px (home, help, privacy, offices, legal aid, emergency, ur, flow) | pass |
| Privacy table at 320 px | fixed (scroll wrapper) |
| Header chips: accessible name contains the visible text (WCAG 2.5.3) | fixed |
| Help page contrast (QA pass 2) | n.a.: measured mid fade-in; settled colours are ink-600 on white (above 7:1) |
| Hydration errors (QA pass 2) | n.a. in production build (seen only on the dev server); zero console errors on the built site |
| JavaScript under 60 KB gzip first load, no em dashes, no console.log, no source maps (build guard) | pass |

## Security
See [SECURITY.md](SECURITY.md). CSP, HSTS, origin checks, rate and size limits, PII redaction, signed links, URL filter, npm audit clean: pass. Turnstile, WAF rule: **owner**.

## Content and truth
| Item | Status |
|---|---|
| URLs, fees, phones, deadlines only from `packages/data` | pass |
| No fake numbers, testimonials or logos | pass |
| Disclaimer on results | pass |
| Drafts never described as filings; demo sandbox labelled | pass |
| 12 languages complete; newest keys fall back to English | pass, native review **owner** |
| Privacy retention wording | **owner** |

## Owner actions
1. Sign in again to Antigravity (`agy`) so the Gemini QA pass can run (its login has expired).
2. Turnstile widget + `TURNSTILE_SECRET_KEY`.
3. WAF rate rule on `/api/*` and `/r/*`.
4. BHASHINI keys, DIGIT/UPYOG tenant credentials.
5. Native-speaker translation review; confirm privacy wording.
