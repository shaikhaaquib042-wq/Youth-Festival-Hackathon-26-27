# Raasta

**Find the right door for an everyday problem.** Raasta tells a person in India which office handles their dispute, the first free and peaceful step, the papers to keep ready, the time limits, whether they qualify for a free lawyer, where the nearest office is, and gives them a ready letter, email, WhatsApp text or postal label.

Built for the Rotary x Rotaract "Naya Bharat 2047, Code for Bharat" hackathon, Problem 1.2 (access to justice for everyday disputes).

**Live:** https://raasta.safalmutha.in

## What it does

- Type the problem in your own words (12 languages) or tap a common problem
- At most three short questions, then one clear route: start here, the right door, and what to do if that does not work
- Safety first: violence and fraud that just happened skip every question and show 112 / 1930 at once
- Letters as PDF or print, postal labels, email and WhatsApp drafts, official forms and portals from a verified registry
- Free legal aid check (Section 12 and state income ceilings), nearby offices for Pune, Mumbai, Delhi, Bengaluru, Chennai and Hyderabad
- An assistant that answers follow-up questions, grounded in the route and the registry
- Works without JavaScript and on old phones on 2G (under 60 KB of JavaScript on first load)

Raasta gives procedural guidance based on public government rules. It is not legal advice.

## Run it

```powershell
npm run local
```

Then open http://localhost:4173. Everything, including the API, runs on your machine. Full guide: **[run.md](run.md)**.

## Docs

| File | About |
|---|---|
| [run.md](run.md) | Build, run, test and deploy |
| [docs/DEPLOY.md](docs/DEPLOY.md) | Cloudflare Pages + Worker, step by step |
| [docs/PRODUCT.md](docs/PRODUCT.md) | The problem and who it is for |
| [docs/PITCH.md](docs/PITCH.md) | Demo script and architecture |
| [docs/DESIGN.md](docs/DESIGN.md) | Visual language |
| [docs/CONTRACTS.md](docs/CONTRACTS.md) | Packages and rules of the codebase |
| [docs/SECURITY.md](docs/SECURITY.md) | Security measures and owner actions |
| [docs/CHECKLIST.md](docs/CHECKLIST.md) | Pre-ship checklist |
| [docs/ROADMAP.md](docs/ROADMAP.md) | What comes next |

## Stack

Cloudflare Pages (static, prerendered) and a Cloudflare Worker (Hono) on the same hostname, KV, D1, Workers AI. React 19 with Preact in production, Tailwind 4, pdf-lib. Free AI providers first (Gemini, Workers AI, Ollama locally), with a deterministic rule engine deciding every route.
