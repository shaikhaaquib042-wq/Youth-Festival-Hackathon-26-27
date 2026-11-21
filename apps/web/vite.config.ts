import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import legacy from "@vitejs/plugin-legacy";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { ASSET_V } from "../../packages/config/src/asset-version";

// Shared unhashed assets get ?v=<content hash> so browsers never show a stale copy after a deploy.
const assetVersion = {
  name: "raasta-asset-version",
  transformIndexHtml: (html: string) => html.replace(/(\/styles\/raasta\.css|\/js\/locate\.js)"/g, `$1?v=${ASSET_V}"`),
};

const LOCAL_WORKER = "http://127.0.0.1:8787";
const LOCAL_API = { "/api": LOCAL_WORKER, "/r": LOCAL_WORKER };

// Local preview behaves like Cloudflare Pages: /help serves dist/help/index.html (the prerendered page), not the landing.
const pagesLikePreview = {
  name: "raasta-pages-like-preview",
  configurePreviewServer(server: { config: { build: { outDir: string }; root: string }; middlewares: { use: (fn: (req: { url?: string }, res: unknown, next: () => void) => void) => void } }) {
    const out = join(server.config.root, server.config.build.outDir);
    server.middlewares.use((req, _res, next) => {
      const [path, query] = (req.url ?? "/").split("?");
      if (path && !path.endsWith("/") && !/\.[a-z0-9]+$/i.test(path) && existsSync(join(out, path, "index.html"))) {
        req.url = `${path}/${query ? `?${query}` : ""}`;
      }
      next();
    });
  },
};

const TARGETS = ["defaults", "Chrome >= 61", "Safari >= 12", "Samsung >= 8", "Firefox ESR", "not dead"];

// Dev server only: the production prerender injects per-locale font links itself (scripts/prerender.mjs fontLinks).
const devFonts = {
  name: "raasta-dev-fonts",
  apply: "serve" as const,
  transformIndexHtml: (html: string) =>
    html.replace(
      "<!--head-->",
      '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@500;600;700;800&family=Nunito:wght@400;600;700;800&family=Caveat:wght@600&display=swap"><!--head-->',
    ),
};

export default defineConfig(({ isSsrBuild, command }) => ({
  plugins: [react(), tailwindcss(), devFonts, pagesLikePreview, assetVersion, ...(isSsrBuild ? [] : [legacy({ targets: TARGETS })])],
  // Local only: /api and /r go to the local Worker (scripts/local.mjs starts it). Never to the hosted site.
  server: { port: 5173, proxy: LOCAL_API },
  preview: { port: 4173, proxy: LOCAL_API },
  resolve: {
    // Client production bundle uses Preact via compat to stay inside the 60 KB first-load budget. SSR and dev use React.
    alias: (command === "build" && !isSsrBuild
      ? {
          "react-dom/client": "preact/compat/client",
          "react-dom": "preact/compat",
          "react/jsx-runtime": "preact/jsx-runtime",
          react: fileURLToPath(new URL("./src/lib/react-shim.ts", import.meta.url)),
          // Browser gets the dictionary-free core; the page embeds the active locale (scripts/prerender.mjs).
          "@raasta/i18n": fileURLToPath(new URL("../../packages/i18n/src/core.ts", import.meta.url)),
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
