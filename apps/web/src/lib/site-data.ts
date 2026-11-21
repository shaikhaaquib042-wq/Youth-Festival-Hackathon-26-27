// Direct JSON imports for the static pages. The @raasta/data index also pulls platforms.json, which contains
// U+2014 and the zod schemas, and would put both into the landing chunk. These three files are the only data
// the content pages need. They are checked by the same schema on the Node side in packages/data.
import officesRaw from "../../../../packages/data/src/offices.pune.json";
import legalAidRaw from "../../../../packages/data/src/legal-aid.json";
import statesRaw from "../../../../packages/data/src/states.json";
import type { LegalAidData, Office, StateInfo } from "@raasta/data";

export const officesPune = officesRaw as unknown as Office[];
export const legalAid = legalAidRaw as unknown as LegalAidData;
export const states = statesRaw as unknown as StateInfo[];
export const stateByCode = (code: string) => states.find((s) => s.code === code);
