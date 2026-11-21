import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import '../src/i18n';
beforeEach(() => {
  vi.stubEnv('VITE_USE_MOCKS', 'false');
  vi.stubGlobal('scrollTo', vi.fn());
});
afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
