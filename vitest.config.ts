import { defineConfig } from "vitest/config";
export default defineConfig({
  test: { include: ["packages/*/test/**/*.test.ts", "packages/*/src/**/*.test.ts", "apps/api/test/**/*.test.ts"] },
});
