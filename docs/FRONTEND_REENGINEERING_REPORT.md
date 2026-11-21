# SunShield frontend reengineering report

Historical rewrite report: subsequent full-stack integration has delivered and locally verified Developer B's real weather provider, live assessments/plans and compiled Safe Zone routing. Read [current release status](FINAL_RELEASE.md) and [actual HTTP/screenshots](release-evidence/README.md) for present integration readiness; earlier missing-provider descriptions below refer to the rewrite baseline.

## Outcome and scope

The frontend is now a native React/TypeScript application on feature/frontend-reengineering. All eleven product routes are migrated. The original frontend remains available at frontend-integration commit 8429fcb. No deployment was performed. The integrated frontend is verified for real health/HeatLab; the complete live-weather/database MVP remains blocked by unavailable backend composition and employer contracts.

The previous architecture concatenated HTML, used mutable global state and delegated DOM events, treated HeatLab as a placeholder, dropped critical recommendation meanings, and retained stale location state. The production dependency on all of those mechanisms has been removed.

## Architecture

- [Application](../frontend/src/app/) owns providers, nested router layouts, route-level lazy loading and error boundaries.
- [Profile context](../frontend/src/context/ProfileContext.tsx) owns validated worker preferences/language. [Storage recovery](../frontend/src/utils/storage.ts) rejects corrupt/incomplete records and tolerates unavailable storage.
- TanStack Query owns independent weather, assessment, plan and facility queries. Keys include the relevant full profile or location/filter inputs. Abort signals cancel obsolete requests. Mutations do not retry automatically.
- [Contract schemas](../frontend/src/schemas/contracts.ts) validate API boundaries and infer types. [API client](../frontend/src/services/client.ts) owns serialization, URL normalization, timeouts, cancellation, sanitized status errors and request references. [Queries/services](../frontend/src/services/queries.ts) preserve existing request/response contracts.
- [Feature modules](../frontend/src/features/) contain onboarding/profile controls, independent dashboard sections, protection timeline, Safe Zones/submissions/reports, SOS, HeatLab comparisons and employer drafts.
- [Shared presentation](../frontend/src/components/) contains accessible form controls, feedback, priority-aware safety components, lazy Recharts and React Leaflet components. API/user content is rendered as React text.
- [Three locale resources](../frontend/src/locales/) contain matching inventories of 245 keys: navigation, forms, statuses, all ten recommendation codes, factors, limitations, disclaimers, verification timestamps and emergency instructions. Hindi/Marathi wording still requires qualified human review.

## Visual and functional preservation

The original navy, amber and teal palette, card-based dashboard, split comparison, map/list arrangement, compact navigation and Plus Jakarta Sans identity are preserved. Noto Sans Devanagari supports Hindi/Marathi. The visual reference was the committed markup/CSS; no separate Stitch export or image assets existed in the inspected frontend tree. See [FEATURE_PARITY.md](FEATURE_PARITY.md) for the complete migration inventory, intentional replacements, verification and external dependencies.

The header retains emergency access on every route. Native forms preserve every worker input, progress/back/review/save, explicit city selection and one-shot GPS. GPS changes update the actual saved profile and query keys. City names never silently retain another city's coordinates. Supported city-center selection is currently Pune, Mumbai and New Delhi; GPS is available elsewhere. GPS timezone uses the device timezone and is displayed; coordinate-to-timezone lookup is not implemented.

The dashboard's weather, advisory and facilities load and fail independently. Missing metrics are shown as unavailable, never zero. Plans show source periods, partial boundaries, gaps, factors and limitations. Critical period actions are visible before expanding details. Safe Zone categories match Developer B; distances are approximate straight-line distances. Availability/opening status is never inferred from discovery data. Community forms send canonical fields but accurately show unavailable errors while routes are unmounted. No user can set verification status.

Employer screens are explicitly uncalculated worksite drafts. Workforce, worksite, workload and water/shade inputs can be reviewed locally; no employee tracking, savings, medical outcomes or protection plans are invented. No enterprise payload is sent without an agreed contract.

## Real HeatLab integration

The UI maps its worker/conditions to `{profile, weatherOverride}` and validates the response. Each scenario has independent pending/error/result state and cancellation. Changed inputs invalidate prior results; a late cancelled response cannot replace the latest one. Reset and simulation never modify saved worker preferences. No frontend risk algorithm, score or hardcoded advisory output is used.

With the actual unchanged backend at port 8000 and frontend at port 5173, Chromium verified:

| Same conditions: 35 C / 50% RH / 5 km/h | Heavy construction, direct sun, limited water, no shade | Light vendor, partial shade, available water/shade |
| --- | --- | --- |
| Overall advisory | CRITICAL | HIGH |
| Environmental advisory | HIGH | HIGH |
| Heat index | 40.68 C | 40.68 C |
| Visible action | Stop unsafe work and move away from exposure | Reduce strenuous activity; supervisor coordination |
| Data mode | SIMULATION | SIMULATION |

The same mandatory comparison passed a second time against Vite's production preview, using an explicitly configured local test API URL. Neither result represents permission to work or medical validation.

## Verification and security

Final executed results: frontend typecheck/lint passed; 46 Vitest tests passed; all 64 unchanged backend tests passed; 28 Chromium acceptance cases passed; the real-engine comparison also passed production preview. Ten requested viewport widths were exercised across all eleven routes, including populated chart/map/plan fixtures where actual services are unavailable. Automated axe checks passed on landing, HeatLab and SOS; this is not a formal WCAG compliance certification. Desktop/mobile HeatLab screenshots were visually inspected. A delayed-GPS callback regression also verifies that concurrent profile changes are not replaced by an older callback.

See [FRONTEND_TEST_REPORT.md](FRONTEND_TEST_REPORT.md) for commands, exact scope and limitations, and [FRONTEND_SECURITY_AUDIT.md](FRONTEND_SECURITY_AUDIT.md) for malicious-input checks, dependency results and deployment concerns. Production and full dependency audits reported zero known vulnerabilities at execution time. No security guarantee or Lighthouse score is claimed.

## Removed implementation and modified files

Removed 29 obsolete files, including legacyMarkup, the old App/event delegation layer, old CSS, DOM-driven profile hook, obsolete UI wrappers, placeholder-only services/types and old mocks. Their replacements are organized in the feature, schema, service, context and component folders above. The original files remain in the baseline Git history.

Additional changes include frontend package/lockfile, default API-mode environment template, test/typecheck/build configuration, Playwright acceptance suite, deployment example, README, locale resources and the requested reports. A path-by-path change inventory can be obtained with `git diff --name-status 8429fcb HEAD`; this includes the deliberate unchanged import of backend/docs, not changes to their engine logic. Developer B's root package, source, SQL, Prisma and infrastructure files remain byte-for-byte unchanged. Developer A's production backend and original tests remain unchanged relative to origin/feature/core-intelligence.

## Git and deployment

The branch starts from the existing frontend integration history. Commit f074b7f imports unchanged Developer A backend/docs from 7427c59 without merging unrelated histories. Commit 04e8449 adds native workflows and validated state. Commit 8c2d42b removes obsolete rendering and adds browser/security regressions. Final verification/documentation is saved in a subsequent commit. No shared branch was reset or rewritten; main and frontend-integration remain untouched.

[Vercel preparation](../frontend/vercel.json) provides SPA rewrites and security headers. Use frontend as the project root. Production defaults to same-origin /api/v1 unless an explicit API URL is supplied; it does not implicitly embed the development localhost URL. Set the real public HTTPS API URL and backend CORS origin before release. The header/CSP example requires validation on the selected host, including tightening connect-src to the actual API host. No hosting deployment or production credentials were used.

## Remaining blockers and known limits

1. Developer B's real WeatherProvider is absent. Live assessment/plan stay at intentional 503; GET /weather is not mounted.
2. Safe Zone services exist at repository root but are not mounted in the integrated Express app. Discovery/details/submissions/reports are UI/contract-ready, with real database behavior not verified. The existing search-limit and migration-alignment review findings remain pending.
3. Employer dashboard/planning contracts and APIs remain unimplemented. Draft UI is explicit; no invented payload or plan is sent.
4. Real deployment URL, HTTPS API, CORS/CSP and hosting verification remain team tasks. No incomplete rewrite has replaced a deployed demo.
5. Only Chromium was executed. Firefox/Safari, real-device assistive technology, native voice availability, clinical safety validation and qualified translation review remain unverified.
6. Maps/fonts rely on external resources. No PWA/full-offline guarantee is made. Emergency guidance is independent of backend requests while the frontend is available.
7. The main production JS chunk is near Vite's 500 kB warning threshold; charts and maps are lazy chunks. See the measured build figures in the test report. No invented performance improvement is claimed.

The frontend rewrite and real-engine HeatLab slice are implemented and verified. The full live occupational-protection MVP is not declared complete until its external integrations above are finished.
