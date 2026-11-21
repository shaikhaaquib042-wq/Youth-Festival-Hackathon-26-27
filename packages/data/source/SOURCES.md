# Sources (copied 2026-11-21 from the hackathon folder)
- List of directories.json: india_grievance_platforms registry, 22 platforms (team research).
- List of API and others.md: developer handbook (APIs, Pune offices, NALSA ceilings, timers, guardrails).
- Mock Data.json: question schemas and Pune directory (hackathon-provided mock data).

## Ingest
- `node scripts/ingest.mjs` regenerates `packages/data/src/*.json` from these sources (platforms, platforms.meta, offices.pune, legal-aid, timers, disputes, states). It validates against `packages/data/src/schemas.ts` and fails on drift.
- Edits made by ingest to the source text: em dashes become " - "; the retired e-Daakhil domain is replaced by a plain note.
- Handbook 3.1/3.2 wins on phone and email; Mock Data supplies addresses only. Mock "Bhavani Peth Ward Office" is not among the 15 handbook 3.2 rows and is left out.
- `node scripts/ollama-interpret.mjs` writes `packages/data/src/derived/platform-insights.json` (local draft, source "qwen3.5:4b-draft").
