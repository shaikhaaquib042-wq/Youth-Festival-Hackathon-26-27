# SunShield frontend

Native React, strict TypeScript and Vite frontend. TanStack Query owns server state; validated React context owns worker preferences. All heat advisories come from the existing backend engine. Production rendering contains no legacy HTML generator or mutable global profile state.

## Start locally

Use Node.js 24. In one terminal:

```powershell
npm ci
npm --prefix backend ci
npm run build
cd backend
npm run dev
```

In another terminal from the repository root:

```powershell
cd frontend
npm ci
Copy-Item .env.example .env.local
npm run dev -- --host localhost
```

Open http://localhost:5173. Default API URL is http://localhost:8000/api/v1 and mocks default to false. Health and HeatLab are independent; real Open-Meteo dashboard/assessment/planning are integrated. Local authorized Safe Zone storage is now configured and independently read-only verified: real-resource discovery is empty, while explicit DEMO inclusion shows three unverified demonstration records. Community writes remain disabled. Do not put database credentials or service-role keys in frontend environment files. Backend deployment requires repository-root infrastructure and both dependency trees; see the [release handoff](../docs/FINAL_RELEASE.md).

HeatLab makes independent real POST /simulation/evaluate requests for each scenario. Its initial 35 C / 50% / 5 km/h comparison should display the actual prototype CRITICAL construction and HIGH vendor advisories with equal environmental indicators. These outputs are not calculated or hardcoded in React. Simulation does not modify the saved worker profile.

## Routes and architecture

Landing, onboarding, worker dashboard/plan/profile, Safe Zones/discovery/submission, SOS, HeatLab and both employer routes are preserved, with nested layouts and a custom 404. Emergency assistance is independent of profile/backend availability. Employer screens are explicitly uncalculated drafts pending an agreed API.

- [app](src/app/): router/providers/error boundaries.
- [features](src/features/): native workflow components.
- [schemas](src/schemas/contracts.ts): executable API and profile boundary validation.
- [services](src/services/): sanitized HTTP transport and query/mutation factories.
- [context](src/context/ProfileContext.tsx): validated local preferences and language.
- [components](src/components/): forms, safety, feedback, charts and maps.
- [locales](src/locales/): English, Hindi and Marathi, with complete critical-code inventories.

Select Pune, Mumbai or New Delhi city centers explicitly, or use one-shot GPS. A typed label never substitutes another city's coordinates. GPS timezone is the displayed device timezone. Storage failures are tolerated. Map distances are approximate straight-line distances; status and availability are not inferred.

Mock mode requires VITE_USE_MOCKS=true and is visibly labelled. It supplies only demonstration weather/facilities; it does not calculate heat advisories or silently replace API failures.

## Checks

```powershell
npm run typecheck
npm run lint
npm run format:check
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

The browser suite starts/stops the integrated backend on 8000 and frontend on 5173; both ports must be free. UI edge/failure weather/map/plan cases use clearly identified fixtures; these do not replace the separate actual Open-Meteo verification. Mandatory HeatLab cases call the actual engine. Community writes are forced off by the browser startup configuration. To test built assets rather than Vite development, use a fresh PowerShell terminal:

```powershell
$env:FRONTEND_E2E_PREVIEW='true'
npm run test:e2e -- --grep 'actual backend HeatLab'
```

Tests/reports/screenshots are in ignored output directories. Current actual results, scope and limitations: [test report](../docs/FRONTEND_TEST_REPORT.md). No Firefox/Safari, clinical safety or formal WCAG certification is claimed. Qualified Hindi/Marathi review remains needed.

## Deployment preparation

No deployment has been performed. The original frontend branch remains the backup demonstration. Configure a public HTTPS backend URL from [.env.production.example](.env.production.example), VITE_USE_MOCKS=false, and the backend's exact public CORS origin before release. Without an explicit production URL, API calls use same-origin /api/v1 rather than localhost. That requires an actual same-origin backend/proxy; the SPA does not implement server APIs.

[Vercel configuration](vercel.json) uses frontend as the project root, provides SPA rewrites and prepared security headers, and excludes API paths from the SPA rewrite. Validate it on the chosen hosting platform and tighten CSP connect-src to the real backend hostname. This configuration has not been deployed or hosting-verified. Never publish the placeholder example URL.

See [rewrite report](../docs/FRONTEND_REENGINEERING_REPORT.md), [feature parity](../docs/FEATURE_PARITY.md), [security audit](../docs/FRONTEND_SECURITY_AUDIT.md) and [integration status](../docs/INTEGRATION_STATUS.md).
