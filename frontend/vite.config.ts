import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import deployment from './vercel.json';

const previewHeaders = Object.fromEntries(
  deployment.headers[0].headers.map((header) => [header.key, header.value]),
);
if (process.env.FRONTEND_E2E_PREVIEW === 'true') {
  // Allow only the explicitly selected loopback backend in the local production acceptance run.
  previewHeaders['Content-Security-Policy'] = previewHeaders['Content-Security-Policy'].replace(
    "connect-src 'self' https:",
    "connect-src 'self' https: http://localhost:8000",
  );
  previewHeaders['Content-Security-Policy'] = previewHeaders['Content-Security-Policy'].replace(
    '; upgrade-insecure-requests',
    '',
  );
}

export default defineConfig({
  plugins: [react()],
  server: { host: '127.0.0.1', port: 5173, strictPort: true },
  preview: { headers: previewHeaders },
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.{ts,tsx}'],
    restoreMocks: true,
  },
});
