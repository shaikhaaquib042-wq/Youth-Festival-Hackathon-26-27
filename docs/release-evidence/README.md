# Actual local release evidence

## Database closure: current actual verification

Authorized configuration was supplied in the ignored local environment file. Developer A independently verified Supabase connectivity, one applied migration/up-to-date status, an empty read-only database/schema diff, and **three facilities (all DEMO), zero reports, zero VERIFIED facilities**. No migration, seed, reset or actual write was performed. Earlier files and timestamps below are preserved as historical evidence.

- [Closure HTTP matrix and actual responses](closure-http-smoke.json): read endpoints and HeatLab return 200; Safe Zone reads no longer return credential-related 503. Disabled-write guards still return 503 and invalid inputs return 422.
- [Read-only database/CLI test evidence](closure-database-verification.json): validation, generation, empty schema diff, counts and full root suite **23 passing (22 infrastructure + one actual database test)**. Connection diagnostics are redacted; no connection values are included.
- [Actual API and browser checks](closure-safe-zone-browser.json): exclusion/inclusion, radius, nearest ordering/limit, category, details, loading and verification semantics. A separate UI-only 503 fixture is explicitly distinguished.
- [Actual loaded DEMO map](safe-zones-database-map.png): three stored DEMO records, not verified resources.
- [Actual existing DEMO details](safe-zone-detail-demo.png).
- [Actual default empty real-resource discovery](safe-zones-real-empty.png).
- [Earlier-in-capture map loading state](safe-zones-database-demo.png), preserved; use the loaded-map image for presentation.
- [Current verification](verification.json) and [preserved pre-database summary](verification-pre-database.json).

The existing user/manual-started compiled application was verified through HTTP; the earlier blocked agent startup is not retroactively marked successful. Public deployment and physical-device testing remain unverified. Writes remain false and actual isolated writes are untested. Current weather sample was 21.1 C / 54% / 2.9 km/h, observed at 23:00 IST; older weather screenshots retain original timestamps/labels.

## Preserved earlier integration evidence

Captured from the running integrated application, with mocks disabled, on 21 November 2026. These are local browser screenshots and HTTP responses, not a public deployment or simulated external-service success. The worker profile is an explicit demonstration profile at Pune city-center coordinates; weather is actual Open-Meteo data.

[Exact changed-file inventory since acceptance snapshot 5f26712](changed-files.txt).

- [HTTP status matrix and actual JSON bodies](http-smoke.json): health/weather/assessment/three schedule-type plans/HeatLab, Safe Zone storage failure, disabled-write guards, invalid inputs and documentation availability. No database write was performed.
- [Original actual LIVE-to-CACHED capture](live-cache-check.json): weather-integration milestone provenance, preserving original fetch/observation timestamps. This was captured before Safe Zone composition and is not a claim that the later blocked production-mode root restart succeeded.
- [Actual dashboard](live-dashboard.png): source/cache/observation timestamp, occupational guidance and honest unavailable Safe Zone card.
- [Actual weather](live-weather.png): Open-Meteo observation and hourly chart. CACHED means a retained real observation, not a simulation; do not hide that label.
- [Actual protection plan](live-plan.png): today's requested shift, real hourly data and estimated guidance; not a certified work-rest plan.
- [Actual HeatLab](heatlab-simulation.png): real engine HTTP comparison with SIMULATION and all limitations. Inputs 35 C / 50% / 5 km/h; outputs 40.68 C, CRITICAL construction and HIGH vendor.
- [Actual Safe Zone unavailable state](safe-zones-unavailable.png): storage credentials unavailable to Developer A, not an invented real-resource map.

At capture, Pune observations were 21.5 C / 51% / 5 km/h, observed 22:15 IST. Cool actual conditions returned CAUTION and no reported heat index outside the established envelope. No threshold was changed to produce a presentation result. API values and timestamps naturally change; see each captured response for provenance.

The older files in this historical section did not establish database connectivity. New closure evidence above independently establishes read-only Supabase results. Neither phase establishes verified real resources, medical safety, measured impact, actual write success or public deployment. See [the current release handoff](../FINAL_RELEASE.md).
