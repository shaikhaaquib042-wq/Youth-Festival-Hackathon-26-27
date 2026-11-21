# Raasta

**Which door do I knock on?**

Raasta means "the way" in Hindi and Marathi. It is a calm, multilingual access-to-justice guide that helps a person turn an everyday dispute into one clear first step.

Describe a problem in plain language, and Raasta identifies:

1. **The first free or peaceful step** you can take today.
2. **The exact office or portal** that handles it, along with fees, expected timing, and documents.
3. **The next door** to try if the first one does not resolve the matter.

Built for the Rotary x Rotaract **Naya Bharat 2047, Code for Bharat** hackathon, **Problem 1.2: Access to justice for everyday disputes**.

[Open Raasta](https://raasta.safalmutha.in) · [View presentation](https://docs.google.com/presentation/d/1dnuOC1ywQWUNKwZHfftk374Q-fy9hMWIxCEiY3u8N7M/edit?usp=sharing)

---

## The problem

An unpaid deposit, faulty product, unpaid wage, UPI fraud, pothole, or neighbour dispute often stops at one question: which authority handles this?

The DAKSH Access to Justice survey found that 74% of people first turn to friends and family. Without a clear answer, many give up. A small dispute can become a lasting grudge, and then a conflict no one intended to start.

The right route could lead to police, a consumer commission, labour office, ward office, Lok Adalat, banking ombudsman, or legal aid. Raasta connects those paths without assuming a person knows the legal system.

## What Raasta does

- Accepts free-text problems or common-dispute choices.
- Asks at most three short questions, and only when the answer changes the route.
- Works in 12 Indian languages, including Urdu with a correct right-to-left layout.
- Covers 19 kinds of everyday disputes across all 36 states and union territories.
- Generates a properly formatted PDF letter, postal label, email, and WhatsApp draft.
- Finds nearby offices and checks eligibility for a free government lawyer under Section 12.
- Walks people through portals that do not offer direct filing APIs.
- Works with JavaScript disabled, making the journey usable on old phones and slow networks.
- Uses one tap to apply a person's state or city and localize offices and complaint channels.

### Live the journey

For a landlord keeping a deposit of Rs 30,000, Raasta can identify a fifteen-day notice as the first step, provide the correct office, explain the documents and deadline, and prepare the notice and postal label in less than a minute.

For UPI fraud discovered just now, Raasta skips the questions and places 1930 first. It explains how the first hour may be critical, then guides the person through the bank letter and cybercrime portal. For violence or assault, Raasta prioritizes safety, emergency numbers, reporting through a police station or Zero FIR, and free legal aid.

Emergency actions include **112**, **1930**, the women's helpline at **1091**, and emergency medical support at **108**.

---

## Why Raasta is different

### A single route, not ten search results

A web search leaves a person comparing blogs and advertisements. Government portals are scattered across separate logins and layouts. AI chatbots may sound convincing while inventing a phone number, fee, or deadline.

Raasta gives one situation-specific route, backs it with the official link, and uses plain language. The result is a direct first action, a correct office or portal, and a fallback route.

### AI understands, rules decide

The AI is not allowed to invent the answer. It only helps extract details from what the person writes. A deterministic rule engine and a verified registry decide the route.

The registry contains 22 official platforms, including CPGRAMS, e-Jagriti, the national cybercrime portal, RBI, SEBI, IRDAI, EPFO, SHe-Box, and NALSA. Every link, fee, phone number, and deadline must come from the registry.

If a link cannot be verified, the system marks it "Check before you go" instead of guessing. Automated checks stop a release if a guide points outside the verified registry.

### Built for low bandwidth

The first page needs only about forty kilobytes of code. Raasta prerenders about 730 pages and serves from Cloudflare's edge network. A plain HTML form provides the core journey even when JavaScript is unavailable.

<!-- ---

## 3-minute demo

1. Open the landing page and show the calm street of doors.
2. Type: **"My landlord in Pune is not returning my deposit of 30000 for 2 months."**
3. Answer one short question, then open the result and **Show me how, step by step**.
4. Prepare a notice, download the PDF, print a postal label, or open email and WhatsApp drafts.
5. Ask what happens if the landlord does not reply.
6. Type: **"Rs 20000 was taken from my account by UPI fraud just now."**
7. Show that no questions appear and 1930 is presented immediately.
8. Switch to Marathi, then Urdu, and test the right-to-left layout.
9. Turn JavaScript off and repeat a journey on an old-phone-sized viewport. -->

---

## Trust and safety

- No accounts or login.
- Typed problems are not stored.
- Aadhaar, PAN, phone, card, bank, UPI, and OTP-like numbers are masked before AI use.
- Result links are signed and expire after seven days.
- Strict security headers, origin checks, size limits, and rate limiting are enabled.
- Screen-reader labels, 44-pixel touch targets, reduced-motion support, and accessible forms are included.
- Drafts are never described as filings.
- Real filing integrations remain clearly labelled as demos until credentials and a tenant are available.
- Every result says that Raasta provides procedural guidance based on public rules and not legal advice.

Full controls are documented in [Security](docs/SECURITY.md).

---

## Technology

| Area | Implementation |
|---|---|
| Front end | React 19, Preact in production, Vite, Tailwind 4 |
| Server | Cloudflare Worker with Hono |
| Hosting | Cloudflare Pages and a Worker on the same hostname |
| Data | KV, D1, typed schemas, and a verified public-source registry |
| AI | Gemini first, Cloudflare Workers AI, Ollama locally, with keyword fallback |
| Documents | pdf-lib, print layouts, email, and WhatsApp builders |
| Languages | 12 languages and 5,500-plus translated lines |
| Quality | 275 automated tests and 168 real-browser checks |

### Architecture

```text
Browser
  |
  +--> Cloudflare Pages
  |      prerendered 12-language pages
  |
  +--> Cloudflare Worker
         |
         +--> PII redaction
         +--> AI slot extraction
         +--> deterministic rules
         +--> verified registry
         +--> documents and chat
         +--> KV and D1
```

The AI only fills in facts. Routes, URLs, fees, phone numbers, and deadlines come from the registry.

---

## Scale

Raasta has already crossed the prototype stage:

- 19 everyday dispute types
- 36 states and union territories
- 12 languages
- About 730 prerendered pages
- 22 official platforms in the verified registry
- 275 automated tests
- 168 browser checks at phone, tablet, and desktop sizes
- Core journeys that work without JavaScript
- Cloudflare deployment with almost no server cost

The next stages are:

1. Add BHASHINI live translation and speech once credentials are approved.
2. Connect approved DIGIT or UPYOG cities to real civic complaint tracking.
3. Verify each state's grievance portal and keep a fallback national route.
4. Integrate more deeply with Tele-Law, NALSA, and Lok Adalats.
5. Reach people through Common Service Centres, SMS, and voice calls.

---

## Run locally

### Requirements

- Node.js 22
- npm 10
- Git
- Optional: Ollama with `qwen3.5:4b`

No Cloudflare account or API key is required for a local run.

```powershell
npm run local
```

This builds the site, creates local KV and D1 state, and starts:

- Website: http://localhost:4173
- Local API: http://127.0.0.1:8787
- Health check: http://localhost:4173/api/health

The local run does not contact the hosted website.

### Optional local AI

```powershell
ollama pull qwen3.5:4b
```

Without Ollama, Raasta uses Gemini or Workers AI when configured and then falls back to keywords.

## Validate

```powershell
npm test
npm run typecheck
```

Browser journeys and accessibility checks:

```powershell
cd qa/agy
npx playwright test
```

Set `BASE_URL` to test another deployed or local environment.

---

## Repository map

```text
apps/web         Prerendered website
apps/api         Hono Worker for API and dynamic routes
packages/data    Verified registry and dispute data
packages/rules   Routing engine, guardrails, timers, and redaction
packages/i18n    12-language content and RTL support
packages/docs-gen Letters, PDFs, labels, email, and WhatsApp drafts
scripts/         Local runner, ingestion, and build guards
qa/              Playwright, Ollama, and browser QA
docs/            Product, architecture, design, security, and deployment
```

## Documentation

| Resource | Purpose |
|---|---|
| [Run guide](run.md) | Local setup and validation |
| [Deployment](docs/DEPLOY.md) | Cloudflare Pages and Worker deployment |
| [Product](docs/PRODUCT.md) | Users, scope, evidence, and challenge |
| [Design system](docs/DESIGN.md) | Visual language and street-of-doors pattern |
| [Contracts](docs/CONTRACTS.md) | Package boundaries and codebase rules |
| [Security](docs/SECURITY.md) | Security controls |
| [Roadmap](docs/ROADMAP.md) | Built features and next steps |
| [Ship checklist](docs/CHECKLIST.md) | Pre-deployment checks |

---

**Every person deserves to know which door to knock on.**
