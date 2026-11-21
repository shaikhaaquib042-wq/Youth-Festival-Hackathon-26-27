# Architecture & Engineering Decisions (ADR)

### ADR-001: Next.js App Router + React 18 + Bundled Font Packages
- **Decision**: Use Next.js 14.2 / React 18 with App Router, offline fontsource packages (`@fontsource-variable/space-grotesk`, `@fontsource-variable/dm-sans`, `@fontsource-variable/jetbrains-mono`), and MapLibre GL + deck.gl (`@deck.gl/core`, `@deck.gl/layers`, `@deck.gl/aggregation-layers`, `@deck.gl/mapbox`).
- **Alternatives**: React 19 (incompatible peer dependencies with current deck.gl v9 / Recharts v2). Google Fonts via `next/font/google` (fails offline).
- **Reason**: Guarantees zero peer-dependency conflicts, 100% offline styling support, and reliable MapboxOverlay integration.

### ADR-002: Blood Group Apportionment (300 Donors)
- **Decision**: Adjusted raw distribution percentages from (37+32+22+7+3 = 101%) to exact largest-remainder apportionment: O+ (108 = 36%), B+ (96 = 32%), A+ (66 = 22%), AB+ (21 = 7%), Negatives (9 = 3%: 3 O-, 2 A-, 2 B-, 2 AB-). Sum = exactly 300.
- **Alternatives**: Truncating O+ or leaving total at 303.
- **Reason**: SPEC §4 requires exactly 300 donors with at least 2 in each negative group.

### ADR-003: Pure Core with Injected Clock & PRNG
- **Decision**: Keep `lib/` 100% pure without `Date.now()`, `Math.random()`, or browser globals. Inject `Clock` and mulberry32 PRNG.
- **Alternatives**: Calling `Date.now()` inside matching/escalation functions.
- **Reason**: Required by SPEC §3 and SPEC §9 for deterministic replay, testability, and demo scrubbing.

### ADR-004: In-Memory & Atomic JSON File Persistence with Auto-Reseed Recovery
- **Decision**: Default to zero-dependency local JSON file persistence (`data/store.json`) with in-memory caching and automatic backup/restore upon file corruption.
- **Alternatives**: External PostgreSQL/SQLite binary requiring C++ native bindings.
- **Reason**: SPEC §2 hard constraint: must run fully locally with `npm install && npm run dev` without native build toolchains (like Python/node-gyp on Windows).

### ADR-005: Two-Factor Contact Masking & Zero-Knowledge Health Screen
- **Decision**: Phone numbers masked by default (`+91 98220 *****`). Contact revealed only upon mutual donor acceptance AND explicit clinician authorization. Transient self-check eligibility questionnaire is evaluated strictly in the client frame and never stored in state or sent to the backend.
- **Alternatives**: Plaintext phone broadcast or logging questionnaire responses.
- **Reason**: SPEC §8 privacy mandate: prevent public exposure of donor numbers and prevent medical questionnaire data leakage.

### ADR-006: Deck.gl MapboxOverlay with Non-Interleaved Layering & 2D Vector Fallback
- **Decision**: Use `MapboxOverlay` with `interleaved: false` using CARTO Dark Matter free OSM vector tiles, combined with `SvgMapFallback` wrapped in an ErrorBoundary.
- **Alternatives**: Interleaved WebGL layer sharing (causes context loss on certain GPU drivers).
- **Reason**: Rock-solid stability across consumer GPUs, laptops, and virtualized browser environments without WebGL crashes.

### ADR-007: Composite Ranking Score Formulation
- **Decision**: Four weighted components: Distance Proximity (0.45, exponential decay with 8km half-life), Exact Group Match (0.25), Reliability Score (0.20), and Historical Response Rate (0.10).
- **Alternatives**: Simple distance sorting.
- **Reason**: Prevents sending universal donors (O-) when exact-type donors (e.g. B+) are available nearby; prioritizes donors with verified donation records.

### ADR-008: Controlled Escalation Tiers with 35-Donor Cap & Rare Sweep
- **Decision**: 3 escalation tiers: Tier 1 (5 donors, <5km, 15m), Tier 2 (+10 donors, <10km, 30m), Tier 3 (+20 donors, <15km, 45m). Capped at 35 donors total. Rare blood groups (O-, A-, B-, AB-) bypass tier gates immediately with a 30km regional sweep.
- **Alternatives**: Uncapped broadcast.
- **Reason**: Solves donor fatigue and notification spam while ensuring life-critical rare blood requests receive immediate emergency outreach.

### ADR-009: Vitest Local Temp Directory for Windows Stability
- **Decision**: Set `process.env.TEMP` and `TMP` to `.vitest-temp` in `vitest.config.ts`.
- **Alternatives**: Default Windows `AppData/Local/Temp`.
- **Reason**: Completely avoids Windows `EPERM` permission locks on temporary SSR transform files.
