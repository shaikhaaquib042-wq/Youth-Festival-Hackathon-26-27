// Stress test: every guided question of every problem, in every language, and every guided flow walked to its result.
import { describe, expect, it } from "vitest";
import { disputes } from "@raasta/data";
import { LOCALES } from "@raasta/config";
import app from "../src/index";
import { QuestionField } from "../src/views/Pages";
import { get, makeEnv, post } from "./helpers";

const call = (req: Request, env = makeEnv()) => app.fetch(req, env);
const text = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
const decode = (s: string) => s.replace(/&#x27;/g, "'").replace(/&amp;/g, "&").replace(/&quot;/g, '"');

describe("every guided question renders cleanly in every language", () => {
  it("has no duplicate choices, no leaked keys and no unfilled placeholders", async () => {
    const problems: string[] = [];
    for (const lang of LOCALES) {
      for (const d of disputes) {
        for (const q of d.questions) {
          const html = String(await (QuestionField({ lang, q, dispute: d.id, big: true }) as unknown as { toString(): string | Promise<string> }).toString());
          const where = `${lang}/${d.id}/${q.id}`;
          const choices = [...html.matchAll(/class="opt-text">([^<]*)</g), ...html.matchAll(/<option[^>]*>([^<]*)</g)].map((m) => decode(m[1]!).trim().toLowerCase());
          if (new Set(choices).size !== choices.length) problems.push(`${where}: duplicate choices ${choices.join(" | ")}`);
          if (q.type === "select" && choices.length < 2) problems.push(`${where}: fewer than 2 choices`);
          const visible = text(html);
          if (/\b(q|ui|howto|dispute)\.[a-z_]+\.[a-z_.]+/.test(visible)) problems.push(`${where}: raw key in "${visible.slice(0, 80)}"`);
          if (/\{\w+\}/.test(visible)) problems.push(`${where}: unfilled placeholder`);
        }
      }
    }
    expect(problems).toEqual([]);
  });
});

describe("every guided flow reaches a result", () => {
  it("walks each problem's questions (all skipped) to a result page that has a first step and a guide", async () => {
    const env = makeEnv();
    const problems: string[] = [];
    for (const d of disputes) {
      const start = await call(get(`/r/flow/${d.id}/0`), env);
      let res = start;
      let step = 0;
      for (let i = 0; i < 12 && res.status === 200; i++) {
        const html = await res.text();
        const m = /action="\/r\/flow\/[a-z_]+\/(\d+)"/.exec(html);
        if (!m) break;
        step = Number(m[1]);
        res = await call(post(`/r/flow/${d.id}/${step}`, {}, { form: true }), env);
      }
      if (res.status !== 303) {
        problems.push(`${d.id}: flow ended with ${res.status} at step ${step}`);
        continue;
      }
      const loc = res.headers.get("location") ?? "";
      const page = await call(get(loc), env);
      const html = await page.text();
      if (page.status !== 200) problems.push(`${d.id}: result ${page.status}`);
      if (!html.includes("j-first")) problems.push(`${d.id}: no first step`);
      if (!html.includes('class="howto"')) problems.push(`${d.id}: no step-by-step guide`);
      if (/\b(ui|step|why|warn|dispute|howto)\.[a-z_]+\.?[a-z_]*\b(?![^<]*>)/.test(text(html).replace(/raasta\.safalmutha\.in|e-jagriti\.gov\.in|[a-z0-9-]+\.(gov|nic|org|in|com)\.?[a-z]*/g, ""))) problems.push(`${d.id}: raw key visible`);
    }
    expect(problems).toEqual([]);
  });
});
