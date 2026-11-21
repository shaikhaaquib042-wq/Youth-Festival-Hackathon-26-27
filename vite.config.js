import { defineConfig } from 'vite';

// SACHET has no CORS → proxy in dev. Prod uses functions/api/sachet.js (Cloudflare Pages Function).
// /api/sachet?state=karnataka switches feed; default maharashtra.
export default defineConfig({
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
});
