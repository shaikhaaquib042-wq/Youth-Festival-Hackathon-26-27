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
