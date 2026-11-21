import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

export default defineConfig({
  test: {
    include: ["qa/agy/tests/**/*.test.ts"],
    root: resolve(__dirname, "../.."),
  },
});
