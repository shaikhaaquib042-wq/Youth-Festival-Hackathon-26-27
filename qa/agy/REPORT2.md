# QA PASS 2 TEST REPORT

**Date:** 2026-11-21  
**Target Environment:** Base URL `http://localhost:5173` (Vite dev server proxying `/r` and `/api` to Cloudflare Worker on `http://127.0.0.1:8787`)  
**Test Framework:** Playwright (Chromium) and axe-core (@axe-core/playwright)  
**Test Suite Directory:** `qa/agy/e2e/`  

---

## 1. Executive Summary

A comprehensive automated QA Pass 2 test suite was developed and executed across the Raasta legal intake and citizen rights application. Testing evaluated core interactive user journeys across multiple mobile, tablet, and desktop viewports (375px, 768px, 1280px), JavaScript-disabled accessibility journeys at 360x640, responsive stability across 16 static routes across 8 viewports (320px to 1920px), automated axe-core WCAG 2.1 AA accessibility audits across static and dynamic paths, and language/script direction attributes.

### Key Outcomes
* **Interactive Journeys (JS Enabled):** 3 of 4 user journeys passed end to end. Landlord deposit flow successfully generated pre-filled legal intimation notices and PDF downloads. The civic failure pothole flow confirmed proper conditional branch skipping. The sexual assault crisis guardrail cleanly routed to emergency `tel:112` and suppressed monetary/commercial questions. However, UPI fraud intake with temporal phrasing ("just now") failed to trigger the top-level emergency banner due to an intake keyword regex gap.
* **Non-JS Graceful Degradation:** The civic failure flow operated cleanly without JavaScript. However, the root route (`/`) delivered an empty single-page application shell without the complaint intake textarea in the local Vite dev environment, preventing the start of non-JS intake from `/`. When tested directly against the SSR intake route (`/r/ask`), the landlord deposit journey completed end to end to PDF download without JavaScript.
* **Layout and Responsive Quality:** Exactly one `<h1>` tag was validated on all 16 static routes. Urdu (`/ur/`) properly renders `dir="rtl"` and Marathi (`/mr/`) renders `lang="mr"`. One horizontal scroll overflow was discovered on `/privacy` at 320px viewport width caused by an unconstrained data retention table.
* **Console Health:** All 16 static pages emitted React 19 hydration mismatch console errors on client hydration between the prerendered HTML shell and client components.
* **Accessibility (axe-core):** Two serious WCAG violations were identified: WCAG 2.5.3 (Label in Name mismatch on header location and language chips across all pages) and WCAG 1.4.3 (Insufficient color contrast on topic categories on `/help` and `/help/money`).

---

## 2. Test Execution Summary Table

| Test Suite / Requirement | Viewports / Configurations | Tests Executed | Tests Passed | Tests Failed | Status | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **2a(i) Landlord Deposit Journey** | 375px, 768px, 1280px | 3 | 3 | 0 | **PASS** | Completes intake, follow-up, result page (step, door, docs), letter form, and PDF download. |
| **2a(ii) Civic Failure Pothole Flow** | 375px, 768px, 1280px | 3 | 3 | 0 | **PASS** | Answering "No" to previous complaint skips "how many days ago" question and finishes to result. |
| **2a(iii) UPI Fraud Emergency Flow** | 375px, 768px, 1280px | 3 | 0 | 3 | **FAIL** | Result page displays 1930 in primary card, but misses emergency alert banner at top. |
| **2a(iv) Sexual Assault Crisis Safety** | 375px, 768px, 1280px | 3 | 3 | 0 | **PASS** | Displays `tel:112` immediately; all monetary/compensation questions are suppressed. |
| **2b(i) Non-JS Landlord Deposit Journey** | 360x640 (JS disabled) | 2 | 1 | 1 | **PARTIAL** | Fails from root `/` (dev server SPA shell empty); passes completely via SSR `/r/ask` to PDF. |
| **2b(ii) Non-JS Pothole Flow** | 360x640 (JS disabled) | 1 | 1 | 0 | **PASS** | Native HTML POSTs successfully navigate steps, skip conditional question, and reach result. |
| **2b(iii) Non-JS UPI Fraud Flow** | 360x640 (JS disabled) | 2 | 0 | 2 | **FAIL** | Blocked at `/` due to SPA shell; on SSR `/r/ask` misses top emergency banner due to slot gap. |
| **2c Horizontal Scroll (scrollWidth <= clientWidth)** | 16 pages x 8 viewports (320px to 1920px) | 128 | 127 | 1 | **FAIL** | `/privacy` fails at 320px viewport width (scrollWidth 351px > clientWidth 320px). |
| **2c Heading Structure (Exactly 1 H1)** | 16 static pages | 16 | 16 | 0 | **PASS** | All static pages maintain exactly one `<h1>` semantic header tag. |
| **2c Zero Console Errors** | 16 static pages | 16 | 0 | 16 | **FAIL** | React 19 hydration mismatch console errors on all static pages during client mount. |
| **2d Accessibility: Static Pages (axe-core)** | 16 static pages | 16 | 0 | 16 | **FAIL** | Header chips trigger serious WCAG 2.5.3 on all pages; `/help` has serious WCAG 1.4.3. |
| **2d Accessibility: Dynamic Routes (axe-core)** | Result, Flow, Letter, Chat, Guide | 5 | 0 | 5 | **FAIL** | Shared layout header chips trigger serious WCAG 2.5.3 violation across all dynamic views. |
| **2e Locale & Direction Attributes** | `/ur/` (Urdu) and `/mr/` (Marathi) | 2 | 2 | 0 | **PASS** | `/ur/` has `dir="rtl"`, `/mr/` has `lang="mr"`. |
| **Total Test Assertions** | | **200** | **156** | **44** | | |

---

## 3. Ranked List of Findings

### FINDING-QA2-01: Cyber Fraud Intake Misses "just now" Phrasing in Emergency Urgency Classification
* **Severity:** High
* **Impact:** Immediate safety / financial recovery risk. UPI fraud victims reporting crime right after occurrence are denied the critical golden window emergency banner with prominent `tel:1930` call link.
* **Page / File:** `apps/api/src/ai/keyword.ts` (line 60) and `packages/rules/src/tables/cyber_fraud.ts` (line 5)
* **Reproduction Steps:**
  1. Navigate to `http://localhost:5173/`.
  2. Input: `Rs 20000 was taken from my account by UPI fraud just now`.
  3. Click "Show me the door" (`button[type="submit"]`).
  4. Inspect the resulting route page (`/r/route/:token`).
  5. Observe the top of the page: The emergency alert section (`.alert`, `.res-hero`) is absent. The 1930 helpline only appears deeper down inside the primary door card as standard secondary metadata.
* **Root Cause:**
  In `apps/api/src/ai/keyword.ts`:
  ```ts
  if (/\b(?:today|yesterday|days?|months?|years?|right now)\b/i.test(text)) {
    // parses temporal units
  }
  ```
  The regex matches `\bright now\b` but omits `just now`, `earlier today`, or `few minutes ago`. Consequently, `days_since_incident` is `undefined`, and the rule engine marks `urgency: "time_sensitive"` instead of `urgency: "emergency"`.
* **Suggested Fix:**
  Update regex in `apps/api/src/ai/keyword.ts` line 60:
  ```ts
  if (/\b(?:today|yesterday|days?|months?|years?|right now|just now|earlier today)\b/i.test(text)) {
  ```
  And when text contains `just now`, `right now`, or `today`, explicitly set `days_since_incident: 0` and `slots.is_emergency = true`.

---

### FINDING-QA2-02: Root Landing Route Delivers Empty SPA Shell Without Form Elements When JavaScript is Disabled
* **Severity:** High
* **Impact:** Non-JS users and assistive technology users operating without client scripts cannot submit complaints from the root landing page.
* **Page / File:** `apps/web/index.html`, `apps/web/vite.config.ts`, `apps/api/src/views/Landing.tsx`
* **Reproduction Steps:**
  1. Launch Chromium with JavaScript disabled: `browser.newContext({ javaScriptEnabled: false })`.
  2. Navigate to `http://localhost:5173/`.
  3. Inspect the DOM for `#ask-text` or `<form action="/r/ask">`.
  4. The page only contains `<div id="root"></div>` and script tags. The interactive form is never rendered.
* **Root Cause:**
  Vite dev server serves `apps/web/index.html` without running server-side rendering or prerendering middleware. While the production build outputs prerendered HTML in `dist/`, local development and dev proxy mode leave the root route unusable without JavaScript. The SSR worker provides a working non-JS fallback form at `/r/ask`, but incoming visitors to `/` are stranded.
* **Suggested Fix:**
  Configure the Vite development proxy or SSR middleware so that requests without JavaScript or requests to `/` fall back to the SSR landing template in `apps/api/src/views/Landing.tsx` or inject prerendered HTML into `#root`. Alternatively, provide a `<noscript>` block in `apps/web/index.html` redirecting to `/r/ask`:
  ```html
  <noscript>
    <meta http-equiv="refresh" content="0;url=/r/ask" />
  </noscript>
  ```

---

### FINDING-QA2-03: React 19 Client-Side Hydration Mismatch Across All Static Pages
* **Severity:** High
* **Impact:** Performance degradation, potential UI flickering, and dropped event handlers during page mount across all 16 static routes.
* **Page / File:** `apps/web/src/components/Shell.tsx`, `apps/web/src/entry-client.tsx`
* **Reproduction Steps:**
  1. Open the browser console on `http://localhost:5173/` or any static page (`/help`, `/about`, `/emergency`).
  2. Observe console errors:
     `Error: Hydration failed because the server rendered HTML didn't match the client. As a result this tree will be regenerated on the client.`
     `Warning: An error occurred during hydration. The server HTML was replaced with client content in <#document>.`
* **Root Cause:**
  The server prerendered HTML contains DOM structure differences relative to the client React component tree generated by `Shell.tsx` (such as the skip-link `<a className="skip-link" href="#main">` location, data attributes on header chip summaries, or language switcher markup). React 19 treats hydration mismatches as fatal to the SSR tree and unmounts/remounts the DOM.
* **Suggested Fix:**
  Align the static prerendering layout in `apps/web/src/prerender.tsx` and `apps/web/index.html` with `apps/web/src/components/Shell.tsx`. Ensure all tags, classes, and initial default attributes match between server HTML and client initial render.

---

### FINDING-QA2-04: Header Summary Chips Violate Accessible Name Specification (WCAG 2.5.3)
* **Severity:** Serious (WCAG Level A Violation)
* **Impact:** Speech-recognition users (Dragon NaturallySpeaking, Voice Control) who speak the visible button text ("Click Set location" or "Click English") cannot activate the controls because the accessible name completely differs from the visible text.
* **Page / File:** `apps/web/src/components/Shell.tsx` and `apps/api/src/views/Layout.tsx`
* **Reproduction Steps:**
  1. Inspect the location chip:
     `<summary class="sh-chip" data-loc-chip="" aria-label="Set your state and city">Set location</summary>`
  2. Inspect the language chip:
     `<summary class="sh-chip" aria-label="Choose your language">English</summary>`
  3. Run axe-core: flags `label-content-name-mismatch` on both elements.
* **Root Cause:**
  WCAG 2.5.3 requires that for elements with visible text labels, the accessible name must contain the visible text. Specifying `aria-label="Set your state and city"` overrides the visible string "Set location" rather than including it.
* **Suggested Fix:**
  Update the `aria-label` attribute values in `apps/web/src/components/Shell.tsx` and `apps/api/src/views/Layout.tsx` to prepend the visible text label:
  ```tsx
  <summary className="sh-chip" data-loc-chip="" aria-label="Set location: choose your state and city">
    {locText}
  </summary>

  <summary className="sh-chip" aria-label={`Language: ${currentLangName}, choose language`}>
    {currentLangName}
  </summary>
  ```

---

### FINDING-QA2-05: Horizontal Viewport Overflow on `/privacy` at 320px Mobile Screen Width
* **Severity:** Medium
* **Impact:** Broken layout and horizontal page scrolling on compact mobile devices (iPhone SE, small Android handsets).
* **Page / File:** `apps/web/src/pages/Legal.tsx`, `apps/web/src/styles/pages.css`
* **Reproduction Steps:**
  1. Set browser viewport to 320px width and 568px height.
  2. Navigate to `http://localhost:5173/privacy`.
  3. Evaluate `document.documentElement.scrollWidth` versus `document.documentElement.clientWidth`.
  4. Observed: `scrollWidth` is 351px while `clientWidth` is 320px (31px horizontal overflow).
* **Root Cause:**
  The Data Retention Periods table inside `/privacy` contains multi-column headers and content cells whose non-breaking minimum text width forces the `<table>` element to expand to 351px, overflowing the viewport container without a scroll wrapper.
* **Suggested Fix:**
  In `apps/web/src/pages/Legal.tsx`, wrap data tables in an overflow container:
  ```tsx
  <div className="table-scroll-wrap">
    <table>...</table>
  </div>
  ```
  And in `apps/web/src/styles/pages.css`, add:
  ```css
  .table-scroll-wrap {
    width: 100%;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }
  ```

---

### FINDING-QA2-06: Insufficient Text Color Contrast on `/help` and `/help/money` Category Listings (WCAG 1.4.3)
* **Severity:** Serious (WCAG Level AA Violation)
* **Impact:** Low-vision users and users viewing screens in bright daylight or outdoors cannot comfortably read topic titles and category descriptions.
* **Page / File:** `apps/web/src/pages/Help.tsx`, `apps/web/src/styles/pages.css`
* **Reproduction Steps:**
  1. Navigate to `http://localhost:5173/help`.
  2. Run axe-core accessibility audit.
  3. Observed violations:
     * Category description `.help-desc` under police complaint: `#768178` on `#fefefc` (contrast ratio 4.01:1, requires 4.5:1).
     * Category title `.help-name` under cyber fraud: `#9ea39c` on `#fdfcf9` (contrast ratio 2.5:1, requires 3:1).
     * Category description `.help-desc` under cyber fraud: `#b2b8b0` on `#fdfcf9` (contrast ratio 1.97:1, requires 4.5:1).
* **Root Cause:**
  The CSS classes for topic categories use muted tertiary gray-green colors for descriptions and category headers that do not meet WCAG AA minimum threshold ratios against the off-white background.
* **Suggested Fix:**
  In `apps/web/src/styles/pages.css`, update the text color tokens for help cards:
  ```css
  .help-name {
    color: #2b332c; /* Contrast ratio > 10:1 */
  }
  .help-desc {
    color: #49544b; /* Contrast ratio > 6.5:1 */
  }
  ```

---

## 4. Test Suite Implementation Details

The test suites created under `qa/agy/e2e/` provide continuous end to end coverage:

1. [journeys.spec.ts](file:///C:/Users/notch/OneDrive/Desktop/Hackathon/raasta/qa/agy/e2e/journeys.spec.ts):
   Tests complete intake flows across 375px, 768px, and 1280px viewports covering landlord deposit recovery with PDF notice generation, civic failure pothole skip logic, UPI fraud emergency triage, and sexual assault safety guardrails.
2. [no-js-journeys.spec.ts](file:///C:/Users/notch/OneDrive/Desktop/Hackathon/raasta/qa/agy/e2e/no-js-journeys.spec.ts):
   Tests core user flows at 360x640 with `javaScriptEnabled: false`, confirming progressive enhancement across native HTML `<form method="POST">` actions and SSR fallbacks.
3. [static-pages.spec.ts](file:///C:/Users/notch/OneDrive/Desktop/Hackathon/raasta/qa/agy/e2e/static-pages.spec.ts):
   Tests 16 static routes across 8 responsive breakpoints (320px to 1920px), verifying zero horizontal scroll, strict single `<h1>` heading semantics, zero console errors, RTL directionality on `/ur/`, and Marathi `lang="mr"` tagging on `/mr/`.
4. [a11y-axe.spec.ts](file:///C:/Users/notch/OneDrive/Desktop/Hackathon/raasta/qa/agy/e2e/a11y-axe.spec.ts):
   Injects `@axe-core/playwright` across all static pages, result views, multi-step flows, letter generation forms, chat, and guide interfaces to catch serious and critical accessibility barriers.
