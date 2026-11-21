// Vercel Function — POST /api/transcribe?lang=mr  (body = recorded audio, e.g. audio/webm)
// → Deepgram pre-recorded STT → { transcript, model, language }.
// DEEPGRAM_API_KEY stays server-side (never VITE_). The Vite dev server mounts this same handler (vite.config.js).
// Deepgram's per-language model support changes; we try the best option first and fall back.

import { isIP } from 'node:net';

const MAX_BYTES = 256_000;
const REQUEST_TIMEOUT_MS = 20_000;
const RATE_WINDOW_MS = 60_000;
const RATE_LIMIT = 20;
const MAX_TRACKED_IPS = 2048;
const LANGS = new Map([['en', 'en-IN'], ['mr', 'mr'], ['hi', 'hi'], ['kn', 'kn'], ['te', 'te']]);
const AUDIO_TYPES = new Set(['audio/webm', 'audio/ogg', 'audio/mp4', 'audio/wav']);
const PUBLIC_ORIGINS = [
  'https://sajag-app.vercel.app',
  'https://sajag-inky.vercel.app',
  'https://sajag-pod5.vercel.app',
];
const requestsByIp = new Map();
let windowEndsAt = 0;

// Per warm instance. A Vercel WAF rule is needed for a cross-instance ceiling.
function takeSlot(ip) {
  const now = Date.now();
  if (now >= windowEndsAt) {
    requestsByIp.clear();
    windowEndsAt = now + RATE_WINDOW_MS;
  }
  const count = requestsByIp.get(ip) ?? 0;
  if (count >= RATE_LIMIT || (!count && requestsByIp.size >= MAX_TRACKED_IPS)) {
    return Math.ceil((windowEndsAt - now) / 1000);
  }
  requestsByIp.set(ip, count + 1);
  return 0;
}

export function POST(request) {
  const forwarded = request.headers.get('x-forwarded-for');
  return transcribe(request, {
    key: process.env.DEEPGRAM_API_KEY,
    origins: process.env.VERCEL_URL
      ? [...PUBLIC_ORIGINS, `https://${process.env.VERCEL_URL}`]
      : PUBLIC_ORIGINS,
    // Vercel supplies this header. Use one shared bucket if no valid address is available.
    ip: process.env.VERCEL === '1' && isIP(forwarded ?? '') ? forwarded : 'unknown',
  });
}

export async function transcribe(request, { key, origins, ip }) {
  const origin = request.headers.get('origin');
  const fetchSite = request.headers.get('sec-fetch-site');
  if (!origins.includes(origin) || (fetchSite && fetchSite !== 'same-origin')) {
    return json({ error: 'forbidden' }, 403);
  }
  if (!key) return json({ error: 'not_configured' }, 503);

  const url = new URL(request.url);
  const lang = LANGS.get(url.searchParams.get('lang')) ?? 'en-IN';
  const keyterms = url.searchParams.getAll('keyterm').slice(0, 45).map((k) => k.slice(0, 40)); // help words + city place names
  const type = request.headers.get('content-type')?.split(';')[0].trim().toLowerCase();
  if (!AUDIO_TYPES.has(type)) return json({ error: 'bad_type' }, 415);
  if (Number(request.headers.get('content-length')) > MAX_BYTES) return json({ error: 'too_large' }, 413);

  const retryAfter = takeSlot(ip);
  if (retryAfter) return json({ error: 'rate_limited' }, 429, { 'retry-after': String(retryAfter) });

  let audio;
  try {
    audio = await readAudio(request.body);
  } catch {
    return json({ error: 'bad_body' }, 400);
  }
  if (audio === null) return json({ error: 'too_large' }, 413);
  if (!audio.size) return json({ error: 'empty' }, 400);

  const attempts = [
    ...(keyterms.length ? [{ model: 'nova-3', language: lang, keyterms }] : []),
    { model: 'nova-3', language: lang },
    { model: 'nova-2', language: lang },
    { model: 'nova-3', language: 'multi' },
  ];
  const signal = AbortSignal.any([request.signal, AbortSignal.timeout(REQUEST_TIMEOUT_MS)]);
  let lastStatus;
  for (const a of attempts) {
    const q = new URLSearchParams({ model: a.model, language: a.language, smart_format: 'true', punctuate: 'true' });
    for (const k of a.keyterms ?? []) q.append('keyterm', k);
    try {
      const r = await fetch(`https://api.deepgram.com/v1/listen?${q}`, {
        method: 'POST',
        headers: { authorization: `Token ${key}`, 'content-type': type },
        body: audio,
        redirect: 'error',
        signal,
      });
      if (r.ok) {
        const d = await r.json();
        const alt = d?.results?.channels?.[0]?.alternatives?.[0];
        return json({ transcript: alt?.transcript ?? '', confidence: alt?.confidence ?? null, model: a.model, language: a.language });
      }
      lastStatus = r.status;
      await r.body?.cancel();
      if (r.status !== 400 && r.status !== 422) break;
    } catch {
      break;
    }
  }
  console.error('deepgram failed:', lastStatus ?? 'request_failed');
  return json({ error: 'upstream' }, 502);
}

async function readAudio(body) {
  let bytes = 0;
  const chunks = [];
  // Leaving the loop cancels the stream. Vite keeps the socket writable for the 413 response.
  for await (const chunk of body ?? []) {
    bytes += chunk.byteLength;
    if (bytes > MAX_BYTES) return null;
    chunks.push(chunk);
  }
  return new Blob(chunks);
}

const json = (body, status = 200, headers = {}) => new Response(JSON.stringify(body), {
  status,
  headers: {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
    ...headers,
  },
});
