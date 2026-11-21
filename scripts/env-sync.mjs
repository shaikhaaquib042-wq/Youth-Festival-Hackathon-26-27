// Usage: node scripts/env-sync.mjs [--deploy]
// Copies .env (repo root) into apps/api/.dev.vars for `wrangler dev`.
// With --deploy it also runs `wrangler secret bulk` for keys that have a value (empty keys are skipped).
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = join(root, ".env");
const apiDir = join(root, "apps", "api");

if (!existsSync(envPath)) {
  console.error("No .env found. Copy .env.example to .env and fill it in first.");
  process.exit(1);
}

// Keys that only the web build reads, never the Worker.
const WEB_ONLY = new Set(["VITE_TURNSTILE_SITE_KEY", "VITE_SITE_URL"]);

const vars = {};
for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
  const m = /^\s*([A-Z][A-Z0-9_]*)\s*=\s*(.*)\s*$/.exec(line);
  if (!m || line.trim().startsWith("#")) continue;
  let v = m[2];
  if (/^".*"$|^'.*'$/.test(v)) v = v.slice(1, -1);
  if (v === "" || WEB_ONLY.has(m[1])) continue;
  vars[m[1]] = v;
}

const quote = (v) => (/[\s#"']/.test(v) ? JSON.stringify(v) : v);
writeFileSync(join(apiDir, ".dev.vars"), Object.entries(vars).map(([k, v]) => `${k}=${quote(v)}`).join("\n") + "\n");
console.log(`Wrote apps/api/.dev.vars with ${Object.keys(vars).length} keys.`);

if (process.argv.includes("--deploy")) {
  const res = spawnSync("npx", ["wrangler", "secret", "bulk"], {
    cwd: apiDir,
    input: JSON.stringify(vars),
    stdio: ["pipe", "inherit", "inherit"],
    shell: process.platform === "win32",
  });
  process.exit(res.status ?? 1);
}
