# Frontend security audit

Subsequent integration note: Developer B's provider and corrected Safe Zone code are now reviewed/composed, with default-disabled writes, bounded/sanitized storage failures and unchanged engine safety. Actual weather/assessment/plan verification and current database/deployment limits are in [the release report](FINAL_RELEASE.md). The earlier audit below retains its original execution scope and is not a new security certification.

Root/backend production dependency review additionally found the Prisma/Effect ReDoS chain, addressed through an exact Effect 3.22.1 override per [the reviewed advisory](https://github.com/advisories/GHSA-7589-6fvf-x4pw). Fresh root/backend production audits each returned zero reported vulnerabilities after that patch; Prisma was not downgraded. No new frontend dependency changed.

Scope: the rewritten frontend and its integration boundary, 21 November 2026. This is an engineering audit and regression record, not a guarantee that the application is completely secure.

## Corrections verified

| Prior issue | Correction and evidence |
| --- | --- |
| String-generated HTML and community-name injection | Production uses JSX text nodes. Facility names/addresses, comments, city labels, source strings and request references remain inert in actual component/browser rendering tests. No arbitrary HTML execution path is retained. |
| Generic wording replaced stop-work action | Every existing recommendation code has en/hi/mr text. CRITICAL stop-work wording and priority pass real-backend browser tests; hydration restrictions are shown with guidance. Unknown codes get an explicit conservative fallback. |
| Mutable hidden profile/location state | Validated React context, complete persisted-profile validation and profile/location query keys; browser GPS tests prove dependent requests change coordinates. Corrupt/blocked storage is tolerated. |
| Unchecked API casts and raw server errors | Critical response schemas reject malformed data. HTTP errors expose localized safe messages/status and a request reference, not private backend messages. A malicious error body is tested. |
| Arbitrary external URLs | Directions are generated only from validated coordinates and an allowlisted HTTPS OpenStreetMap host. Credentials, javascript/data schemes and unrelated hosts are rejected. New tabs use noopener/noreferrer. |
| Silent mock fallback | API mode is the default. Mocks require VITE_USE_MOCKS=true, are visibly labelled and never substitute a failed engine response. The frontend contains no heat-advisory calculator. |
| Obsolete responses winning a race | Query cancellation and scenario AbortControllers; a browser race test proves an old cancelled scenario cannot replace a newer result. |
| Public verification assignment | Strict submission schema does not permit verificationStatus; a browser test checks the outgoing payload. Success requires the backend to return PENDING. |

## Static inspection

Production-source searches found no legacyMarkup, legacyState, dangerouslySetInnerHTML, innerHTML, outerHTML, insertAdjacentHTML, eval call, obsolete ContractUnavailableError or data-action delegation. Test payloads intentionally contain malicious strings. Leaflet's static OpenStreetMap copyright attribution is library-supported trusted attribution, not interpolated user HTML.

No application database credentials or service-role secrets are referenced by frontend source. Only the public API URL and explicit mock switch are frontend configuration. Final build inspection checks for accidental localhost API defaults and secret identifiers. Profiles remain in local browser storage; location is requested only by an intentional one-shot action. UI profile requirements are not authentication or authorization.

Frontend Zod validation explicitly uses its supported jitless setting, disabling runtime parser code generation. The actual production-preview HeatLab test passed with the prepared script CSP enforced. For that local HTTP-only run, the preview policy permits the exact localhost:8000 test backend and omits HTTPS upgrading; those test exceptions do not change the production Vercel policy.

## Dependency audit

Both `npm audit --omit=dev --json` and `npm audit --json` returned zero reported vulnerabilities at execution time. No audit fix --force was used. The test tool versions were chosen to retain the existing React/Vite stack and avoid an incompatible jest-dom/Vitest peer combination. Temporary npm 11.6.2 worked around the installed npm 11.4.1 resolver bug; the lockfile is committed.

## Deployment controls and residual risk

The prepared Vercel configuration includes nosniff, referrer policy, frame restrictions, permissions policy and a CSP. It has not been deployed or validated against a real host. Inline styles are allowed for Leaflet/Recharts; scripts remain self-hosted. connect-src currently allows HTTPS services and should be narrowed to the actual backend hostname before release. Backend CORS/HTTPS and server-side validation remain mandatory.

Backend services must enforce validation, rate limits, database access and verification controls; frontend checks do not replace them. Developer B's database/Safe Zone findings were not fixed by this frontend-only rewrite. Real Supabase access, backend authorization/operational security, deployed headers, third-party tile/font availability, human translations and medical validity remain outside the verified scope. The CSP and passing regression tests do not eliminate all possible vulnerabilities.
