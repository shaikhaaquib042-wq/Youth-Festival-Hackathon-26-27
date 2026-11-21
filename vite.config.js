import { isIP } from 'node:net';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { defineConfig, loadEnv } from 'vite';
import { transcribe } from './api/transcribe.js';
import { GET as sachet } from './api/sachet.js';

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
  if (response.body) await pipeline(Readable.fromWeb(response.body), res);
  else res.end();
}

// Use the production API handlers in dev as well.
export default defineConfig(({ command, mode, isPreview }) => {
  const key = command === 'serve' && !isPreview
    ? loadEnv(mode, process.cwd(), 'DEEPGRAM_API_KEY').DEEPGRAM_API_KEY
    : undefined;
  return {
    plugins: [
      {
        name: 'sajag-api',
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
          server.middlewares.use('/api/sachet', async (req, res) => {
            try {
              const url = new URL(req.originalUrl, 'http://localhost');
              if (url.pathname !== '/api/sachet') { res.statusCode = 404; return res.end(); }
              if (req.method !== 'GET') { res.statusCode = 405; res.setHeader('allow', 'GET'); return res.end(); }
              await sendResponse(res, await sachet(new Request(url)));
            } catch {
              if (!res.headersSent) res.statusCode = 502;
              res.end();
            }
          });
        },
      },
    ],
    server: {
      port: 5173,
    },
  };
});
