# Frontend review and immediate next step

Reviewed origin/frontend-integration at `8429fcbb0aa795dc4808ed0fac588290df6979b3`. It is based on origin/main (`9961079`) and already contains Developer B's database/Safe Zone work. It does not contain Developer A's backend or finalized contracts. Its history is unrelated to the local core-intelligence history. No branches were switched or merged; teammate files were not modified.

## Verification

In an isolated frontend snapshot, npm ci, npm run typecheck, npm run lint, and npm run build all passed. No frontend test script exists. No browser/device acceptance testing was performed.

Two targeted checks executed the actual frontend markup generator: the saved CRITICAL backend response falls back to generic supervisor wording, and an untrusted facility name is emitted as unescaped HTML. No browser payload was executed.

## Blockers to real integration

1. **HeatLab never calls the engine in API mode.** [simulation.service.ts](https://github.com/Madhav-87/sunshield-hackathon/blob/8429fcbb0aa795dc4808ed0fac588290df6979b3/frontend/src/services/simulation.service.ts#L19) rejects with ContractUnavailableError. Mock mode returns an explicitly non-assessing UNKNOWN result. The frontend was intentionally waiting for a contract; [API_CONTRACT.md](API_CONTRACT.md) and [the handoff](INTEGRATION_HANDOFF.md) now supply it. The UI-only SimulationViewResult also permits only UNKNOWN, so it needs a typed adapter for real API results.
2. **Critical recommendation wording is lost.** [codeText](https://github.com/Madhav-87/sunshield-hackathon/blob/8429fcbb0aa795dc4808ed0fac588290df6979b3/frontend/src/legacyMarkup.ts#L105) translates only three codes. STOP_UNSAFE_ACTIVITY, MAINTAIN_HYDRATION, MONITOR_SYMPTOMS and other existing codes fall back to generic supervisor text. The dashboard displays only the first two recommendations, making the missing stop-work translation especially consequential. Add all recommendation and limitation translations, retaining priorities and hydration restrictions.
3. **Untrusted text reaches raw HTML.** The [template helper](https://github.com/Madhav-87/sunshield-hackathon/blob/8429fcbb0aa795dc4808ed0fac588290df6979b3/frontend/src/legacyMarkup.ts#L50) concatenates values without escaping. [Facility names](https://github.com/Madhav-87/sunshield-hackathon/blob/8429fcbb0aa795dc4808ed0fac588290df6979b3/frontend/src/legacyMarkup.ts#L486) flow into [dangerouslySetInnerHTML](https://github.com/Madhav-87/sunshield-hackathon/blob/8429fcbb0aa795dc4808ed0fac588290df6979b3/frontend/src/App.tsx#L601). Community-submitted names could inject markup/event handlers once live data is connected. Render untrusted values as React text or escape each interpolation for its context; do not render API/user text as trusted HTML.
4. **Live worker screens still depend on unfinished integration.** The dashboard Promise.all requires weather, assessment and Safe Zones together. Developer A currently has no registered GET /weather or Safe Zone routes, and live assessment/planning intentionally return 503 without a provider. Developer B's main branch has no weather provider either. Turning off mocks alone will not produce a working live dashboard.
5. **Location and contract details need alignment.** GPS success updates legacyState.location but does not increment profileVersion; the memoized profile and API requests can retain old coordinates. Typing a city changes only its label, not coordinates. Frontend weather types require non-null current/apparent/wind and an observedAt on every hourly row, unlike the finalized backend contract. Safe Zone category checks also use SHADED_REST / MEDICAL instead of Developer B's SHADED_REST_AREA / MEDICAL_FACILITY. Resolve these during provider/map integration.

## Immediate next step: make real-engine HeatLab work end to end

Create a dedicated integration branch based on frontend-integration, preserving its database work. Bring in Developer A's backend and docs deliberately; do not merge unrelated histories blindly or replace root package files wholesale. Then coordinate these small frontend changes:

```ts
// Map the existing UI scenario into the established backend request.
return apiClient.post<HeatAssessmentResponse>(
  '/simulation/evaluate',
  { profile: scenario.worker, weatherOverride: scenario.conditions },
  options,
);
```

Adapt the result from assessment.advisoryLevel, factors, recommendations, environmentalIndicators and limitations into the current renderer, preserving priority and explicit SIMULATION labeling. Fix critical-code translations and untrusted HTML handling in that same integration slice. Keep the backend engine unchanged.

Configure frontend VITE_API_BASE_URL=http://localhost:8000/api/v1 and VITE_USE_MOCKS=false. Start the existing backend on 8000 and frontend on 5173. Check GET /health, then evaluate the two [saved demo scenarios](HEATLAB_DEMO.md) through the frontend. At identical 35 C / 50% RH / 5 km/h, acceptance is CRITICAL for heavy/direct-sun work and HIGH for the lower-workload vendor, with identical environmental indicators and appropriate visible guidance. Neither result is clearance to work.

After that working demo slice, integrate Developer B's real weather provider and mount Safe Zones, addressing the [existing search/migration findings](DEVELOPER_B_REVIEW.md). Recheck GPS/city resolution, nullable weather, forecast gaps, cached/error states and all 64 backend regressions. Employer planning remains P1 until its contract is agreed.
