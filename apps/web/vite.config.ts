import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import legacy from "@vitejs/plugin-legacy";
import { fileURLToPath } from "node:url";

const TARGETS = ["defaults", "Chrome >= 61", "Safari >= 12", "Samsung >= 8", "Firefox ESR", "not dead"];

export default defineConfig(({ isSsrBuild, command }) => ({
  plugins: [react(), tailwindcss(), ...(isSsrBuild ? [] : [legacy({ targets: TARGETS })])],
  server: {
    port: 5173,
    proxy: {
      "/api": "http://127.0.0.1:8787",
      "/r": "http://127.0.0.1:8787",
    },
  },
  resolve: {
    // Client production bundle uses Preact via compat to stay inside the 60 KB first-load budget. SSR and dev use React.
    alias: (command === "build" && !isSsrBuild
      ? {
          "react-dom/client": "preact/compat/client",
          "react-dom": "preact/compat",
          "react/jsx-runtime": "preact/jsx-runtime",
          react: fileURLToPath(new URL("./src/lib/react-shim.ts", import.meta.url)),
        }
      : {}) as Record<string, string>,
  },
  ssr: { noExternal: [/^@raasta\//] },
  build: {
    sourcemap: false,
    minify: isSsrBuild ? false : "terser",
    terserOptions: { compress: { drop_console: true } },
    cssCodeSplit: false,
  },
}));
