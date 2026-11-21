# Code for Community Impact
## Rotary × Rotaract Youth Festival 2026

Welcome to the official Hackathon repository!

---

## FloodWatch (Team — Problem Statement 7.3, Environment)
A live, verified map of which roads in Pune are waterlogged right now — citizen reports fused with NDMA SACHET alerts, RainViewer radar and Open-Meteo weather — with route verdicts (Safe / Caution / AVOID) and "before you leave" advice.

```
npm install
npm run dev        # http://localhost:5173
npm run osrm       # (macOS) build + run local OSRM for Pune on :5000
```
Spec: [`docs/PRD.md`](docs/PRD.md) · Agent/contributor guide: [`AGENTS.md`](AGENTS.md)

Credits: map © OpenStreetMap contributors, tiles by Protomaps; routing OSRM; alerts NDMA SACHET; weather Open-Meteo; radar RainViewer.
