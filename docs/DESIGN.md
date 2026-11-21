# Raasta design system

Raasta helps someone find the right Indian authority for an everyday dispute. The look is calm, warm and trustworthy: closer to a well-kept municipal office with a friendly front desk than to a bank or a startup. It is slightly more formal than HopeMeals, never cold, and never jokey on dispute screens.

Tokens live in `apps/web/public/styles/raasta.css` (`:root`). This file is the reference for why they exist. Worker HTML and React pages both use the same stylesheet.

## 1. Colour tokens

Hex values are fixed. Use the CSS variable names shown.

| Token | Hex | CSS variable | Use |
|---|---|---|---|
| ink | `#1D2B22` | `--ink` | Headings, strong text |
| ink-700 | `#3B4A40` | `--ink-700` | Body text, labels |
| ink-600 | `#4E5D53` | `--ink-600` | Secondary text |
| ink-500 | `#66756B` | `--ink-500` | Meta, placeholders, captions |
| saffron-700 | `#E56420` | `--saffron-700` | Primary pill button fill only, white bold text |
| saffron-500 | `#FF8C42` | `--saffron-500` | Accents, nav underline, door warm glow. Never under white text |
| saffron-600 | `#F57A2F` | `--saffron-600` | Accent marks, path line. Never under white text |
| saffron-50 | `#FFF5EB` | `--saffron-50` | Warm grounds |
| saffron-100 | `#FFE6CC` | `--saffron-100` | Warm card fill, notice ground |
| leaf-700 | `#2D7341` | `--leaf-700` | Links, focus ring, success text, "free" text |
| leaf-600 | `#3D8854` | `--leaf-600` | Rules, check marks, theme colour |
| leaf-200 | `#A2E0B4` | `--leaf-200` | Completed steps, filled checklist boxes |
| sage-50 | `#F4F8F2` | `--sage-50` | Alternate ground |
| sage-100 | `#E6EFE2` | `--sage-100` | Card borders, chips |
| sage-200 | `#D3E3CB` | `--sage-200` | Dividers, hill shapes |
| sage-400 | `#8FB57F` | `--sage-400` | Decorative hills, icons on light grounds |
| chakra-700 | `#1F3A8A` | `--chakra-700` | Info notices only, sparingly |
| alert-700 | `#B91C1C` | `--alert-700` | Emergency screen, form errors |
| paper | `#FFFFFF` | `--paper` | Cards and fields |
| ground | `#FBF9F4` | `--ground` | Page background, pale warm ground |

Contrast notes: `ink-500` on `ground` is above 4.5:1. White text appears only on `saffron-700` (bold, 16px or larger) and `leaf-700` or `alert-700` fills. Orange text on white is not used.

Rules:
- One solid `saffron-700` button per view.
- Leaf green is for things that succeed or are free, never for decoration.
- Chakra navy appears only in info notices.
- No raw Tailwind palette colours in JSX or HTML.

## 2. Typography

- **Baloo 2** (weight 600, sometimes 700 at small headings) for display and headings. Never 800 or 900, never extrabold.
- **Nunito** (400 to 800) for body, labels and buttons.
- **Caveat** (600) for one short handwritten aside per page at most. Never on result screens. Never on headings, buttons, form labels or anything someone needs to act on.
- **Per-script siblings**: Baloo Da 2 (Bengali, Assamese), Baloo Bhai 2 (Gujarati), Baloo Thambi 2 (Tamil), Baloo Tamma 2 (Kannada), Baloo Tammudu 2 (Telugu), Baloo Chettan 2 (Malayalam), Baloo Paaji 2 (Gurmukhi), Baloo Bhaina 2 (Odia). Devanagari (Marathi, Hindi) uses Baloo 2 directly. Urdu uses Noto Nastaliq Urdu and is set right to left.
- Load only the font for the active language. Fonts come from one Google Fonts `<link>` with `display=swap`. Skip web fonts entirely when `Save-Data` is on, and fall back to the system UI stack.
- Body size 17px on phones, 18px on desktop. Line height 1.6. Headings use `text-wrap: balance`.
- Max two font files per page.

## 3. Shape

- Buttons: full pill (`999px`), minimum 44px tall, default 50px.
- Cards: 24 to 34px radius. Panels: 32 to 56px. Fields: 14px. Chips: pill.
- Shadows: soft, wide, tinted with forest ink, low opacity, negative spread. Example: `0 18px 48px -24px rgba(29, 43, 34, 0.22)`. No black, no hard offset shadows.
- Section edges: SVG waves (`.wave-top`, `.wave-bottom`) instead of hard rules.
- Blobs: a few large, very pale saffron or sage shapes behind hero content, never behind text blocks that need contrast.
- Borders: 1px `sage-100`. No thick coloured side borders.

## 4. Motion

- Animate only `transform` and `opacity`.
- Easing: `cubic-bezier(0.16, 1, 0.3, 1)`.
- Durations: 240 to 520ms. Nothing longer than 520ms except the street-of-doors path draw, which is capped at 900ms.
- Hover lift: `translateY(-2px)` with a softer glow (`.lift`).
- Checklist ticks draw in. Stepper completed states fill. Timers count.
- Page-level motion is progressive enhancement only. Prerendered content is visible without JS.
- `prefers-reduced-motion: reduce` collapses all transitions and animations to near zero and leaves the street of doors in its static drawn state.
- Low-end devices (no `deviceMemory >= 2`, or Save-Data) get instant page changes.

## 5. Signature: the street of doors

A hand-drawn SVG street (`apps/web/public/img/street-of-doors.svg`) with seven buildings, each with a door: police chowki, consumer commission, labour office, ward office, legal aid or Lok Adalat, bank, post office. Each building group is `door-<key>` and each door has class `door`.

- As the user answers, doors that no longer apply dim (`opacity` to 0.35). The right door warms to `saffron-500` and swings open (transform only).
- A dotted `#path` draws from the user's marker to the chosen door.
- On result pages the same street becomes a progress header: the path runs through each step (first peaceful step, primary door, escalations) like a route map.
- Static drawn state under reduced motion and on low-end devices.
- The street never carries text except short English sign words.

This is the object a visitor remembers: it answers "where do I go" as a picture.

## 6. Components and class names

Defined in `raasta.css`:

- Layout: `.container`, `.stack`, `.cluster`, `.grid-2`, `.grid-3`
- Chrome: `.skip-link`, `.site-header`, `.site-footer`, `.rail`
- Actions: `.btn`, `.btn-primary`, `.btn-secondary`, `.btn-ghost`, `.lift`
- Surfaces: `.card`, `.card-warm`, `.wave-top`, `.wave-bottom`, `.blob`
- Labels and tags: `.chip`, `.text-free`
- Forms: `.field` (label, input, textarea, select, `.field-error`)
- Flow: `.stepper`, `.checklist`, `.action-list`, `.timer`
- Messages: `.notice` (chakra info), `.alert` (alert-700 emergency or error)
- Places: `.office-card`, `.door-street`
- Utilities: `[dir=rtl]` tweaks, `@media print` (hide nav, A4 friendly)

Focus: a 3px `leaf-700` ring on `:focus-visible`, offset 2px. Never remove outlines.

Touch: every interactive element is at least 44px.

## 7. Layout and copy

- One `h1` per page. Landmarks: `header`, `main`, `nav`, `footer`.
- Asymmetric splits (`1.1fr 1fr`) for hero and result pages. No rows of three identical icon cards.
- Facts are told in sentences with real figures from `packages/data`. No big-number stat rows.
- Copy is plain, warm and short. Sentence case for headings, buttons and labels.
- Icons: lucide-style line icons or hand-drawn SVG. No emoji.

## 8. Don'ts

- No all-caps text, anywhere.
- No eyebrow labels or kickers above headings.
- No decorative pills, badges or status dots. "Free" is plain leaf-coloured text.
- No gradient text.
- No purple, violet or indigo.
- No emoji icons.
- No em dashes (U+2014) in any file, text or code comment. A build guard checks `dist`.
- No dark mode. Light mode only, `color-scheme: light`.
- No photos of people or meals, no stock imagery.
- No jokes or handwritten asides on dispute, result or emergency screens.
- No frosted or blurred cards. No glass.
- No animation of text on scroll.
- No fake numbers, ratings or invented URLs, fees or phones. Facts come only from `packages/data`.
