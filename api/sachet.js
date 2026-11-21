// Vercel Function and Vite dev middleware: /api/sachet?state=maharashtra
const STATES = new Set(['maharashtra', 'karnataka', 'telangana']);
const HEADERS = {
  'x-content-type-options': 'nosniff',
  'content-security-policy': "default-src 'none'; sandbox",
};

function error(message, status) {
  return new Response(message, {
    status,
    headers: { ...HEADERS, 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' },
  });
}

export async function GET(request) {
  const { search } = new URL(request.url);
  const state = search ? new URLSearchParams(search).get('state') : 'maharashtra';
  if (!STATES.has(state) || (search && search !== `?state=${state}`)) return error('invalid state', 400);
  try {
    const upstream = await fetch(`https://sachet.ndma.gov.in/cap_public_website/rss/rss_${state}.xml`, {
      redirect: 'error',
      signal: AbortSignal.timeout(8000),
    });
    if (upstream.status !== 200) {
      await upstream.body?.cancel();
      return error('upstream unavailable', 502);
    }
    return new Response(upstream.body, {
      headers: {
        ...HEADERS,
        'content-type': 'application/xml; charset=utf-8',
        'cache-control': 'public, max-age=60, s-maxage=120, stale-while-revalidate=600',
      },
    });
  } catch {
    return error('upstream unavailable', 502);
  }
}
