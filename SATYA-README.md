# SATYAM AI — Interactive Hackathon Prototype

A responsive SATYAM AI product landing page integrated with the interactive two-phone React + TypeScript + Vite verification prototype.

## What is implemented

- Two side-by-side smartphone frames on desktop; stacked on narrow screens.
- Product hero, how-it-works journey, feature overview, floating assistant concept, local technology pipeline and privacy/limitations sections.
- Navigation links to the product sections and a Try Demo shortcut; the hero offers a Launch Interactive Demo action.
- WhatsApp-style **simulation only** with selectable demo forwards, forwarded label, manual Copy Message action and reset by choosing the first sample again.
- Separate SATYAM AI phone with editable text input, sample loading, Paste (Clipboard API), Clear and Analyse.
- Local language detection for English, Hindi and Marathi (script/heuristic based).
- Claim splitting, warning indicators, local JSON evidence matching and five verdict statuses: VERIFIED, FALSE, MISLEADING, UNVERIFIED, CONFLICTING.
- Claim-level and overall report with evidence metadata and clickable URL support when a real source URL is supplied.
- Output-language selector and short transcript with Play, Pause, Resume, Replay and Stop.
- Optional VoiceAPI neural TTS over REST with male/female English, Hindi and Marathi voices, speed/pitch controls, and a same-language browser-speech fallback.
- No registration, verification backend, API key, WhatsApp connection, automatic message transfer or message storage. Speech is generated only after the user presses Play.

## Important evidence limitation

The three bundled matching evidence records are explicitly **synthetic demonstration cases**, not real fact-checks. Their source URLs are intentionally blank. The prototype returns UNVERIFIED for unmatched claims. It does not perform live internet search and must not be presented as a production fact-checking service. Replace the synthetic records in `src/data/evidence.json` with independently verified records before using real-world verdicts.

## Requirements

- Node.js 20.19+ or 22.12+
- npm

## Run locally

```bash
npm install
npm run dev
```

Open the local URL printed by Vite (usually `http://localhost:5173`).

## Optional neural speech service

The React app stays separate from the Python VoiceAPI backend. Without VoiceAPI running, SATYAM keeps the existing browser speech fallback. To enable the neural voices:

1. Use Python **3.10.19**, as specified by VoiceAPI's `runtime.txt`; create a separate environment for its Python dependencies.
2. Clone [VoiceAPI](https://github.com/harshil748/VoiceAPI) separately from this project, install its `requirements.txt`, and download only the six requested SYSPIN models (`en_male`, `en_female`, `hi_male`, `hi_female`, `mr_male`, `mr_female`) using its documented CLI:
   ```powershell
   python -m src.cli download --voice en_male
   python -m src.cli download --voice en_female
   python -m src.cli download --voice hi_male
   python -m src.cli download --voice hi_female
   python -m src.cli download --voice mr_male
   python -m src.cli download --voice mr_female
   ```
3. Start it bound to localhost: `python start_api.py --host 127.0.0.1 --port 8000`. Initial model downloads and first model loads can take time; each SYSPIN voice model is about 333 MB.
4. Copy `.env.example` to `.env.local` if you need to change the endpoint. Set `VITE_VOICE_API_BASE_URL` to the VoiceAPI base URL, then restart Vite. This setting is an endpoint, not a credential; never put API keys or secrets in a `VITE_` variable.
5. In a report, choose the language, male/female voice, speaking speed and pitch, then press Play. SATYAM calls VoiceAPI's `POST /synthesize` with the short transcript and plays the returned WAV. Playback controls stop or pause the active stream; changing a report or voice setting cancels it.

The app falls back to a browser voice when VoiceAPI is unavailable or cannot synthesize the selected voice. The fallback still requires a voice matching the selected language and gender; SATYAM tells the user when it is unavailable and does not silently switch languages.

VoiceAPI's current repository does not include model weights; its CLI downloads them separately from Hugging Face. The six SYSPIN model cards currently identify their weights as **CC BY 4.0**. VoiceAPI's README describes its code as MIT, but the repository currently has no root `LICENSE` file, and the API's metadata reports CC BY 4.0; verify applicable code, attribution and dataset terms before redistribution or commercial use. SATYAM uses the standard SYSPIN synthesis voices, not XTTS voice cloning (which has a separate Coqui Public Model License). VoiceAPI enables permissive cross-origin requests by default; keep this service bound to localhost unless you configure and secure it for a trusted deployment.

## Production build

```bash
npm run build
npm run preview
```

## Run automated tests

```bash
npm test
```

The test runner executes the unit and verification-engine cases from `satya-test-cases.json` and writes `satya-test-results.json`. Browser-only cases require manual verification in a browser and are reported as BLOCKED by the command-line runner until actually exercised.

## Suggested demo workflow

1. In the left phone, choose **Laptop scheme forward**.
2. Click **Copy message**. If clipboard permission is denied, select the text manually and copy it.
3. In the right phone, click **Paste**. If browser clipboard permission is denied, click the text box and press Ctrl+V / long-press Paste.
4. Click **Verify message**.
5. Inspect the claim verdict, warning signs and synthetic evidence disclosure.
6. Read the short **Listen to your result** preview, choose the report language, then try Play. SATYA uses a voice that matches that language; it does not substitute an English voice for Hindi or Marathi. If no matching voice is installed, SATYA displays a message and keeps the written report available.
7. Use **New check** and repeat with another sample.

## Architecture

- `src/app/App.tsx` — product landing page and embedded interactive demo.
- `src/styles/landing.css` — landing page layout and responsive styles, preserving the reference navy/cyan/blue theme.
- `src/components/` — phone frame, WhatsApp simulation, SATYA input, report, language selector and audio controls.
- `src/core/verification.ts` — framework-independent language detection, claim extraction, warning indicators, evidence matching and verdict aggregation.
- `src/services/voiceApi.ts` — optional VoiceAPI REST client for neural WAV synthesis.
- `src/services/speech.ts` — same-language, gender-aware browser speech fallback and intro speech.
- `src/data/evidence.json` — local structured evidence records.
- `src/data/demoMessages.json` — sample forwards.
- `src/app/types.ts` — domain types.

## Known limitations / next steps

- The language detector is a lightweight script/keyword heuristic, not a production language-identification model.
- Claim extraction uses sentence splitting; a production version should use a validated claim-extraction model.
- Matching is deterministic keyword matching, not semantic search.
- Written translations for the overall summary/recommendation are provided for English, Hindi and Marathi. Evidence text itself remains in its source language; do not assume that the browser can translate arbitrary source excerpts.
- Speech reads a concise verdict summary, not the full technical report. Neural speech requires a separately installed VoiceAPI server and model weights. Browser/system fallback voices vary by device; Hindi, Marathi or gender-matched voices may not be installed everywhere.
- Synthetic verdicts are spoken as demonstration examples and are not presented as real-world fact-checks.
- The app does not search government websites or fact-check portals live.
- Future live-source retrieval should be implemented behind an evidence-provider interface and should preserve source URLs, issuing authority, publication date and excerpts.
- A system-wide floating overlay is not part of this web MVP. It requires a separate Android app with user-granted overlay and explicit content-access permissions. Capacitor/native migration can reuse the domain verification module.

## Build verification

`npm run build` runs the TypeScript project checks and creates the Vite production bundle.
