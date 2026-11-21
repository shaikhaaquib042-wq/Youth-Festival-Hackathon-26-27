import { defineConfig } from 'vitest/config';
import path from 'path';
import fs from 'fs';

const localTemp = path.resolve(__dirname, '.vitest-temp');
if (!fs.existsSync(localTemp)) {
  fs.mkdirSync(localTemp, { recursive: true });
}
process.env.TEMP = localTemp;
process.env.TMP = localTemp;

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
