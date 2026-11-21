// Vercel Function — POST /api/transcribe?lang=mr  (body = recorded audio, e.g. audio/webm)
// → Deepgram pre-recorded STT → { transcript, model, language }.
// DEEPGRAM_API_KEY stays server-side (never VITE_). The Vite dev server mounts this same handler (vite.config.js).
// Deepgram's per-language model support changes; we try the best option first and fall back.

const MAX_BYTES = 1_500_000; // ~60 s of opus — the client stops at 15 s
const LANGS = { en: 'en-IN', mr: 'mr', hi: 'hi', kn: 'kn', te: 'te' };

export async function POST(request) {
  const key = process.env.DEEPGRAM_API_KEY;
  if (!key) return json({ error: 'not_configured' }, 503);

  const url = new URL(request.url);
  const lang = LANGS[url.searchParams.get('lang')] ?? 'en-IN';
  const keyterms = url.searchParams.getAll('keyterm').slice(0, 45).map((k) => k.slice(0, 40)); // help words + city place names
  const type = (request.headers.get('content-type') || 'audio/webm').split(';')[0].trim();
  if (!type.startsWith('audio/')) return json({ error: 'bad_type' }, 415);

  const audio = await request.arrayBuffer();
  if (audio.byteLength === 0) return json({ error: 'empty' }, 400);
  if (audio.byteLength > MAX_BYTES) return json({ error: 'too_large' }, 413);

  const attempts = [
    { model: 'nova-3', language: lang, keyterms },
    { model: 'nova-3', language: lang },
    { model: 'nova-2', language: lang },
    { model: 'nova-3', language: 'multi' },
  ];
  let last = null;
  for (const a of attempts) {
    const q = new URLSearchParams({ model: a.model, language: a.language, smart_format: 'true', punctuate: 'true' });
    for (const k of a.keyterms ?? []) q.append('keyterm', k);
    try {
      const r = await fetch(`https://api.deepgram.com/v1/listen?${q}`, {
        method: 'POST',
        headers: { authorization: `Token ${key}`, 'content-type': type },
        body: audio,
        signal: AbortSignal.timeout(20000),
      });
      if (r.ok) {
        const d = await r.json();
        const alt = d?.results?.channels?.[0]?.alternatives?.[0];
        return json({ transcript: alt?.transcript ?? '', confidence: alt?.confidence ?? null, model: a.model, language: a.language });
      }
      last = `${r.status} ${(await r.text()).slice(0, 200)}`;
      if (r.status === 401 || r.status === 403 || r.status === 429) break; // retrying won't help
    } catch (e) {
      last = String(e?.message ?? e);
      if (e?.name === 'TimeoutError' || e?.name === 'AbortError') break; // slow network: another model won't be faster
    }
  }
  console.error('deepgram failed:', last);
  return json({ error: 'upstream', detail: last }, 502);
}

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
