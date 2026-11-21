import { defineConfig } from 'vitest/config';

// Root infrastructure tests have a Node runtime; frontend/backend own their suites.
export default defineConfig({ test: { include: ['tests/**/*.test.ts'] } });
