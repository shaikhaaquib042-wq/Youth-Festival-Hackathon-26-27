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
