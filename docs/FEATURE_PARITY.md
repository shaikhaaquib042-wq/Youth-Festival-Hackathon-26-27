# Frontend migration inventory

Current integration update: live weather, occupational assessment and hourly planning are now implemented and locally verified; Safe Zone routes are mounted but await authorized database configuration. The dependency column below records the original rewrite baseline. See [current release](FINAL_RELEASE.md) for present states.

Baseline: frontend-integration 8429fcb. Original source remains on that branch and in Git history. The rewrite uses the same navy/amber/teal identity, card-based dashboard, split HeatLab comparison, map/list layout, mobile navigation and Plus Jakarta Sans typography. No separate Stitch export or image assets were present beyond the existing markup/CSS; those files are the visual reference.

Design direction: restrained field intelligence, with a navy guidance card and amber environmental readout as the recognizable anchor. Feasibility assessment: impact 4, fit 5, feasibility 5, performance 4, consistency risk 3 (DFII 15). Existing brand requirements take precedence over the design skill's generic typography suggestions.

| Existing workflow / control | Native replacement | Acceptance / dependency |
| --- | --- | --- |
| Landing / dashboard entry | Public landing, WorkerLayout | Direct routes and back/forward |
| All 11 agreed routes | Router with worker/enterprise layouts and 404 | Refresh/deep-link checks |
| Three onboarding steps, back/continue/step buttons | OnboardingPage, WorkFields, LocationPicker | Valid complete profile only; review before save |
| Occupation, workload, exposure, water, shade, schedule, duties, times | Controlled labelled fields | Exact enums and same-day validation |
| Browser-stored profile, edit avatar/profile route | ProfileContext and profile form | Strict persisted-data recovery; unavailable storage tolerated |
| GPS button, manual city entry | One-shot location hook and explicit supported-city selection | Coordinates update profile/query keys; no label-only location |
| Dashboard weather, source, timestamp, forecast chart | Independent weather query/card/chart | Weather endpoint currently unavailable |
| Advisory, first-two recommendations, factor preview | AssessmentPanel and complete RecommendationList | Critical instructions never truncated |
| Listen guidance | SpeechButton | Supported-language voices only; text always present |
| Water/shade shortcuts | Safe Zone links with canonical category query | No fictional resource selection toast |
| Planner, timeline, explain buttons | ProtectionPage with expandable period details | Null/gap/partial-hour responses; API requires provider |
| Safe Zone map/list, search and all category filters | SafeZonesPage, FacilityCard, ZoneMap | Canonical categories, radius, verification, details and attribution |
| Available Now filter | Availability filter with explicit unsupported-data state | Discovery payload does not include availability; no false assertion |
| Facility directions | Validated OSM directions link | Exact facility/profile coordinates, safe HTTPS host |
| Recently Verified filter | VERIFIED plus actual lastVerifiedAt filter | Never infer verification |
| Facility detail and reporting | Detail panel and report form | Developer B route contract; currently unmounted |
| Add facility placeholder | Validated submission form | No client-supplied verification; honest 404/503 state |
| HeatLab all sliders, presets, occupation and condition fields | HeatLabPage with independent scenario mutations | Real POST /simulation/evaluate; no frontend scoring |
| HeatLab comparison and reset | Two native scenario cards and shared weather controls | Independent failures/results; identical weather on compare |
| Switch to live weather | Router link to worker dashboard | No live/simulation state mutation |
| English/Hindi/Marathi selector | Central i18next resources and LanguageSelect | Critical codes/factors/limitations; human review flagged |
| SOS button, 112, warnings and cooling instructions | EmergencyPage independent of profile/backend | Intentional tel:112 action; hydration restrictions retained |
| Employer dashboard/planner demonstration | EnterprisePage and draft worksite controls | Explicit pending API; no invented workforce outcomes |
| Retry / empty / loading toasts | Feature-scoped feedback components | No synthetic API fallback |
| Desktop navigation, mobile bottom navigation, footer | Declarative layout components | 48px primary controls, focus, responsive widths |

Intentional replacements: the obsolete fake water/shade selection toasts become actual filtered navigation; free-text city labels become supported coordinate selections; mock-only heat assessments become unavailable notices unless the real engine is used; employer contract placeholders remain explicit. Imperative rendering, generic safety-code fallbacks and untrusted HTML are removed only after their replacements are verified. Final per-feature verification is recorded in FRONTEND_TEST_REPORT.md.

## Final migration and verification status

Every production workflow in the inventory above now uses native React; the obsolete renderer, delegated handlers, old styles/hook/service/type wrappers were removed. Original behavior is preserved in commit 8429fcb. No required screen or control was silently discarded.

| Feature group | Implementation status | Verification | Backend dependency / known limit |
| --- | --- | --- | --- |
| All routes, desktop/mobile navigation, deep links and 404 | Migrated | Chromium at all ten widths; back/refresh/mobile/landscape checks | Static host rewrites prepared; deployed host unverified |
| Onboarding, all worker fields, steps/back/review/save/profile editing | Migrated | Runtime schemas, browser workflow/persistence, blocked-storage component test | Same-day schedules only |
| GPS, manual city selection and location query refresh | Migrated | Browser GPS/denial and exact coordinate assertions | Three explicit city centers; GPS uses displayed device timezone |
| Weather/source/timestamps/chart | Migrated UI | Nullable/schema/component tests; populated responsive fixtures | Real GET /weather unavailable; no fake live fallback |
| Advisory, every recommendation/factor/limitation, priorities and voice | Migrated | Actual engine CRITICAL/HIGH in Chromium; translation/security tests; unavailable-voice test | Qualified translation/voice-device review pending |
| Protection schedule/periods/explanation and gaps | Migrated UI | Contract validation and responsive partial-period fixture | Actual provider absent; full live forecast unverified |
| Safe Zone map/list/search/category/radius/verification/details/directions | Migrated UI | Canonical-schema/URL tests, browser filter/zoom, responsive populated map/list | Real routes unmounted; availability filter explicitly unsupported by discovery shape |
| Community suggestions/reports | Migrated forms | Strict payload/security tests; browser submission reports actual 404 honestly | Database integration and verification process remain server-owned |
| HeatLab controls/presets/two scenarios/reset/live navigation | Migrated | Real backend dev and production-preview comparison; validation/isolation/cancellation tests | Engine remains prototype, no medical clearance |
| SOS/112/warnings/cooling/fluid restriction | Migrated | Browser without profile/backend; language/keyboard checks; automated axe | No claim that a call has been placed automatically |
| Employer dashboard/planner | Migrated draft screens | Responsive routes and native draft controls reviewed | Enterprise contracts/API absent; no invented outputs |
| en/hi/mr and feedback/empty/error/retry states | Migrated | 245 matching translation keys; malicious/error/timeout/missing-data tests | Human language review and complete cross-browser audit pending |

Native source mapping plus representative tests cover the inventory; not every possible input combination is claimed to have been exercised. External-service placeholders are explicitly identified and remain the only incomplete live workflows.
