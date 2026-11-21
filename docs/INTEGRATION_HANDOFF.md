# SunShield integration handoff

Status: Developer B's provider and corrected Safe Zone infrastructure are integrated in one app. Actual Open-Meteo weather, assessments and hourly plans are locally verified. Authorized root environment configuration now works, and actual Supabase reads, migration status, empty schema diff, DEMO exclusion/inclusion, existing details and native Safe Zone UI are independently verified. Three facilities remain DEMO; none is VERIFIED. Community writes remain disabled and unverified against actual isolated data. Health and HeatLab remain independent. Existing engine/API contracts are preserved. See [current status](INTEGRATION_STATUS.md), [release handoff](FINAL_RELEASE.md) and [actual evidence](release-evidence/README.md).

## Provider contract

Exact interface from [shared types](../backend/src/types/index.ts):

```ts
interface WeatherProvider {
  getWeather(latitude: number, longitude: number): Promise<WeatherResponse>;
}
```

The following is the existing Zod weather schema, not a new contract. See [shared.schema.ts](../backend/src/schemas/shared.schema.ts) for the executable source of truth:

```ts
const dataModeSchema = z.enum(['LIVE', 'CACHED', 'SIMULATION']);
const weatherMetricsSchema = z.strictObject({
  temperatureC: z.number().min(-90).max(65),
  humidityPercent: z.number().min(0).max(100),
  apparentTemperatureC: z.number().min(-120).max(100).nullable().optional(),
  windSpeedKmh: z.number().min(0).max(500).nullable().optional(),
});
const currentWeatherSchema = weatherMetricsSchema.extend({
  observedAt: z.iso.datetime({ offset: true }),
});
const hourlyWeatherSchema = weatherMetricsSchema.extend({ time: z.string().min(1) });
const weatherResponseSchema = z.strictObject({
  dataMode: dataModeSchema,
  source: z.string().trim().min(1).max(200),
  timezone: z.string().refine(value => IANAZone.isValidZone(value), 'Use a valid IANA timezone'),
  fetchedAt: z.iso.datetime({ offset: true }),
  current: currentWeatherSchema.nullable(),
  hourly: z.array(hourlyWeatherSchema),
});
```

| Field | Required / nullable | Meaning |
| --- | --- | --- |
| dataMode | Required, non-null | LIVE or CACHED from the real provider. The adapter rejects SIMULATION on live routes even though the shared enum includes it. |
| source | Required, non-null | Non-empty source label, at most 200 characters |
| timezone | Required, non-null | Valid IANA zone, e.g. Asia/Kolkata |
| fetchedAt | Required, non-null | Original response retrieval instant; retain age when serving cached data |
| current | Required property, nullable | Use null if current observations are unavailable |
| current.temperatureC / humidityPercent | Required, non-null when current exists | Celsius / relative humidity percent |
| current.observedAt | Required, non-null when current exists | Actual observation instant; never replace an old observation time with cache-read time |
| apparentTemperatureC / windSpeedKmh | Optional and nullable in current and hourly | Celsius / km/h; zero is a valid value |
| hourly | Required, non-null array; may be empty | Forecast periods; never fabricate missing values |
| hourly[].temperatureC / humidityPercent / time | Required, non-null | Each row covers one elapsed hour starting at time |

Strict weather objects reject extra properties. Zod numbers reject non-finite values. The adapter validates metadata separately so unsupported current observations can become UNKNOWN instead of failing the entire assessment.

## Timestamps and freshness

- fetchedAt and observedAt: offset-bearing ISO 8601, e.g. `2026-11-21T09:00:00.000Z` or `2026-11-21T14:30:00+05:30`.
- Hourly time: offset-bearing ISO, or local ISO such as `2026-11-21T09:00` interpreted in WeatherResponse.timezone. The hourly Zod field itself only checks for a non-empty string; the planner then parses ISO and rejects invalid/ambiguous local periods. Explicit offsets are preferable at DST transitions.
- LIVE and CACHED assessment: both observedAt and fetchedAt must be no older than 60 minutes. Exactly 60 minutes is accepted. Future fetch/observation allowance is 5 minutes. Cached data receives no safety exemption; CACHED_WEATHER is included in limitations.
- Forecast: fetchedAt must be no older than 3 hours, and may not exceed the 5-minute future allowance. Forecast starts outside now minus 24 hours through now plus 48 hours become UNKNOWN. The plan still covers only today's existing shift in the worker timezone. Forecast gaps, duplicates and overlapping coverage are unavailable.
- The configured weather cache TTL defaults to 600 seconds. Cache TTL is a provider policy; it does not replace the engine's freshness checks.

## Injection and failure behavior

At [server composition](../backend/src/server.ts), createOpenMeteoWeatherProvider is already instantiated once with validated base URL/cache TTL and injected into createApp. Weather, assessment and planner share it. Existing listener, signals, shutdown timer and error handling remain; loaded Safe Zone storage is also disconnected. Do not instantiate another weather client or inject fixtures into production. Root infrastructure is compiled before the backend; deploy both compiled trees and package dependency installations as described in the release handoff.

The minimal typed injection example is:

```ts
import { createApp } from './app.js';
import type { WeatherProvider } from './types/index.js';

function composeWithProvider(weatherProvider: WeatherProvider) {
  return createApp({ weatherProvider });
}
// Pass Developer B's real instance to this call at the existing composition point.
```

Developer B's integrated implementation owns normalization, original timestamps, bounded location caching and a five-second fetch/body deadline. It rejects failures without synthetic fallback. The generic adapter still awaits the injected provider; alternate providers must supply their own bounded behavior. Cache TTL defaults to 600 seconds and is validated from 1 through 3600; engine freshness remains stricter where applicable.

| Condition | HTTP and behavior |
| --- | --- |
| No provider configured | 503 WEATHER_PROVIDER_UNAVAILABLE |
| Provider rejects/throws | 503 WEATHER_UNAVAILABLE; original internal error is hidden |
| Invalid source/timezone/fetchedAt/dataMode metadata, or SIMULATION from provider | 503 INVALID_WEATHER_RESPONSE |
| Missing/invalid current metrics or stale/future usable-format observations | 200 assessment with UNKNOWN and explicit limitation codes |
| Missing/invalid/stale forecast coverage | 200 plan with UNKNOWN / UNAVAILABLE timeline periods |
| Invalid body or profile | 422 VALIDATION_ERROR |
| Invalid/ambiguous same-day local schedule | 422 INVALID_SCHEDULE |
| Malformed JSON / oversized body / unsupported encoding | 400 INVALID_JSON / 413 PAYLOAD_TOO_LARGE / 415 UNSUPPORTED_ENCODING |
| Unknown route / rate limit / unexpected exception | 404 NOT_FOUND / 429 RATE_LIMITED / 500 INTERNAL_ERROR |

Every API error uses `{ "error": { "code": "...", "message": "...", "requestId": "..." } }`. The ID matches X-Request-Id; error responses expose no stack or provider error details. Security middleware and the 120 requests/minute/IP limit are unchanged.

## Frontend entry points and actual examples

Base URL: `http://localhost:8000/api/v1`; configured CORS origin defaults to `http://localhost:5173`. Send Content-Type application/json for POST requests. Swagger: `http://localhost:8000/docs/`; OpenAPI: `http://localhost:8000/openapi.json`.

| Endpoint | Ready now? | Request |
| --- | --- | --- |
| GET /health | Yes | No body; returns [captured health JSON](../backend/examples/integration/health.response.json) |
| POST /simulation/evaluate | Yes | Complete independent scenarios below |
| GET /weather | Integrated real provider | latitude and longitude query values |
| POST /heat/assess | Integrated real provider | `{ "profile": <the complete profile from either request below> }` |
| POST /protection/plan | Integrated real provider | Same complete profile wrapper; same-day schedules only |

Copy-ready, valid JSON files, generated and schema-checked through the compiled Express app over HTTP:

- [Heavy workload request](../backend/examples/integration/heatlab-heavy.request.json) and [actual response](../backend/examples/integration/heatlab-heavy.response.json).
- [Lower workload request](../backend/examples/integration/heatlab-lower.request.json) and [actual response](../backend/examples/integration/heatlab-lower.response.json).
- [Demo walkthrough](HEATLAB_DEMO.md) and [execution record](../backend/examples/integration/verification.json).

Both use SIMULATION, 35 C / 50% RH / 5 km/h. Their environmental indicator is identical: heat index 40.68 C, environmental advisory HIGH. Heavy direct-sun work receives CRITICAL; the lower-workload vendor in partial shade receives HIGH. HIGH still calls for reduced strenuous activity and supervisor coordination. Neither result is clearance to work. Source is HeatLab; response timestamps are real generation times and will differ when repeated. No synthetic result is represented as live weather.

## Frontend codes

Translate these existing recommendation codes; preserve priority and show stronger advice first. Priority enum: CRITICAL, HIGH, MEDIUM, LOW. Do not invent medical percentages or safe working durations.

| Code | Meaning |
| --- | --- |
| MAINTAIN_HYDRATION | Maintain hydration only when conscious and able to swallow safely |
| IMPROVE_WATER_ACCESS | Arrange accessible drinking water |
| ARRANGE_SHADED_RECOVERY | Arrange shaded recovery opportunities |
| REDUCE_STRENUOUS_ACTIVITY | Reduce strenuous work |
| ESCALATE_TO_SUPERVISOR | Seek employer/supervisor-supported interventions |
| FIND_COOLING_RESOURCE | Find cooling, water or shade resources |
| CONSIDER_ALTERNATIVE_DUTIES | Consider available alternative duties |
| STOP_UNSAFE_ACTIVITY | Prioritize stopping unsafe activity |
| SEEK_EMERGENCY_HELP | Reserved; no symptom input exists, so temperature alone never emits this code |
| MONITOR_SYMPTOMS | Symptom awareness; no symptom detection or diagnosis |

Existing limitation codes, grouped for translation:

| Group | Codes |
| --- | --- |
| Always shown in assessments | PROTOTYPE_OCCUPATIONAL_RULES_UNVALIDATED; NOT_MEDICALLY_VALIDATED; NOT_PERMISSION_TO_CONTINUE_WORK; NO_GUARANTEED_SAFE_DURATION; HEAT_INDEX_IS_NOT_WBGT; PERSONAL_HEALTH_CLOTHING_AND_ACCLIMATIZATION_NOT_ASSESSED; HYDRATION_ONLY_WHEN_CONSCIOUS_AND_ABLE_TO_SWALLOW |
| Data and indicator labels | CACHED_WEATHER; SIMULATED_CONDITIONS; FORECAST_ESTIMATE; HEAT_INDEX_OUTSIDE_REPORTING_ENVELOPE |
| Unsupported observations/metadata | MISSING_OR_INVALID_WEATHER; INVALID_WEATHER_METADATA; FUTURE_FETCH_TIMESTAMP; STALE_WEATHER; FUTURE_OBSERVATION |
| Unsupported forecasts | STALE_FORECAST; FORECAST_OUTSIDE_HORIZON; AMBIGUOUS_FORECAST_COVERAGE; FORECAST_PERIOD_UNAVAILABLE |
| Plan restriction | SAME_DAY_SCHEDULE_ONLY |

Disclaimers: ESTIMATED_ADVISORY_ONLY and NOT_A_CERTIFIED_WORK_REST_PLAN. Optional schedule advice: CONSIDER_OPTIONAL_SCHEDULE_ADJUSTMENT (only FLEXIBLE profiles). Factors: HEAVY_WORKLOAD, MODERATE_WORKLOAD, DIRECT_SUNLIGHT, PARTIAL_SHADE, LIMITED_WATER, NO_WATER, LIMITED_SHADE, NO_SHADE, FIXED_SCHEDULE, EMPLOYER_CONTROLLED_SCHEDULE. Treat UNKNOWN prominently as unsupported, never as a favorable exposure label. Keep text visible when voice playback is unavailable. Display the hydration limitation with hydration advice.

## Integration gate

Developer B's actual implementation has been checked against these contracts. Real observations, hourly mapping, cache reuse/original age and actual frontend rendering are verified; expiry/timeouts/failure behavior also have deterministic provider tests. The older runner's inline fixtures remain fixture evidence. The actual database read-only gate is now passed; authorized isolated-write verification and public deployment remain separate gates.

P1 /enterprise/plan remains deferred until an enterprise contract is jointly agreed. The remote is configured; feature/frontend-reengineering preserves the frontend/main ancestry and imports unchanged core files deliberately. See [current integration status](INTEGRATION_STATUS.md); [GIT_SYNC.md](GIT_SYNC.md) records the earlier synchronization procedure.
