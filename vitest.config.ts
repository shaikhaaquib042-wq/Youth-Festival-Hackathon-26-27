import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  cacheDir: path.resolve(__dirname, 'node_modules/.vite'),
  test: {
    globals: true,
    pool: 'forks',
    environment: 'node',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
});
