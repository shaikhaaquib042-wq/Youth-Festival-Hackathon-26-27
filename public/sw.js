// Sajag service worker — keeps the app shell openable on a weak network.
// Network-first for pages/assets (always fresh when online), cache fallback when offline.
// Never touches map tiles (range requests), /api/*, or other origins (Supabase, OSRM, weather).
const CACHE_PREFIX = 'sajag-shell-';
const CACHE = `${CACHE_PREFIX}v2`;
const SHELL = ['/', '/manifest.webmanifest', '/icons/icon-192.png'];
const SHELL_ASSET = /^\/(?:assets\/[^/]+|icons\/[^/]+|audio\/(?:en|mr|hi|kn|te)\/[^/]+)$/;

function cacheable(res) {
  return res.status === 200 && res.type === 'basic' && !res.redirected
    && !res.headers.get('cache-control')?.split(',').some((directive) => /^(?:no-store|private)(?:\s|=|$)/i.test(directive.trim()));
}

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await Promise.all(SHELL.map(async (path) => {
      const res = await fetch(path, { cache: 'reload', redirect: 'error' });
      if (!cacheable(res)) throw new Error('App shell cannot be cached');
      await cache.put(path, res);
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys
      .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE)
      .map((key) => caches.delete(key)))).then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || req.headers.has('range')) return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  const navigation = req.mode === 'navigate' && ['/', '/index.html'].includes(url.pathname);
  const asset = !url.search && (url.pathname === '/manifest.webmanifest' || SHELL_ASSET.test(url.pathname));
  if (!navigation && !asset) return;

  const network = fetch(req);
  e.waitUntil(network.then((res) => {
    if (url.search || !cacheable(res)) return;
    const copy = res.clone();
    return caches.open(CACHE).then((cache) => cache.put(req, copy));
  }).catch(() => {}));
  e.respondWith(network.catch(async () => {
    const cache = await caches.open(CACHE);
    return (await cache.match(navigation ? '/' : req)) ?? Response.error();
  }));
});
