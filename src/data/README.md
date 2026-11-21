# Pune seed data (orchestrator-owned)

- `pune-hotspots.json` — known waterlogging spots shown as grey hotspot pins (`type: "hotspot"`, `tier: 0`, source kind `seed`).
  Only **10 of the 26** Traffic Police spots are publicly named (Punekar News, 3 Jul 2026); the full graded list (A+/A/B+/B) went to PMC and is not published. Add more if a copy is found.
- `pune-gazetteer.json` — place names for the paste-in matcher (PRD §5): hotspots + demo/scenario corridor + common localities. Case-insensitive match on `name` + `aliases` (English + Marathi).
- Coordinates from OpenStreetMap Nominatim (© OpenStreetMap contributors, ODbL). `approx: true` = hand-placed, not geocoded — show as approximate.
