# HeatLab demonstration

Current integrated startup/build instructions are in [FINAL_RELEASE.md](FINAL_RELEASE.md). Fresh clones install both root and backend dependencies and compile root infrastructure before backend startup. Real weather/dashboard/planning are now additionally available; the independent HeatLab sequence below remains unchanged. Database access and enabled community writes are not prerequisites for the flagship demonstration.

Both scenarios below are SIMULATION. Requests and complete responses were captured from the compiled application over HTTP by [the verification runner](../backend/scripts/verify-integration.mjs). The engine and established contracts were not changed. Use [verification.json](../backend/examples/integration/verification.json) for execution provenance and generation time.

| Same simulated weather | Value |
| --- | --- |
| Temperature | 35 C |
| Relative humidity | 50% |
| Wind | 5 km/h |
| Engine heat index | 40.68 C |
| Environmental advisory for both profiles | HIGH |

| Scenario | Inputs that differ | Actual overall advisory | Actual recommendation codes, in response order |
| --- | --- | --- | --- |
| Construction worker | HEAVY; DIRECT_SUNLIGHT; LIMITED water; UNAVAILABLE shade; EMPLOYER_CONTROLLED schedule | CRITICAL | STOP_UNSAFE_ACTIVITY; MONITOR_SYMPTOMS; IMPROVE_WATER_ACCESS; ARRANGE_SHADED_RECOVERY; REDUCE_STRENUOUS_ACTIVITY; ESCALATE_TO_SUPERVISOR; FIND_COOLING_RESOURCE; MAINTAIN_HYDRATION |
| Street vendor | LIGHT; PARTIAL_SHADE; AVAILABLE water and shade; FLEXIBLE schedule | HIGH | REDUCE_STRENUOUS_ACTIVITY; ESCALATE_TO_SUPERVISOR; MONITOR_SYMPTOMS; MAINTAIN_HYDRATION |

Complete, directly usable request/response pairs:

- [Construction request](../backend/examples/integration/heatlab-heavy.request.json) / [response](../backend/examples/integration/heatlab-heavy.response.json).
- [Vendor request](../backend/examples/integration/heatlab-lower.request.json) / [response](../backend/examples/integration/heatlab-lower.response.json).

Start the existing backend from its directory with `npm run dev`. In a second PowerShell terminal in that same directory:

```powershell
$api = 'http://localhost:8000/api/v1'
Invoke-RestMethod "$api/health"

$heavyBody = Get-Content -Raw examples/integration/heatlab-heavy.request.json
$lowerBody = Get-Content -Raw examples/integration/heatlab-lower.request.json
Invoke-RestMethod -Method Post -Uri "$api/simulation/evaluate" -ContentType application/json -Body $heavyBody
Invoke-RestMethod -Method Post -Uri "$api/simulation/evaluate" -ContentType application/json -Body $lowerBody
```

Frontend demonstration: keep a visible SIMULATION label, show the identical environmental readings, then compare occupational factors and recommendations. Explain that the HIGH vendor result still requires precautions. The construction result prioritizes stopping unsafe activity. Show medicalValidation=false and the estimated-advisory disclaimer. Hydration is only for someone conscious and able to swallow safely. No result is medically validated or permission to keep working.

Neither request requires Open-Meteo, Supabase or Developer B's provider. Submit scenarios as separate requests; do not modify live state. Response timestamps naturally change on each request.

To regenerate and verify all saved examples after building:

```powershell
npm run build
node scripts/verify-integration.mjs
```

The runner temporarily serves the compiled app on loopback ephemeral ports and closes its servers. Its additional provider-boundary checks use inline test fixtures labelled INTEGRATION_FIXTURE_NOT_LIVE. They do not establish that real weather integration works.
