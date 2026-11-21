# Code for Community Impact
## Rotary × Rotaract Youth Festival 2026

Welcome to the official Hackathon repository!

---

## Mausam Mitra · मौसम मित्र (Team — Problem Statements 7.3 + 7.2, Environment)
One safety companion for people who can't stay indoors — commuters, two-wheeler and delivery riders, outdoor workers.
- **Flood (7.3):** a live, verified map of which roads in Pune are waterlogged right now — citizen reports fused with NDMA SACHET alerts, RainViewer radar and Open-Meteo weather — with route verdicts (Safe / Caution / AVOID) and "before you leave" advice.
- **Heat (7.2):** hyperlocal heat alerts, continuous in-shift checks with work/rest advice, heat-illness signs and help, and a crowdsourced map of drinking water, shade and cooling points — with voice alerts in Marathi/Hindi.

```
npm install
npm run dev        # http://localhost:5173
npm run osrm       # (macOS) build + run local OSRM for Pune on :5000
```
Spec: [`docs/PRD.md`](docs/PRD.md) · Agent/contributor guide: [`AGENTS.md`](AGENTS.md)

Credits: map © OpenStreetMap contributors, tiles by Protomaps; routing OSRM; alerts NDMA SACHET; weather Open-Meteo; radar RainViewer.
