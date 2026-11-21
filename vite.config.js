import { defineConfig, loadEnv } from 'vite';
import { POST as transcribe } from './api/transcribe.js';

// SACHET has no CORS → proxy in dev. Prod uses api/sachet.js (Vercel Function).
// /api/sachet?state=karnataka switches feed; default maharashtra.
// /api/transcribe → the same handler as the Vercel Function (reads DEEPGRAM_API_KEY from .env.local).
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  if (env.DEEPGRAM_API_KEY) process.env.DEEPGRAM_API_KEY = env.DEEPGRAM_API_KEY;
  return {
    plugins: [
      {
        name: 'sajag-api-transcribe',
        configureServer(server) {
          server.middlewares.use('/api/transcribe', async (req, res) => {
            if (req.method !== 'POST') { res.statusCode = 405; return res.end(); }
            const chunks = [];
            for await (const c of req) chunks.push(c);
            const request = new Request(`http://localhost${req.originalUrl}`, {
              method: 'POST',
              headers: { 'content-type': req.headers['content-type'] ?? '' },
              body: Buffer.concat(chunks),
            });
            const r = await transcribe(request);
            res.statusCode = r.status;
            r.headers.forEach((v, k) => res.setHeader(k, v));
            res.end(Buffer.from(await r.arrayBuffer()));
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
