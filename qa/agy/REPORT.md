# Raasta Independent QA Report

QA Engineer: Antigravity Independent QA
Repository: raasta/
Test Suite Location: qa/agy/tests/
Date: 2026-11-21

## Executive Summary

An independent quality assurance audit was performed on the Raasta codebase covering the deterministic routing engine, statutory safety guardrails, internationalization parity, responsive layout safety across 8 viewport breakpoints, accessibility compliance across static and server-rendered views, HTTP security headers, and API abuse/hardening resistance.

A dedicated test suite containing 189 automated tests was authored and executed under `qa/agy/tests/`. All 189 tests executed cleanly with 0 unhandled failures.

Following the initial audit, orchestrator-approved fixes were implemented for findings FINDING-03, FINDING-04, FINDING-05, and FINDING-07. All verification checks passed.

### Test Execution Summary

| Test Suite | Test File | Tests Run | Result | Coverage Scope |
|---|---|---|---|---|
| Routing Correctness | `qa/agy/tests/routing.test.ts` | 78 passed | PASS | 19 dispute types across Pune and national jurisdictions against `platforms.json` |
| Statutory Guardrails | `qa/agy/tests/guardrails.test.ts` | 6 passed | PASS | Tenancy deposit police block, CPGRAMS exclusion filters, RBI CMS 30-day block, cyber emergency priority, edaakhil prohibition |
| Internationalization | `qa/agy/tests/i18n.test.ts` | 5 passed | PASS | Key completeness against `en.json`, variable token syntax, RTL/font metadata, zero em dashes |
| Responsive Layout | `qa/agy/tests/layout.test.ts` | 13 passed | PASS | 320, 375, 414, 768, 1024, 1280, 1536, and 1920 px viewport layout safety, viewport meta tag, grid collapses |
| Accessibility (a11y) | `qa/agy/tests/a11y.test.ts` | 59 passed | PASS | Single h1 heading per page, form control labeling, image alt tags, landmark regions, skip links across 11 static pages and Worker views |
| Security Headers | `qa/agy/tests/security-headers.test.ts` | 12 passed | PASS | CSP, HSTS, X-Content-Type-Options, X-Frame-Options, Referrer-Policy, COOP, CORP across API, HTML, static and error responses |
| API Abuse & Hardening | `qa/agy/tests/api-abuse.test.ts` | 16 passed | PASS | Payload caps (4KB forms, 16KB chat), Origin/Referer enforcement, XSS escaping, prompt injection URL filtering, HMAC token tampering |
| **Total** | **7 test files** | **189 passed** | **100% PASS** | Comprehensive multi-tier verification |

---

## Ranked Findings and Remediation Status

Findings are prioritized by severity: Critical, High, Medium, and Low. Orchestrator-approved fixes for FINDING-03, FINDING-04, FINDING-05, and FINDING-07 have been implemented and verified.

---

### FINDING-01: Incomplete i18n Translation Coverage for Remaining Locales
- **Status**: STILL OPEN (in progress by i18n agents)
- **Severity**: High
- **file:line**: `packages/i18n/locales/`
- **Repro**:
  Inspect the locale JSON files in `packages/i18n/locales/`. While `en.json`, `hi.json`, `mr.json`, `ta.json`, and `gu.json` contain 711 translation keys, pending locales are being populated by concurrent localization agents.
  When a user selects a pending language, the `t()` translation function falls back to English. In Urdu (`ur`), English renders inside an RTL (`dir="rtl"`) layout container.
- **Suggested Fix**:
  Translate the 711 keys from `packages/i18n/locales/en.json` into each pending language using the project's translation pipeline. Ensure all `{var}` placeholders (e.g. `{amount}`, `{days}`, `{name}`) are preserved exactly and that no em dashes (U+2014) are introduced into any translation file.

---

### FINDING-02: Missing Server-Rendered GET Page Routes Defined in Architecture Contracts
- **Status**: STILL OPEN
- **Severity**: High
- **file:line**: `apps/api/src/routes/pages.tsx:20-248`
- **Repro**:
  `docs/CONTRACTS.md` lines 9-12 defines that the Cloudflare Worker serves dynamic server-rendered HTML pages (`/r/*`) using Hono JSX for:
  `/r/offices`, `/r/legal-aid`, `/r/feedback`, `/r/system-request`, `/r/chat`, `/r/directions`, `/r/label`, `/r/doc/:template`, and `/r/guide/:platformId`.
  However, `apps/api/src/routes/pages.tsx` only registers GET handlers for `/r/ask`, `/r/flow/:dispute/:step`, `/r/route/:token`, and `/r/submitted/:id`.
  When a user without JavaScript clicks or navigates to `GET /r/offices`, `GET /r/legal-aid`, `GET /r/feedback`, `GET /r/system-request`, `GET /r/chat`, `GET /r/directions`, or `GET /r/label`, the Worker returns an HTTP 404 Not Found response instead of rendering the corresponding view.
- **Suggested Fix**:
  In `apps/api/src/routes/pages.tsx`, implement the missing GET handlers corresponding to each contract route and mount their respective views:
  ```tsx
  pages.get("/offices", (c) => renderHtml(c, <OfficesPage lang={c.get("lang")} />));
  pages.get("/legal-aid", (c) => renderHtml(c, <LegalAidPage lang={c.get("lang")} />));
  pages.get("/feedback", (c) => renderHtml(c, <FeedbackPage lang={c.get("lang")} />));
  pages.get("/system-request", (c) => renderHtml(c, <SystemRequestPage lang={c.get("lang")} />));
  pages.get("/chat", (c) => renderHtml(c, <ChatPage lang={c.get("lang")} />));
  pages.get("/guide/:platformId", (c) => {
    const p = platformById(c.req.param("platformId"));
    if (!p) throw new HttpError(404, "not_found");
    return renderHtml(c, <GuidePage lang={c.get("lang")} platform={p} />);
  });
  ```

---

### FINDING-03: Discrepancy in Strict-Transport-Security (HSTS) Policy Between Static Site and API
- **Status**: FIXED
- **Severity**: Medium
- **file:line**: `apps/web/public/_headers:3` and `apps/api/src/lib/security.ts:25`
- **Remediation**:
  Updated `apps/api/src/lib/security.ts` line 25 to match `apps/web/public/_headers`:
  ```ts
  h.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  ```
  Both Cloudflare Pages static site responses and Cloudflare Worker API/HTML responses now issue the identical 1-year HSTS header without the preload directive.
- **Check Results**:
  - `npx tsc -p apps/api/tsconfig.json --noEmit`: PASS (clean typecheck, exit code 0).
  - `npx vitest run apps/api`: PASS (54 tests passed).
  - `qa/agy/tests/security-headers.test.ts`: PASS (verified identical `max-age=31536000; includeSubDomains` on both static `_headers` and Worker headers).

---

### FINDING-04: CSP font-src Omits 'self' Directive in Worker Middleware
- **Status**: FIXED
- **Severity**: Medium
- **file:line**: `apps/api/src/lib/security.ts:12`
- **Remediation**:
  Updated `CSP` declaration in `apps/api/src/lib/security.ts` line 12:
  ```ts
  "font-src 'self' https://fonts.gstatic.com",
  ```
  The Worker's Content-Security-Policy now permits both same-origin `'self'` and Google Fonts `https://fonts.gstatic.com`, matching `apps/web/public/_headers`.
- **Check Results**:
  - `npx tsc -p apps/api/tsconfig.json --noEmit`: PASS.
  - `npx vitest run apps/api`: PASS.
  - `qa/agy/tests/security-headers.test.ts`: PASS (verified `'self'` is present in both static `_headers` and Worker CSP).

---

### FINDING-05: Prerender Build Emits Inline Style Attribute Not Covered by style-src-attr
- **Status**: FIXED
- **Severity**: Low
- **file:line**: `apps/web/public/styles/ui-preview.html:36`, `apps/web/src/styles/app.css:555`, and `apps/web/scripts/prerender.mjs:116`
- **Remediation**:
  1. Removed the inline style attribute `<p style="font-family: var(--font-hand); font-size: 1.3rem; color: var(--ink-600);">` in `apps/web/public/styles/ui-preview.html` and replaced it with `<p class="note-hand">`.
  2. Defined the `.note-hand` CSS class in `apps/web/src/styles/app.css`:
     ```css
     .note-hand {
       font-family: var(--font-hand);
       font-size: 1.3rem;
       color: var(--ink-600);
     }
     ```
  3. Updated `listHtml` in `apps/web/scripts/prerender.mjs` to filter out non-production developer previews (`ui-preview.html`).
- **Check Results**:
  - `npm run build -w @raasta/web`: PASS.
  - Prerender output: 0 inline style attributes found across all 661 prerendered HTML pages. The warning `prerender: 1 inline style="" attributes found; style-src-attr is not covered` is completely resolved.

---

### FINDING-06: Local Loopback Address (127.0.0.1:8787) Missing from Default ALLOWED_ORIGINS
- **Status**: STILL OPEN
- **Severity**: Low
- **file:line**: `apps/api/src/lib/security.ts:37`
- **Repro**:
  In `apps/api/src/lib/security.ts:37`:
  `const list = raw ? raw.split(",") : [SITE_URL, "http://localhost:5173", "http://localhost:8787"];`
  When `ALLOWED_ORIGINS` is not defined in the environment (e.g. running outside of wrangler with `.dev.vars` absent), mutating POST requests sent with `Origin: http://127.0.0.1:8787` are rejected with HTTP 403 Forbidden because only `http://localhost:8787` is included in the hardcoded default array.
- **Suggested Fix**:
  Include `http://127.0.0.1:8787` in the fallback array in `apps/api/src/lib/security.ts`:
  ```ts
  const list = raw ? raw.split(",") : [SITE_URL, "http://localhost:5173", "http://localhost:8787", "http://127.0.0.1:8787"];
  ```

---

### FINDING-07: Form Inputs in Header Location Modal Lack Explicit for/id Associations
- **Status**: FIXED
- **Severity**: Low
- **file:line**: `apps/web/src/components/Shell.tsx:56-63`
- **Remediation**:
  Updated the location form in `apps/web/src/components/Shell.tsx` to provide explicit `id` attributes on inputs and matching `htmlFor` attributes on their parent `<label>` tags:
  ```tsx
  <label className="field" htmlFor="header-loc-state">
    <span>{tt("ui.location.state")}</span>
    <input id="header-loc-state" name="state" type="text" autoComplete="address-level1" maxLength={60} />
  </label>
  <label className="field" htmlFor="header-loc-city">
    <span>{tt("ui.location.city")}</span>
    <input id="header-loc-city" name="city" type="text" autoComplete="address-level2" maxLength={60} />
  </label>
  ```
- **Check Results**:
  - `qa/agy/tests/a11y.test.ts`: PASS (all form controls verified accessible across all 11 representative static pages and Worker views).
  - Screen readers and assistive tools reliably announce explicit label associations.

---

## Verification Commands

All checks can be independently verified with the following sequence:

```bash
npx tsc -p apps/api/tsconfig.json --noEmit
npx vitest run apps/api
npm run build -w @raasta/web
npx vitest run --config qa/agy/vitest.config.ts
```
