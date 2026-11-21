// Vercel Function — same path as the Vite dev proxy: /api/sachet?state=maharashtra
// (functions/api/sachet.js is the Cloudflare Pages twin.)
export async function GET(request) {
  const state = (new URL(request.url).searchParams.get('state') || 'maharashtra').replace(/[^a-z]/g, '') || 'maharashtra';
  try {
    const upstream = await fetch(`https://sachet.ndma.gov.in/cap_public_website/rss/rss_${state}.xml`, {
      signal: AbortSignal.timeout(8000),
    });
    return new Response(upstream.body, {
      status: upstream.status,
      headers: {
        'content-type': 'application/xml; charset=utf-8',
        'cache-control': 'public, max-age=60, s-maxage=120, stale-while-revalidate=600',
      },
    });
  } catch {
    return new Response('upstream unavailable', { status: 502, headers: { 'cache-control': 'no-store' } });
  }
}
