# Pune seed data (orchestrator-owned)

- `pune-hotspots.json` — known waterlogging spots shown as grey hotspot pins (`type: "hotspot"`, `tier: 0`, source kind `seed`).
  Only **10 of the 26** Traffic Police spots are publicly named (Punekar News, 3 Jul 2026); the full graded list (A+/A/B+/B) went to PMC and is not published. Add more if a copy is found.
- `pune-gazetteer.json` — place names for the paste-in matcher (PRD §5): hotspots + demo/scenario corridor + common localities. Case-insensitive match on `name` + `aliases` (English + Marathi).
- Coordinates from OpenStreetMap Nominatim (© OpenStreetMap contributors, ODbL). `approx: true` = hand-placed, not geocoded — show as approximate.
- `pune-cooling.json` — cooling points for the heat module (PRD §21.5), from OpenStreetMap via Overpass (21 Nov 2026, PMC/PCMC box 73.70–74.00 E, 18.40–18.70 N). `kind` = OSM tag; `amenities`: drinking_water→water, pharmacy→ors (chemists sell ORS), clinic/doctors→clinic, hospital→clinic+water, named park→shade. Unnamed features dropped except drinking water. Render as `makePin({type:'cooling', tier:0, source:{kind:'seed', name:'OpenStreetMap', url:null}, ...})`. © OpenStreetMap contributors (ODbL).
