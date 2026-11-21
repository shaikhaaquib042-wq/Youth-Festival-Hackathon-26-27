import { describe, expect, it } from "vitest";
import { states } from "@raasta/data";
import { route } from "@raasta/rules";
import { DISPUTE_TYPES, type GeoContext, type IntakeSlots } from "@raasta/rules/types";
import { howtoSteps } from "../src/views/route/howto";

const CITIES: Record<string, string> = { MH: "Pune", KA: "Bengaluru", DL: "Delhi", TN: "Chennai", TG: "Hyderabad", WB: "Kolkata", GJ: "Ahmedabad" };

describe("step-by-step guides in every state", () => {
  it("every first step and every door that is not a direct API filing has a guide with at least 3 steps", () => {
    const gaps: string[] = [];
    for (const s of states) {
      for (const city of [undefined, CITIES[s.code]]) {
        const geo: GeoContext = { state_code: s.code, city, coverage: s.coverage, ...(city === "Pune" ? { ulb: "PMC" } : {}) };
        for (const d of DISPUTE_TYPES) {
          for (const extra of [{}, { is_emergency: true, violence_indicated: true }, { days_since_incident: 0, is_emergency: true }]) {
            const slots = { dispute_type: d, summary: "x", missing_fields: [], ...extra } as IntakeSlots;
            const r = route(slots, geo);
            const ctx = { lang: "en" as const, token: "tok", geo, letter: "deposit_notice" };
            if (howtoSteps("first", r.first_peaceful_step.key, ctx).length < 3) gaps.push(`${s.code}/${city}/${d}: first ${r.first_peaceful_step.key}`);
            for (const o of [r.primary, ...r.alternatives]) {
              if (o.submission[0]?.kind === "api") continue;
              if (howtoSteps("platform", o.platform_id, ctx).length < 3) gaps.push(`${s.code}/${city}/${d}: door ${o.platform_id}`);
            }
          }
        }
      }
    }
    expect([...new Set(gaps)]).toEqual([]);
  });

  it("city portals resolve for metros and links stay https, tel, wa.me or in-app", () => {
    const geo: GeoContext = { state_code: "KA", city: "Bengaluru", coverage: "standard" };
    const steps = howtoSteps("platform", "major_metro_municipal_portals", { lang: "en", token: "tok", geo });
    const links = steps.flatMap((s) => (s.link ? [s.link.href] : []));
    expect(links.length).toBeGreaterThanOrEqual(2);
    for (const h of links) expect(h).toMatch(/^(https:\/\/|tel:|\/r\/|\/legal-aid|\/emergency)/);
    expect(steps.some((s) => s.link?.label.includes("Bengaluru"))).toBe(true);
  });

  it("state-only steps follow the state", () => {
    const mh = howtoSteps("first", "step.lost_mobile_block_and_report", { lang: "en", geo: { state_code: "MH", coverage: "deep" } });
    const ka = howtoSteps("first", "step.lost_mobile_block_and_report", { lang: "en", geo: { state_code: "KA", coverage: "standard" } });
    expect(mh.some((s) => s.link?.href.includes("mahapolice"))).toBe(true);
    expect(ka.some((s) => s.link?.href.includes("mahapolice"))).toBe(false);
    expect(ka.some((s) => s.link?.href.startsWith("/r/offices?type=police&state=KA"))).toBe(true);
  });
});

import { disputes } from "@raasta/data";
import { firstApplicable, nextApplicable, routesOn } from "../src/lib/flow";

describe("minimal questions", () => {
  it("guided flows only ask questions that change the route, and skip the city when it is known", () => {
    for (const d of disputes) {
      const asked: string[] = [];
      for (let i = firstApplicable(d, {}, { city: "Pune" }); i >= 0; i = nextApplicable(d, i, {}, { city: "Pune" })) asked.push(d.questions[i]!.id);
      for (const id of asked) {
        const q = d.questions.find((x) => x.id === id)!;
        expect(routesOn(q), `${d.id}/${id}`).toBe(true);
        expect(q.slot, `${d.id}/${id} asks the city again`).not.toBe("city");
      }
      expect(asked.length, d.id).toBeLessThanOrEqual(d.questions.length);
    }
  });
});
