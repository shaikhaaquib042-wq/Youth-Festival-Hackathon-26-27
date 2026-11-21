import { describe, expect, it } from "vitest";
import { howto, platformById, platforms, states } from "../src/index";

const registryNums = (JSON.stringify([platforms, states]).match(/\d[\d -]*\d/g) ?? []).map((m) => m.replace(/[^0-9]/g, ""));
const digits = (s: string) => s.replace(/[^0-9]/g, "");
// National numbers used across the app (emergency 112, cyber 1930, legal aid 15100) are also in the registry text.
const KNOWN_APP = /^(letter|label|legal-aid|emergency|chat|offices(:[a-z_]+)?|doc:[a-z_]+)$/;

function check(scope: "first" | "platform", id: string, link: string) {
  const [kind, ...restParts] = link.split(":");
  const rest = restParts.join(":");
  if (kind === "url") {
    const [pid, key] = rest.includes(".") ? rest.split(".") : [id, rest];
    expect(scope === "first" ? rest.includes(".") : true, `${id}: first-step url links must name a platform`).toBe(true);
    const url = (platformById(pid!)?.urls as Record<string, unknown> | undefined)?.[key!];
    expect(typeof url === "string" && /^https:\/\//.test(url), `${id} -> ${link}`).toBe(true);
  } else if (kind === "tel") {
    expect(registryNums.some((n) => n === digits(rest) || n.endsWith(digits(rest))), `${id}: phone ${rest} not in registry`).toBe(true);
  } else if (kind === "wa") {
    expect(JSON.stringify(platformById(rest)?.contact_channels ?? {}), `${id}: no WhatsApp for ${rest}`).toMatch(/whatsapp/i);
  } else if (kind === "metro") {
    expect(["portal", "tel", "wa"]).toContain(rest);
  } else if (kind === "state") {
    expect(["slsa", "portal"]).toContain(rest);
  } else if (kind === "app") {
    expect(rest).toMatch(KNOWN_APP);
  } else {
    throw new Error(`${id}: unknown link ${link}`);
  }
}

describe("howto guides", () => {
  it("cover every platform that people are sent to", () => {
    for (const p of platforms) if (p.id !== "digit_upyog_pgr_api") expect(howto.platform[p.id]?.length, p.id).toBeGreaterThan(2);
  });
  it("only link to registry URLs, registry phone numbers and app pages", () => {
    for (const scope of ["first", "platform"] as const)
      for (const [id, steps] of Object.entries(howto[scope])) {
        if (scope === "platform") expect(platformById(id), id).toBeTruthy();
        for (const s of steps) {
          if (s.link) {
            check(scope, id, s.link);
            expect(s.label, `${id}: link without label`).toBeTruthy();
          }
          expect(s.t).not.toMatch(/—/);
        }
      }
  });
});
