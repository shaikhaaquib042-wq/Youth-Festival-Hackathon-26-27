// Server entry: registers every locale. Browser code imports "@raasta/i18n/core" via a build alias instead.
import en from "../locales/en.json";
import hi from "../locales/hi.json";
import mr from "../locales/mr.json";
import bn from "../locales/bn.json";
import ta from "../locales/ta.json";
import te from "../locales/te.json";
import kn from "../locales/kn.json";
import ml from "../locales/ml.json";
import gu from "../locales/gu.json";
import pa from "../locales/pa.json";
import or from "../locales/or.json";
import ur from "../locales/ur.json";
import { registerDict } from "./core";

const ALL = { en, hi, mr, bn, ta, te, kn, ml, gu, pa, or, ur } as const;
for (const [lang, dict] of Object.entries(ALL)) registerDict(lang as keyof typeof ALL, dict as Record<string, string>);

/** Full dictionary for one locale (English merged under it), for embedding in a prerendered page. */
export function dictFor(lang: keyof typeof ALL): Record<string, string> {
  return { ...(ALL.en as Record<string, string>), ...(ALL[lang] as Record<string, string>) };
}

export * from "./core";
