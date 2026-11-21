import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  platforms, disputes, officesPune, legalAid, timers, states, platformInsights, platformById,
} from "../src/index";
import { platformSchema, DISPUTE_IDS } from "../src/schemas";

const SRC = join(dirname(fileURLToPath(import.meta.url)), "..", "src");
const EMAIL = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

function jsonFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return jsonFiles(full);
    return name.endsWith(".json") ? [full] : [];
  });
}

function allStrings(v: unknown, out: string[] = []): string[] {
  if (typeof v === "string") out.push(v);
  else if (Array.isArray(v)) v.forEach((x) => allStrings(x, out));
  else if (v && typeof v === "object") Object.values(v).forEach((x) => allStrings(x, out));
  return out;
}

describe("platforms", () => {
  it("every platform validates against the schema", () => {
    const raw = JSON.parse(readFileSync(join(SRC, "platforms.json"), "utf8")) as unknown[];
    expect(raw.length).toBeGreaterThan(0);
    for (const p of raw) {
      const r = platformSchema.safeParse(p);
      expect(r.success, JSON.stringify(r.success ? "" : r.error.issues)).toBe(true);
    }
    expect(platforms.length).toBe(raw.length);
  });
});

describe("disputes", () => {
  it("covers all 19 dispute types", () => {
    expect(disputes.map((d) => d.id).sort()).toEqual([...DISPUTE_IDS].sort());
  });

  it("every dispute maps to at least one existing platform", () => {
    for (const d of disputes) {
      expect(d.default_platform_ids.length, d.id).toBeGreaterThan(0);
      for (const pid of d.default_platform_ids) {
        expect(platformById(pid), `${d.id} -> ${pid}`).toBeDefined();
      }
    }
  });

  it("the 10 MVP disputes are full depth with at most 6 questions", () => {
    expect(disputes.filter((d) => d.depth === "full").length).toBe(10);
    for (const d of disputes) expect(d.questions.length).toBeLessThanOrEqual(6);
  });
});

describe("offices", () => {
  const wards = officesPune.filter((o) => o.type === "ward_office");

  it("has 15 PMC ward offices and 5 zone DMCs", () => {
    expect(wards.length).toBe(15);
    expect(officesPune.filter((o) => o.type === "zone_dmc").length).toBe(5);
  });

  it("every Pune ward office has a phone and an email", () => {
    for (const w of wards) {
      expect(w.phone, w.id).toBeTruthy();
      expect(w.email, w.id).toBeTruthy();
    }
  });

  it("keeps the published hadpsar spelling", () => {
    expect(wards.some((w) => w.email === "hadpsar@punecorporation.org")).toBe(true);
  });

  it("every office email is well formed", () => {
    for (const o of officesPune) if (o.email) expect(o.email, o.id).toMatch(EMAIL);
    for (const s of states) if (s.slsa?.email) expect(s.slsa.email).toMatch(EMAIL);
  });
});

describe("legal aid", () => {
  it("has all 37 income ceilings present", () => {
    expect(legalAid.states.length).toBe(37);
    for (const s of legalAid.states) expect(typeof s.income_ceiling_inr, s.state_code).toBe("number");
  });

  it("has the 8 Section 12 flags and helpline 15100", () => {
    expect(legalAid.section12_flags.length).toBe(8);
    expect(legalAid.helpline).toBe("15100");
  });

  it("states.json has 36 States/UTs", () => {
    expect(states.length).toBe(36);
    expect(states.filter((s) => s.coverage === "deep").map((s) => s.code)).toEqual(["MH"]);
  });
});

describe("timers and insights", () => {
  it("timers reference only real dispute types", () => {
    for (const t of timers) for (const d of t.dispute_types) expect(DISPUTE_IDS).toContain(d);
  });

  it("platform insights are labelled as the qwen draft", () => {
    expect(platformInsights.length).toBeGreaterThan(0);
    for (const i of platformInsights) expect(platformById(i.platform_id), i.platform_id).toBeDefined();
  });
});

describe("global rules", () => {
  it("no string anywhere in the data contains edaakhil", () => {
    for (const file of jsonFiles(SRC)) {
      const text = allStrings(JSON.parse(readFileSync(file, "utf8"))).join("\n").toLowerCase();
      expect(text.includes("edaakhil"), file).toBe(false);
    }
  });

  it("no em dash (U+2014) in any generated JSON", () => {
    for (const file of jsonFiles(SRC)) {
      expect(readFileSync(file, "utf8").includes("2014"), file).toBe(false);
    }
  });
});
