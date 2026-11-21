# Raasta

**Find the right door for an everyday dispute.**

Raasta turns a plain-language problem into a clear, practical route to the right Indian authority. It identifies the first peaceful step, the correct office or portal, required documents, deadlines, legal-aid eligibility, nearby offices, and a ready-to-send letter or postal label.

Built for the Rotary x Rotaract **Naya Bharat 2047, Code for Bharat** hackathon, **Problem 1.2: Access to justice for everyday disputes**.

[Try Raasta](https://raasta.safalmutha.in) · [Pitch presentation](https://docs.google.com/presentation/d/1dnuOC1ywQWUNKwZHfftk374Q-fy9hMWIxCEiY3u8N7M/edit?usp=sharing) · [Pitch notes](docs/PITCH.md)

---

## The problem

An unpaid deposit, faulty product, unpaid wages, UPI fraud, a pothole, or a neighbour's construction can become a lasting conflict when a person does not know where to begin.

The hardest question is often not "what happened?" It is "which office handles this?" Raasta helps residents move from uncertainty to a first safe, free, or peaceful action without pretending to provide legal advice.

The DAKSH Access to Justice survey reports that 74% of people first turn to friends and family when they face a dispute.

## What Raasta does

### One answer, in three parts

1. **Start here** - the safest and most peaceful first step.
2. **The right door** - the office or portal, fees, documents, deadlines, and a ready draft.
3. **If that does not work** - the next authority, escalation route, or form of help.

### A complete action journey

- Describe a problem in your own words or choose a common dispute.
- Answer at most three short questions.
- Read a deterministic route in one of 12 languages.
- Generate a PDF letter, printable postal label, email, or WhatsApp draft.
- Find nearby offices and legal-aid services in Pune, Mumbai, Delhi, Bengaluru, Chennai, and Hyderabad.
- Check legal-aid eligibility under Section 12 and state income limits.
- Ask the assistant a follow-up question grounded in the selected route and verified registry.
- Open a step-by-step guide for portals that do not provide filing APIs.

### Safety comes first

Recent violence or fraud bypasses the question flow and immediately presents emergency actions:

- **112** for immediate police assistance.
- **1930** for the national cybercrime helpline.
- **1091** for women's helpline support.
- **108** for emergency medical assistance.

### Designed for India

- Hindi, Marathi, Urdu, Bengali, Gujarati, Kannada, Malayalam, Odia, Punjabi, Tamil, Telugu, and English.
- Right-to-left Urdu layout.
- Plain, Class 8-level action steps.
- JavaScript is optional. The core journey works with a plain HTML form.
- Prerendered pages and an accessible street-of-doors interface support old phones and slow networks.

---

## How it works

```text
Browser or accessible no-JavaScript form
                    |
                    v
raasta.safalmutha.in
        |
        +--> Cloudflare Pages
        |    Prerendered pages and 12-language routes
        |
        +--> Cloudflare Worker
             |
             +--> Intake: PII redaction and AI slot extraction
             +--> Rules: deterministic routing and emergency guardrails
             +--> Registry: verified offices, portals, fees, deadlines, and links
             +--> Documents: letters, PDFs, labels, email, and WhatsApp drafts
             +--> KV: cache
             +--> D1: feedback
```

AI helps understand free-text facts. It does not invent an authority or route. Every office, URL, fee, phone number, deadline, and escalation comes from the verified registry through a deterministic rule engine.

### Architecture principles

- Same-origin Pages and Worker routes for no CORS configuration.
- Prerendered and server-rendered results that remain usable without JavaScript.
- Rules and public-source data kept separate from AI-generated text.
- PII redacted before AI calls or logging.
- HMAC-signed result links that expire after seven days.
- No fake filing claims: real API filing remains clearly marked as a demo sandbox until credentials and a tenant are available.

---

## Technology

| Area | Stack |
|---|---|
| Front end | React 19, Preact in production, Vite, Tailwind 4 |
| Server | Cloudflare Worker, Hono |
| Hosting | Cloudflare Pages on the same hostname |
| Data | D1, KV, typed verified registry |
| AI | Gemini, Cloudflare Workers AI, Ollama locally, with a deterministic keyword fallback |
| Documents | pdf-lib, print layouts, email and WhatsApp builders |
| Testing | Vitest, TypeScript, Playwright |

---

## 3-minute demo

1. Open the landing page and type: **"My landlord is not returning my deposit of Rs 30000."**
2. Answer at most two questions, then select the glowing right door.
3. Review the first peaceful step, documents, deadline, fee, and escalation route.
4. Open **Prepare letter**, download the PDF, or print a postal label.
5. Ask: **"What if they do not reply?"**
6. Type: **"Rs 20000 was taken by UPI fraud just now."** The emergency route appears immediately.
7. Switch the site to Marathi or Urdu and use the same journey.
8. Open legal-aid eligibility and check the income criteria.
9. Turn JavaScript off and confirm the core flow still works.

---

## Run locally

### Requirements

- Node.js 22, 20 also works
- npm 10
- Git
- Optional: Ollama with `qwen3.5:4b` for local AI

No Cloudflare account or API key is required for a local run.

### Start everything

```powershell
npm run local
```

This builds the prerendered site, creates local KV and D1 state, and starts:

- Website: http://localhost:4173
- Local API and dynamic routes: http://127.0.0.1:8787
- Health check: http://localhost:4173/api/health

For the full local and deployment procedure, see [run.md](run.md).

### Optional local AI

```powershell
ollama pull qwen3.5:4b
```

The local Worker uses Ollama first and falls back to keywords if no model is running. Cloud Gemini keys may also be configured locally.

---

## Validate

```powershell
npm test
npm run typecheck
```

The test suite covers data, routing, documents, API behavior, and step-by-step guides across states.

Browser and accessibility checks:

```powershell
cd qa/agy
npx playwright test
```

Set `BASE_URL` to test a hosted or local deployment.

---

## Repository map

```text
apps/web        Prerendered React website
apps/api        Hono Worker for JSON and dynamic routes
packages/data   Verified registry, schemas, and dispute data
packages/rules  Routing engine, guardrails, timers, redaction
packages/i18n   12-language content and RTL support
packages/docs-gen Letters, PDFs, labels, email, and WhatsApp drafts
scripts/        Local runner, build guards, ingestion, and environment tools
qa/             Playwright journeys and AI intake checks
docs/           Product, architecture, design, security, and deployment notes
```

---

## Trust and safety

Raasta stores almost no personal data and treats every input as hostile.

- Strict CSP, HSTS, and restrictive request headers.
- Zod validation and origin checks on requests.
- PII redaction before AI calls.
- Request size limits and rate limiting.
- Signed, short-lived result links.
- URL allowlisting against the verified registry.
- Public-source facts only. No invented logos, testimonials, fees, deadlines, or officials.

Read the complete [security notes](docs/SECURITY.md).

> Raasta gives procedural guidance based on public government rules. It is not legal advice.

## Documentation

| Resource | Purpose |
|---|---|
| [Pitch presentation](https://docs.google.com/presentation/d/1dnuOC1ywQWUNKwZHfftk374Q-fy9hMWIxCEiY3u8N7M/edit?usp=sharing) | Visual slides for the hackathon presentation |
| [Pitch notes](docs/PITCH.md) | Problem, answer, 3-minute demo, architecture, and honesty rules |
| [Product](docs/PRODUCT.md) | Users, scope, evidence, and challenge |
| [Run guide](run.md) | Local setup and validation |
| [Deployment](docs/DEPLOY.md) | Cloudflare Pages and Worker deployment |
| [Design system](docs/DESIGN.md) | Visual tokens, accessibility, and street-of-doors pattern |
| [Contracts](docs/CONTRACTS.md) | Package boundaries and codebase rules |
| [Security](docs/SECURITY.md) | Controls and owner actions |
| [Roadmap](docs/ROADMAP.md) | Built features and planned next steps |
| [Ship checklist](docs/CHECKLIST.md) | Pre-deployment checks |

---

**Raasta means "the way."** The product turns confusion into the first visible step toward resolution.
