import { isIP } from 'node:net';
import { defineConfig, loadEnv } from 'vite';
import { transcribe } from './api/transcribe.js';

function requestBody(req) {
  const chunks = req.iterator({ destroyOnReturn: false });
  return new ReadableStream({
    async pull(controller) {
      const { value, done } = await chunks.next();
      if (done) controller.close();
      else controller.enqueue(value);
    },
    async cancel() { await chunks.return(); },
  }, { highWaterMark: 0 });
}

async function sendResponse(res, response) {
  res.statusCode = response.status;
  response.headers.forEach((value, name) => res.setHeader(name, value));
  res.end(Buffer.from(await response.arrayBuffer()));
}

// SACHET has no CORS → proxy in dev. Prod uses api/sachet.js (Vercel Function).
// /api/sachet?state=karnataka switches feed; default maharashtra.
// /api/transcribe → the same handler as the Vercel Function (reads DEEPGRAM_API_KEY from .env.local).
export default defineConfig(({ command, mode, isPreview }) => {
  const key = command === 'serve' && !isPreview
    ? loadEnv(mode, process.cwd(), 'DEEPGRAM_API_KEY').DEEPGRAM_API_KEY
    : undefined;
  return {
    plugins: [
      {
        name: 'sajag-api-transcribe',
        configureServer(server) {
          server.middlewares.use('/api/transcribe', async (req, res) => {
            try {
              const base = new URL(`http://${req.headers.host}`);
              const url = new URL(req.originalUrl, base);
              if (url.pathname !== '/api/transcribe') { res.statusCode = 404; return res.end(); }
              if (req.method !== 'POST') { res.statusCode = 405; res.setHeader('allow', 'POST'); return res.end(); }
              const host = base.hostname.replace(/^\[|\]$/g, '');
              const origins = host === 'localhost' || isIP(host) ? [base.origin] : [];
              const request = new Request(url, {
                method: 'POST', headers: req.headers, body: requestBody(req), duplex: 'half',
              });
              await sendResponse(res, await transcribe(request, { key, origins, ip: req.socket.remoteAddress }));
            } catch {
              res.statusCode = 400;
              res.setHeader('cache-control', 'no-store');
              res.end();
            }
          });
        },
      },
    ],
    server: {
      port: 5173,
      proxy: {
        '/api/sachet': {
          target: 'https://sachet.ndma.gov.in',
          changeOrigin: true,
          rewrite: (p) => {
            const state = new URL(p, 'http://x').searchParams.get('state') || 'maharashtra';
            return `/cap_public_website/rss/rss_${state.replace(/[^a-z]/g, '')}.xml`;
          },
        },
      },
    },
  };
});
