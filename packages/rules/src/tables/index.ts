import type { DisputeType } from "../types";
import type { DisputeTable } from "./types";
import { consumerRefund } from "./consumer_refund";
import { mrpOvercharge } from "./mrp_overcharge";
import { unpaidWages } from "./unpaid_wages";
import { securityDeposit } from "./security_deposit";
import { neighbourConstruction } from "./neighbour_construction";
import { civicFailure } from "./civic_failure";
import { cyberFraud } from "./cyber_fraud";
import { cyberHarassment } from "./cyber_harassment";
import { bankingNbfc } from "./banking_nbfc";
import { insuranceClaim } from "./insurance_claim";
import { investmentBroker } from "./investment_broker";
import { builderDelay } from "./builder_delay";
import { govtService } from "./govt_service";
import { pensionPf } from "./pension_pf";
import { workplaceHarassment } from "./workplace_harassment";
import { policeComplaint } from "./police_complaint";
import { lostMobile } from "./lost_mobile";
import { freeLegalAid } from "./free_legal_aid";
import { other } from "./other";

export const TABLES: Record<DisputeType, DisputeTable> = {
  consumer_refund: consumerRefund, mrp_overcharge: mrpOvercharge, unpaid_wages: unpaidWages,
  security_deposit: securityDeposit, neighbour_construction: neighbourConstruction, civic_failure: civicFailure,
  cyber_fraud: cyberFraud, cyber_harassment: cyberHarassment, banking_nbfc: bankingNbfc,
  insurance_claim: insuranceClaim, investment_broker: investmentBroker, builder_delay: builderDelay,
  govt_service: govtService, pension_pf: pensionPf, workplace_harassment: workplaceHarassment,
  police_complaint: policeComplaint, lost_mobile: lostMobile, free_legal_aid: freeLegalAid, other,
};
