import { z } from "zod";
import platformsRaw from "./platforms.json";
import officesRaw from "./offices.pune.json";
import legalAidRaw from "./legal-aid.json";
import timersRaw from "./timers.json";
import disputesRaw from "./disputes.json";
import statesRaw from "./states.json";
import insightsRaw from "./derived/platform-insights.json";
import {
  platformSchema, disputeSchema, officeSchema, legalAidSchema,
  stateInfoSchema, timerDefSchema, platformInsightsFileSchema,
  type Platform, type Dispute, type Office, type LegalAidData, type StateInfo, type TimerDef,
  type PlatformInsight,
} from "./schemas";

export type { Platform, Dispute, Office, LegalAidData, StateInfo, TimerDef, PlatformInsight };

// Parsed once at module load. A schema mismatch throws here, so bad data never reaches the apps.
export const platforms: Platform[] = z.array(platformSchema).parse(platformsRaw);
export const disputes: Dispute[] = z.array(disputeSchema).parse(disputesRaw);
export const officesPune: Office[] = z.array(officeSchema).parse(officesRaw);
export const legalAid: LegalAidData = legalAidSchema.parse(legalAidRaw);
export const timers: TimerDef[] = z.array(timerDefSchema).parse(timersRaw);
export const states: StateInfo[] = z.array(stateInfoSchema).parse(statesRaw);
export const platformInsights: PlatformInsight[] = platformInsightsFileSchema.parse(insightsRaw).items;

const platformMap = new Map(platforms.map((p) => [p.id, p] as const));
const disputeMap = new Map(disputes.map((d) => [d.id, d] as const));
const officeMap = new Map(officesPune.map((o) => [o.id, o] as const));
const stateMap = new Map(states.map((s) => [s.code, s] as const));

export function platformById(id: string): Platform | undefined {
  return platformMap.get(id);
}

export function disputeById(id: string): Dispute | undefined {
  return disputeMap.get(id as Dispute["id"]);
}

export function officeById(id: string): Office | undefined {
  return officeMap.get(id);
}

export function stateByCode(code: string): StateInfo | undefined {
  return stateMap.get(code);
}
