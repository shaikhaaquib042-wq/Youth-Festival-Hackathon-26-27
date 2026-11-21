import { Hono } from "hono";
import { t } from "@raasta/i18n";
import type { AppEnv } from "./env";
import { HttpError } from "./lib/http";
import { postGuard, rateLimit, securityHeaders } from "./lib/security";
import { api } from "./routes/api";
import { langMiddleware, pages, renderHtml } from "./routes/pages";
import { tools } from "./routes/tools";
import { MessagePage } from "./views/Pages";

export const app = new Hono<AppEnv>();

app.use("*", securityHeaders);
app.use("*", rateLimit);
app.use("/r/*", langMiddleware);
app.use("*", postGuard);

app.route("/api", api);
app.route("/r", pages);
app.route("/r", tools);

const ERROR_KEY: Record<string, string> = {
  rate_limited: "ui.error.limit",
  forbidden: "ui.error.forbidden",
  too_large: "ui.error.too_large",
  invalid_input: "ui.error.invalid",
  bad_json: "ui.error.invalid",
  verification_failed: "ui.error.verify",
};

function fail(c: import("hono").Context<AppEnv>, status: number, code: string) {
  const path = new URL(c.req.url).pathname;
  if (path.startsWith("/r/")) {
    const lang = c.get("lang") ?? "en";
    const body = t(lang, ERROR_KEY[code] ?? "ui.error.body");
    return renderHtml(c, <MessagePage lang={lang} title={t(lang, "ui.error.h1")} body={body} backHref="/" />, status as 400);
  }
  return c.json({ error: code }, status as 400);
}

// Generic error bodies only. Never echo input, never log request bodies.
app.onError((err, c) => {
  if (err instanceof HttpError) return fail(c, err.status, err.code);
  console.error("unhandled", err instanceof Error ? err.name : "error");
  return fail(c, 500, "server_error");
});

app.notFound((c) => fail(c, 404, "not_found"));

export default app;
