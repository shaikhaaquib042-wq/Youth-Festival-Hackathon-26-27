// Cloudflare Pages Function — same path as the Vite dev proxy: /api/sachet?state=maharashtra
export async function onRequestGet({ request }) {
  const state = (new URL(request.url).searchParams.get('state') || 'maharashtra').replace(/[^a-z]/g, '');
  const upstream = await fetch(`https://sachet.ndma.gov.in/cap_public_website/rss/rss_${state}.xml`, {
    cf: { cacheTtl: 120, cacheEverything: true },
  });
  return new Response(upstream.body, {
    status: upstream.status,
    headers: {
      'content-type': 'application/xml; charset=utf-8',
      'cache-control': 'public, max-age=120',
    },
  });
}
