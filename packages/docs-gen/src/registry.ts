import type { BuildCtx, DocModel, TemplateDef, Vars } from "./model";
import { groLetter } from "./templates/gro_letter";
import { demandNoticeWages } from "./templates/demand_notice_wages";
import { depositNotice } from "./templates/deposit_notice";
import { ejagritiDraft } from "./templates/ejagriti_draft";
import { nchText } from "./templates/nch_text";
import { bankFraudIntimation } from "./templates/bank_fraud_intimation";
import { rbiLenderPrecomplaint } from "./templates/rbi_lender_precomplaint";
import { maharaeraConciliation } from "./templates/maharera_conciliation";
import { grievanceText } from "./templates/grievance_text";
import { pmcWardLetter } from "./templates/pmc_ward_letter";
import { neighbourLetter } from "./templates/neighbour_letter";
import { legalAidApplication } from "./templates/legal_aid_application";
import { policeComplaint } from "./templates/police_complaint";
import { sheboxNarrative } from "./templates/shebox_narrative";

export const templates: TemplateDef[] = [
  groLetter, demandNoticeWages, depositNotice, ejagritiDraft, nchText,
  bankFraudIntimation, rbiLenderPrecomplaint, maharaeraConciliation, grievanceText,
  pmcWardLetter, neighbourLetter, legalAidApplication, policeComplaint, sheboxNarrative,
];

const byId = new Map(templates.map((t) => [t.id, t] as const));

export function getTemplate(id: string): TemplateDef | undefined {
  return byId.get(id);
}

export function buildDoc(templateId: string, vars: Vars, ctx: BuildCtx): DocModel {
  const t = byId.get(templateId);
  if (!t) throw new Error(`Unknown document template: ${templateId}`);
  return t.build(vars, ctx);
}
