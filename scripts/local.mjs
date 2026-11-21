// Run the whole of Raasta on this machine: the API Worker (simulated by wrangler/Miniflare) and the website.
//
//   node scripts/local.mjs          production build of the website + local Worker   (npm run local)
//   node scripts/local.mjs --dev    Vite dev server with hot reload + local Worker   (npm run dev:all)
//
// The browser only ever talks to localhost. The website calls /api and /r on its own origin, and Vite forwards those
// to the local Worker on 127.0.0.1:8787. The hosted site (raasta.safalmutha.in) is never contacted.
import { spawn, spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "node:net";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const apiDir = join(root, "apps", "api");
const webDir = join(root, "apps", "web");
const dev = process.argv.includes("--dev");
const skipBuild = process.argv.includes("--no-build");
const win = process.platform === "win32";
const LOCAL_CONFIG = "wrangler.local.jsonc";

const say = (msg) => console.log(`\x1b[38;5;208m[raasta]\x1b[0m ${msg}`);
const run = (cmd, args, cwd) => {
  const r = spawnSync(cmd, args, { cwd, stdio: "inherit", shell: win, env: { ...process.env, CI: "1" } });
  if (r.status !== 0) {
    say(`Failed: ${cmd} ${args.join(" ")}`);
    process.exit(r.status ?? 1);
  }
};

// 0. Ports must be free (an old wrangler or vite left running makes requests hang).
const port = dev ? 5173 : 4173;
const busy = (p, host) => new Promise((res) => { const s = createServer().once("error", () => res(true)).once("listening", () => s.close(() => res(false))); s.listen(p, host); });
for (const [p, host] of [[8787, "127.0.0.1"], [port, "localhost"]]) {
  if (await busy(p, host)) {
    say(`Port ${p} is already in use. Stop the other server (an old "wrangler dev" or "vite") and run this again.`);
    process.exit(1);
  }
}

// 1. Dependencies.
if (!existsSync(join(root, "node_modules", "wrangler")) || !existsSync(join(root, "node_modules", "vite"))) {
  say("Installing dependencies (npm ci)...");
  run("npm", ["ci"], root);
}

// 2. Local secrets file for the Worker. Created once with a random signing key; never committed (.gitignore).
const devVars = join(apiDir, ".dev.vars");
if (!existsSync(devVars)) {
  writeFileSync(devVars, `TOKEN_SECRET=${randomBytes(32).toString("hex")}\n`);
  say("Created apps/api/.dev.vars with a random TOKEN_SECRET.");
} else {
  // ALLOWED_ORIGINS / AI_PRIMARY in an old .dev.vars would override the local config; keep only real secrets.
  const kept = readFileSync(devVars, "utf8")
    .split(/\r?\n/)
    .filter((l) => l.trim() && !/^\s*(ALLOWED_ORIGINS|AI_PRIMARY)\s*=/.test(l));
  if (!kept.some((l) => /^\s*TOKEN_SECRET\s*=/.test(l))) kept.unshift(`TOKEN_SECRET=${randomBytes(32).toString("hex")}`);
  writeFileSync(devVars, kept.join("\n") + "\n");
}

// 3. Local D1 tables (stored in apps/api/.wrangler/state; idempotent).
say("Preparing the local database...");
run("npx", ["wrangler", "d1", "migrations", "apply", "DB", "--local", "--config", LOCAL_CONFIG], apiDir);

// 4. Website build (production mode only).
if (!dev && !skipBuild) {
  say("Building the website (prerenders every page in 12 languages, takes a minute)...");
  run("npm", ["run", "build", "-w", "@raasta/web"], root);
}

// 5. Start both servers.
const children = [];
const start = (name, cmd, args, cwd) => {
  const child = spawn(cmd, args, { cwd, stdio: "inherit", shell: win, env: { ...process.env, RAASTA_LOCAL: "1" } });
  child.on("exit", (code) => {
    say(`${name} stopped (code ${code}). Shutting down.`);
    stop(code ?? 0);
  });
  children.push(child);
};
let stopping = false;
function stop(code) {
  if (stopping) return;
  stopping = true;
  for (const c of children) {
    if (c.exitCode !== null) continue;
    if (win) spawnSync("taskkill", ["/pid", String(c.pid), "/T", "/F"], { stdio: "ignore" });
    else c.kill("SIGTERM");
  }
  process.exit(code);
}
process.on("SIGINT", () => stop(0));
process.on("SIGTERM", () => stop(0));

start("API", "npx", ["wrangler", "dev", "--config", LOCAL_CONFIG, "--local", "--port", "8787", "--ip", "127.0.0.1"], apiDir);
start("Website", "npx", dev ? ["vite", "--port", "5173", "--strictPort"] : ["vite", "preview", "--port", "4173", "--strictPort"], webDir);

setTimeout(() => {
  say("");
  say(`Raasta is running:  http://localhost:${port}`);
  say(`API (local Worker): http://127.0.0.1:8787/api/health`);
  say(dev ? "Mode: development (hot reload)" : "Mode: production build");
  say("Press Ctrl+C to stop both.");
}, 4000);
