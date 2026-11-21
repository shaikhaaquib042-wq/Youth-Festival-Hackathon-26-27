import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './e2e',
  timeout: 45_000,
  expect: { timeout: 12_000 },
  workers: 1,
  fullyParallel: false,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: 'npm --prefix ../backend run build && node ../backend/dist/server.js',
      url: 'http://localhost:8000/api/v1/health',
      reuseExistingServer: false,
      timeout: 60_000,
      env: {
        NODE_ENV: 'test',
        PORT: '8000',
        FRONTEND_URL: 'http://localhost:5173',
        COMMUNITY_WRITES_ENABLED: 'false',
      },
    },
    {
      command:
        process.env.FRONTEND_E2E_PREVIEW === 'true'
          ? 'npm run build && npm run preview -- --host localhost --port 5173 --strictPort'
          : 'npm run dev -- --host localhost',
      url: 'http://localhost:5173',
      reuseExistingServer: false,
      timeout: 60_000,
      env: { VITE_API_BASE_URL: 'http://localhost:8000/api/v1', VITE_USE_MOCKS: 'false' },
    },
  ],
});
