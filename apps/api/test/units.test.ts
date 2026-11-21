import { describe, expect, it } from "vitest";
import { StreamUrlFilter, filterUrls } from "../src/ai/filter";
import { providerOrder } from "../src/ai";
import { extractAmount, extractDays } from "../src/ai/keyword";
import { simplify, decodePolyline5 } from "../src/geo/directions";
import { resolveGeo, isPcmcArea } from "../src/geo/resolver";
import { wardForPoint } from "../src/geo/pune";
import { makeEnv } from "./helpers";

describe("filterUrls", () => {
  it("keeps registry URLs and removes others", () => {
    const out = filterUrls("See https://pgportal.gov.in/ and https://fake.example.org/a/b, plus evil.com/x.");
    expect(out).toContain("https://pgportal.gov.in/");
    expect(out).not.toContain("fake.example");
    expect(out).not.toContain("evil.com");
  });

  it("never lets a URL split across stream chunks through", () => {
    const f = new StreamUrlFilter();
    let out = "";
    for (const c of ["go to https://ev", "il.example.net/x now"]) out += f.push(c);
    out += f.flush();
    expect(out).not.toContain("evil");
    expect(out).toContain("go to");
  });
});

describe("providers", () => {
  it("orders free providers first and honours AI_PRIMARY", () => {
    const env = makeEnv({ GEMINI_API_KEY: "g", ANTHROPIC_API_KEY: "a", AI: {} as never, OPENAI_BASE_URL: "https://x.test/v1" });
    expect(providerOrder(env).map((p) => p.name)).toEqual(["gemini", "workers", "openai", "anthropic"]);
    expect(providerOrder({ ...env, AI_PRIMARY: "workers" }).map((p) => p.name)[0]).toBe("workers");
    expect(providerOrder(makeEnv())).toEqual([]);
  });

  it("ollama is allowed only on localhost", () => {
    expect(providerOrder(makeEnv({ OLLAMA_URL: "http://localhost:11434" })).map((p) => p.name)).toEqual(["ollama"]);
    expect(providerOrder(makeEnv({ OLLAMA_URL: "https://ollama.example.com" }))).toEqual([]);
  });
});

describe("keyword extraction", () => {
  it("finds amounts and durations", () => {
    expect(extractAmount("They owe me Rs. 12,500")).toBe(12500);
    expect(extractAmount("paid 4000 rupees")).toBe(4000);
    expect(extractDays("for three months")).toBe(90);
    expect(extractDays("nothing here")).toBeUndefined();
  });
});

describe("geo", () => {
  it("separates PMC and PCMC by area name", () => {
    expect(isPcmcArea("Pimpri")).toBe(true);
    expect(isPcmcArea("Kothrud")).toBe(false);
    expect(resolveGeo({ state_code: "MH", city: "Pune" }).ulb).toBe("PMC");
    expect(resolveGeo({ state_code: "MH", city: "Chinchwad" }).ulb).toBe("PCMC");
    expect(resolveGeo({ state_code: "MH", city: "Pune" }, {}, { area: "Wakad" }).ulb).toBe("PCMC");
  });

  it("uses a user picked ward id and ignores unknown ones", () => {
    expect(resolveGeo({ state_code: "MH", city: "Pune" }, {}, { wardId: "pmc_ward_kothrud_bavdhan" }).pmc_ward_id).toBe("pmc_ward_kothrud_bavdhan");
    expect(resolveGeo({ state_code: "MH", city: "Pune" }, {}, { wardId: "bogus" }).pmc_ward_id).toBeUndefined();
  });

  it("falls back to request.cf for coarse location, and unknown coverage without one", () => {
    expect(resolveGeo({}, { regionCode: "KL", city: "Kochi" }).state_code).toBe("KL");
    expect(resolveGeo({}, {}).coverage).toBe("unknown");
    expect(resolveGeo({ state_code: "MH" }).coverage).toBe("deep");
  });

  it("point in polygon maps a mapped ward point to its ward office", () => {
    // Aundh area falls in admin ward 01 (Aundh) of the DataMeet layer.
    expect(wardForPoint(18.5590, 73.8077)).toBe("pmc_ward_aundh_baner");
    expect(wardForPoint(28.6, 77.2)).toBeUndefined();
  });

  it("simplify keeps endpoints and reduces points; polyline decoder works", () => {
    const pts: [number, number][] = Array.from({ length: 300 }, (_, i) => [18 + i * 0.0001, 73 + i * 0.0001]);
    const s = simplify(pts);
    expect(s[0]).toEqual(pts[0]);
    expect(s.at(-1)).toEqual(pts.at(-1));
    expect(s.length).toBe(2);
    expect(decodePolyline5("_p~iF~ps|U_ulLnnqC_mqNvxq`@")[0]).toEqual([38.5, -120.2]);
  });
});
