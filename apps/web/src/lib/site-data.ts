// Direct JSON imports (not the @raasta/data index) so the browser bundle never pulls in platforms.json or disputes.json.
import type { LegalAidData, Office, StateInfo } from "@raasta/data/types";
import officesJson from "../../../../packages/data/src/offices.pune.json";
import legalAidJson from "../../../../packages/data/src/legal-aid.json";
import statesJson from "../../../../packages/data/src/states.json";

export const officesPune = officesJson as Office[];
export const legalAid = legalAidJson as unknown as LegalAidData;
export const states = statesJson as StateInfo[];
export const stateByCode = (code: string | undefined): StateInfo | undefined =>
  states.find((s) => s.code.toLowerCase() === (code ?? "").toLowerCase());

import citiesJson from "../../../../packages/data/src/offices.cities.json";
export const officesCities = citiesJson as Office[];

/** Cities with a researched office directory, in display order. */
export const CITIES = [
  { slug: "pune", name: "Pune" },
  { slug: "mumbai", name: "Mumbai" },
  { slug: "delhi", name: "Delhi" },
  { slug: "bengaluru", name: "Bengaluru" },
  { slug: "chennai", name: "Chennai" },
  { slug: "hyderabad", name: "Hyderabad" },
] as const;

export function officesForCity(slug: string): Office[] {
  const c = CITIES.find((x) => x.slug === slug);
  if (!c) return [];
  const extra = officesCities.filter((o) => o.city === c.name);
  return c.slug === "pune" ? [...officesPune, ...extra] : extra;
}
