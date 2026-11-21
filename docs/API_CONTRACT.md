# SunShield shared API contract

Developer A owns the Express foundation, shared schemas, heat engine, protection planner and simulation. Developer B owns weather and database/Safe Zone services. Heat/weather validation remains in `backend/src/schemas/`; Safe Zone request validation is in `src/routes/safezone.routes.ts`. Both are composed in one application. See [current integration status](INTEGRATION_STATUS.md).

## Preserved TRD endpoints

Base URL: `http://localhost:8000/api/v1`.

| Method | Path | Request | Response |
| --- | --- | --- | --- |
| GET | /health | None | `{status:"UP",application:"SunShield",version:"1.0.0"}` |
| GET | /weather | latitude and longitude query numbers | Existing WeatherResponse contract below; LIVE/CACHED only |
| POST | /heat/assess | `{profile:WorkerProfile}` | `{dataMode,assessment}` |
| POST | /protection/plan | `{profile:WorkerProfile}` | `{dataMode,timezone,workDate,workStart,workEnd,timeline,disclaimerCode,...}` |
| POST | /simulation/evaluate | `{profile:WorkerProfile,weatherOverride:{temperatureC,humidityPercent,windSpeedKmh}}` | `{dataMode:"SIMULATION",assessment}` |
| GET | /safe-zones | latitude, longitude; optional radiusKm (0–100), category, availabilityStatus, includeDemo, limit (1–100) | `{distanceMethod:"STRAIGHT_LINE",facilities:[...]}` |
| GET | /safe-zones/:id | UUID path | Original facility detail, including verification metadata |
| POST | /safe-zones | Existing strict Developer B submission schema | 201 PENDING/UNKNOWN if enabled; default 503 COMMUNITY_WRITES_DISABLED |
| POST | /safe-zones/:id/reports | `{availabilityStatus,comment?}` | 201 report if enabled; does not verify facility; default disabled |

`WorkerProfile` uses the exact TRD camelCase properties and enum values. Every profile property is required, including city and IANA timezone. Times are HH:mm. MVP supports same-day schedules only; equal or overnight times return 422. Inputs are strict objects; unsupported fields are rejected. No symptom input is supported.

## WeatherProvider handoff to Developer B

```ts
interface WeatherProvider {
  getWeather(latitude: number, longitude: number): Promise<WeatherResponse>;
}
```

Response: `{dataMode,source,timezone,fetchedAt,current,hourly}`. Current: `{temperatureC,humidityPercent,apparentTemperatureC?,windSpeedKmh?,observedAt}`. Hourly: `{time,temperatureC,humidityPercent,apparentTemperatureC?,windSpeedKmh?}`. Optional metrics may be null. `current` may be null when current weather is unavailable. `hourly` may be empty. All units follow property names. No synthetic production fallback.

Finalized details absent from the TRD: `fetchedAt` and `observedAt` are offset-bearing ISO 8601 instants; hourly `time` may be offset-bearing ISO or local ISO in response `timezone`. Hourly entries cover one elapsed hour. Invalid/duplicate/overlapping periods become unavailable. Unknown source metadata is null in assessments. Inject `createApp({weatherProvider})`; no provider returns 503 for live endpoints. Upstream failure also returns 503; unusable returned current observations produce an UNKNOWN assessment. LIVE/CACHED observations must be no older than 60 minutes or more than 5 minutes in the future. These are prototype freshness policies.

## Supplementary assessment fields

The original assessment properties are preserved: `advisoryLevel`, `engineVersion`, `factors`, `recommendations[{code,priority}]`, `medicalValidation:false`, `disclaimerCode:"ESTIMATED_ADVISORY_ONLY"`. Priorities: CRITICAL, HIGH, MEDIUM, LOW. Stable recommendation codes are exactly the ten in the master prompt. Frontend translates codes; it must handle UNKNOWN prominently and never describe CAUTION as clearance.

Additional fields: `environmentalIndicators:{temperatureC,humidityPercent,apparentTemperatureC,windSpeedKmh,heatIndexC,heatIndexMethod,environmentalAdvisoryLevel}`, `limitations:string[]`, `source:string|null`, `observedAt:string|null`, `fetchedAt:string|null`, `assessedAt:string`. Heat index method is NWS_ROTHFUSZ or NOT_APPLICABLE. Unsupported indicators are null. Factors and limitation strings are stable uppercase codes documented in the rule source.

## Protection timeline

The plan covers the local date at request time in the profile timezone and exactly the existing shift. Each original timeline entry `{start,end,advisoryLevel,temperatureC,factors,recommendationCodes}` also has `availability:AVAILABLE|UNAVAILABLE` and `assessment` (same detailed assessment structure). Boundaries are offset-bearing ISO timestamps. Missing, ambiguous, stale or invalid forecast coverage yields UNKNOWN/unavailable. No fabricated periods. `workDate` is YYYY-MM-DD; `workStart/workEnd` remain HH:mm. Additional top-level `limitations` and `optionalScheduleAdvice` are string-code arrays. Optional adjustment advice is returned only for FLEXIBLE profiles. It does not promise an alternative safe period. Disclaimer: NOT_A_CERTIFIED_WORK_REST_PLAN.

## Errors and outstanding coordination

All errors: `{error:{code,message,requestId}}`; no stacks or secret values. 400 malformed JSON, 413 body size, 422 validation, 404 unknown route, 429 rate limit, 500 unexpected failure, 503 missing/unavailable provider. Body limit 32 KB. Requests limited to 120/minute per IP. Configure trusted proxy deliberately with hosting infrastructure before deployment.

Weather GET and Safe Zone routes are now registered using the reviewed Developer B implementation. Weather/assessment/planning share one provider instance. Safe Zone storage failures return sanitized 503 SAFE_ZONES_UNAVAILABLE without blocking other endpoints. Community writes default disabled; if explicitly enabled, a shared 10-write/15-minute/IP limiter supplements the common 120/minute API limiter. DEMO discovery is excluded by default, REJECTED facilities are excluded, and PENDING suggestions are not verification. No real database/write success is claimed without authorized verification. Existing weather/assessment/plan payloads and engine rules are unchanged. Enterprise remains deferred. Team handoffs are recorded in [issue #1](https://github.com/Madhav-87/sunshield-hackathon/issues/1).
