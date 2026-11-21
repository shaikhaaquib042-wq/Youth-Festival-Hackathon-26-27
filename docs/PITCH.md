# Raasta pitch

## The problem

When someone's deposit is not returned, a product is faulty, wages are unpaid, money vanishes through UPI fraud or a pothole goes unfixed, the hardest part is often the first question: **which office handles this?** Police, consumer commission, labour office, ward office, Lok Adalat, banking ombudsman, free legal aid. People give up or go to whoever they know. Small disputes harden into lasting conflict.

Sourced figure: in the DAKSH Access to Justice survey, 74% of people first turn to friends and family when they face a dispute.

## The answer

Raasta, "the way" in Hindi and Marathi. One sentence in, one clear route out:
1. **Start here**: the free, peaceful first step (or "stay safe" first, when it is urgent)
2. **The right door**: the office or portal, fees, time, documents and a ready letter
3. **If that does not work**: the next door, folded away until needed

## Demo script (3 minutes)

1. Landing: the street of doors. Type "my landlord is not returning my deposit of 30000". Two questions, then the result: the right door glows and opens.
2. "Show me how, step by step": numbered plain steps with big highlighted buttons (open the portal, call, WhatsApp, make the letter). Tap "Use my current location" and the doors and offices follow your state.
3. Prepare the letter: the office is prefilled, download the PDF, print a postal label.
4. Ask a follow-up in the assistant: "what if they do not reply?"
5. Type "Rs 20000 was taken by UPI fraud just now": no questions, "Act now, Call 1930" at the top.
6. Switch to Marathi, then Urdu (right to left). Same journey.
7. Open the legal aid check: tick a box, see eligibility for a free lawyer.
8. Turn JavaScript off: the same journey still works on a plain HTML form.

## Step-by-step guides

Where a door has no filing API (almost every government portal), Raasta shows a plain guide instead: one action per step, Class 8 English (translated into 11 languages), and each step's link as a highlighted button. Guides live in `packages/data/src/howto.json` as references to registry keys, never raw URLs, so a test proves every link and phone number comes from the verified registry. Steps adapt to the state and city: the Maharashtra lost-phone form only in Maharashtra, the right corporation portal in each metro, the state legal services office everywhere.

## Architecture

```
Browser (any phone, JS optional)
   │  same origin, no CORS
   ▼
raasta.safalmutha.in ──► Cloudflare Pages: 670 prerendered pages, 12 languages
        │ /api/*, /r/*
        ▼
Cloudflare Worker (Hono)
   ├─ intake: redact PII ─► AI (Gemini ─► Workers AI ─► keywords) ─► slots
   ├─ rules: deterministic route(slots, geo) + guardrails  ◄── packages/data (verified registry)
   ├─ docs: letters, PDF, labels, email, WhatsApp
   └─ KV cache, D1 feedback, rate limits
```

The AI only fills in facts. Every route, URL, fee, phone number and deadline comes from the verified registry through a deterministic rule engine, so the answer cannot be invented.

## Honesty rules

No fake numbers, testimonials or logos. Drafts are never called filings. The demo filing sandbox is labelled. Every result says: "Raasta gives procedural guidance based on public government rules. It is not legal advice."
