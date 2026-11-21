import { legalAid, officeById, stateByCode } from "@raasta/data";
import type { IntakeSlots, OfficeRef, RouteResult } from "./types";
import { primaryUrl } from "./registry";

type LegalAid = RouteResult["legal_aid"];

function contactFor(slots: IntakeSlots, stateCode?: string, inPune?: boolean): OfficeRef {
  const city = (slots.city ?? slots.district ?? "").toLowerCase();
  const pune = stateCode === "MH" && (inPune ?? (city.includes("pune") || city.includes("pimpri")));
  const dlsa = officeById("dlsa_pune");
  if (pune && dlsa) {
    return {
      office_id: dlsa.id, name: dlsa.name, phone: dlsa.phone, email: dlsa.email,
      address: dlsa.address, lat: dlsa.lat, lng: dlsa.lng, verified: dlsa.verified,
    };
  }
  const slsa = stateCode ? stateByCode(stateCode)?.slsa : undefined;
  const directory = slsa?.url ?? primaryUrl("nalsa_mslsa_dlsa", "nalsa_slsa_directory");
  return {
    office_id: `slsa:${stateCode ?? "NALSA"}`,
    name: slsa?.name ?? "National Legal Services Authority (NALSA)",
    phone: slsa?.phone ?? legalAid.helpline,
    email: slsa?.email,
    verified: slsa?.verified ?? false,
    url: directory,
  };
}

/**
 * Section 12 status check plus Section 12(h) state income ceiling.
 * yes = status exempt from income limit, likely = income within the state ceiling (still needs a genuine case, Sec 13),
 * check = we need more information, no = income above the ceiling (Tele-Law stays free for everyone).
 */
export function legalAidCheck(slots: IntakeSlots, stateCode?: string, inPune?: boolean): LegalAid {
  const contact = contactFor(slots, stateCode ?? slots.state_code, inPune);
  const flags = slots.nalsa_status_flags ?? [];
  if (flags.length > 0) return { eligible: "yes", reason_key: "legalaid.status_exempt", contact };

  const code = stateCode ?? slots.state_code;
  const ceiling = code ? legalAid.states.find((s) => s.state_code === code)?.income_ceiling_inr ?? null : null;
  const income = slots.annual_income_inr;

  if (income === undefined) {
    if (slots.dispute_type === "unpaid_wages") return { eligible: "check", reason_key: "legalaid.check_workman", contact };
    return { eligible: "check", reason_key: "legalaid.check_income", contact };
  }
  if (ceiling === null) return { eligible: "check", reason_key: "legalaid.ceiling_unknown", contact };
  if (income <= ceiling) return { eligible: "likely", reason_key: "legalaid.income_within_ceiling", contact };
  return { eligible: "no", reason_key: "legalaid.income_above_ceiling", contact };
}

