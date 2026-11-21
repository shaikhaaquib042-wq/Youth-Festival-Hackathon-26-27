import { describe, expect, it } from "vitest";
import { LOCALES, LANG_META, type Locale } from "@raasta/i18n";
import en from "../../../packages/i18n/locales/en.json";
import hi from "../../../packages/i18n/locales/hi.json";
import mr from "../../../packages/i18n/locales/mr.json";
import bn from "../../../packages/i18n/locales/bn.json";
import ta from "../../../packages/i18n/locales/ta.json";
import te from "../../../packages/i18n/locales/te.json";
import kn from "../../../packages/i18n/locales/kn.json";
import ml from "../../../packages/i18n/locales/ml.json";
import gu from "../../../packages/i18n/locales/gu.json";
import pa from "../../../packages/i18n/locales/pa.json";
import orLocale from "../../../packages/i18n/locales/or.json";
import ur from "../../../packages/i18n/locales/ur.json";

const LOCALE_DICTS: Record<Exclude<Locale, "en">, Record<string, string>> = {
  hi, mr, bn, ta, te, kn, ml, gu, pa, or: orLocale, ur,
};

describe("i18n Completeness and Integrity", () => {
  const enKeys = Object.keys(en);

  it("English dictionary contains keys", () => {
    expect(enKeys.length).toBeGreaterThan(100);
  });

  it("all 12 locales are registered in LANG_META with valid direction and font", () => {
    expect(LOCALES.length).toBe(12);
    for (const loc of LOCALES) {
      const meta = LANG_META[loc];
      expect(meta).toBeDefined();
      expect(meta.native).toBeTruthy();
      expect(meta.english).toBeTruthy();
      expect(meta.font).toBeTruthy();
      expect(meta.tag).toBeTruthy();
      if (loc === "ur") {
        expect(meta.dir).toBe("rtl");
      } else {
        expect(meta.dir).toBe("ltr");
      }
    }
  });

  it("no em dashes (U+2014) in any locale dictionary", () => {
    const emDash = "\u2014";
    const allDicts = { en, ...LOCALE_DICTS };
    const violations: { locale: string; key: string; value: string }[] = [];

    for (const [loc, dict] of Object.entries(allDicts)) {
      for (const [k, v] of Object.entries(dict)) {
        if (typeof v === "string" && v.includes(emDash)) {
          violations.push({ locale: loc, key: k, value: v });
        }
      }
    }

    expect(violations, `Found em dashes in locales: ${JSON.stringify(violations)}`).toEqual([]);
  });

  it("identifies missing translation keys per locale compared to en.json", () => {
    const missingReport: Record<string, { count: number; missingKeys: string[] }> = {};
    const completeLocales: string[] = [];
    const incompleteLocales: string[] = [];

    for (const [loc, dict] of Object.entries(LOCALE_DICTS)) {
      const missing: string[] = [];
      for (const key of enKeys) {
        if (!(key in dict) || dict[key] === undefined || dict[key] === "") {
          missing.push(key);
        }
      }
      missingReport[loc] = { count: missing.length, missingKeys: missing };
      if (missing.length === 0) {
        completeLocales.push(loc);
      } else {
        incompleteLocales.push(loc);
      }
    }

    // Every locale is tracked
    expect(completeLocales.length + incompleteLocales.length).toBe(11);
    for (const [loc, data] of Object.entries(missingReport)) {
      expect(typeof data.count).toBe("number");
    }
  });

  it("variable placeholders match between English and translations", () => {
    const placeholderRegex = /\{(\w+)\}/g;
    const mismatches: { locale: string; key: string; enVars: string[]; locVars: string[] }[] = [];

    for (const [loc, dict] of Object.entries(LOCALE_DICTS)) {
      for (const [k, enVal] of Object.entries(en)) {
        if (typeof enVal !== "string") continue;
        const enVars = [...enVal.matchAll(placeholderRegex)].map((m) => m[1]).sort();
        if (enVars.length === 0) continue;

        const locVal = dict[k];
        if (!locVal || typeof locVal !== "string") continue;

        const locVars = [...locVal.matchAll(placeholderRegex)].map((m) => m[1]).sort();
        if (JSON.stringify(enVars) !== JSON.stringify(locVars)) {
          mismatches.push({ locale: loc, key: k, enVars, locVars });
        }
      }
    }

    expect(mismatches, `Variable placeholder mismatches: ${JSON.stringify(mismatches)}`).toEqual([]);
  });
});
