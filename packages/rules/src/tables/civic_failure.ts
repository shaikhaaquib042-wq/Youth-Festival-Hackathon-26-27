import { platformById } from "@raasta/data";
import { normTemplate } from "../registry";
import type { DisputeTable, Ctx, ForumSpec } from "./types";
import { aapleSarkarForum, email, stateGrievanceForum, wa } from "./shared";

const step = { key: "step.civic_report_and_note_ticket", doc_template: "grievance_text", free: true };

const swachhata = (): ForumSpec => ({
  pid: "swachhata_mohua", why: "why.civic_swachhata_sanitation", sla: "sanitation_and_toilets_sla_hours",
  sub: [{ k: "phone", pid: "swachhata_mohua", prefix: "1969" }],
});

interface Metro {
  city: string;
  urls: Record<string, string>;
  helpline?: string[];
  whatsapp_prefill_url_template?: string;
}

export function findMetro(city?: string): Metro | undefined {
  if (!city) return undefined;
  const metros = ((platformById("major_metro_municipal_portals")?.metros ?? []) as Metro[]);
  const c = city.trim().toLowerCase();
  return metros.find((m) => m.city.toLowerCase() === c);
}

function metroForum(m: Metro): ForumSpec {
  const preferred = ["grievance_portal", "complaint_portal", "home", "mcd_portal"];
  const key = preferred.find((k) => m.urls[k]) ?? Object.keys(m.urls)[0];
  const sub: ForumSpec["sub"] = [];
  if (m.whatsapp_prefill_url_template) {
    sub.push({ k: "wa_raw", template: normTemplate(m.whatsapp_prefill_url_template) });
  }
  const num = m.helpline?.[0] ? /^[\d+][\d -]*\d/.exec(m.helpline[0])?.[0] : undefined;
  if (num) sub.push({ k: "phone_raw", number: num.trim() });
  return { pid: "major_metro_municipal_portals", why: "why.civic_metro_portal", sub, url: m.urls[key] };
}

const escalation = (c: Ctx): ForumSpec[] => (c.isMH ? [aapleSarkarForum("why.civic_aaple_escalation_21d")] : []);

// Handbook 6.1 #6 and plan section 6: PMC vs PCMC by polygon, DIGIT tenant, metro portal, state portal, else national fallback.
export const civicFailure: DisputeTable = {
  dispute: "civic_failure",
  rows: [
    {
      id: "pmc",
      when: (c) => c.ulb === "PMC",
      out: (c) => ({
        step,
        primary: {
          pid: "pmc_care_pune", why: "why.civic_pmc_whatsapp", sla: "observed_third_party_estimates",
          sub: [wa("pmc_care_pune"), ...(c.geo.pmc_ward_id ? [email("pmc_care_pune", "ward", "email.subject.civic")] : [])],
        },
        alternatives: [swachhata(), aapleSarkarForum("why.civic_aaple_escalation_21d")],
        offices: ["pmc_ward", "pmc_zone", "pmc_main_building"],
        warnings: ["warn.pmc_no_iframe", "warn.swachhata_sanitation_only"],
      }),
    },
    {
      id: "pcmc",
      when: (c) => c.ulb === "PCMC",
      out: () => ({
        step,
        primary: { pid: "pcmc_grievance", why: "why.civic_pcmc_whatsapp", sub: [wa("pcmc_grievance")] },
        alternatives: [swachhata(), aapleSarkarForum("why.civic_aaple_escalation_21d")],
        warnings: ["warn.swachhata_sanitation_only"],
      }),
    },
    {
      id: "digit_tenant",
      when: (c) => !!c.geo.digit_tenant_id,
      out: (c) => ({
        step,
        primary: { pid: "digit_upyog_pgr_api", why: "why.civic_digit_direct", sub: [{ k: "digit" }] },
        alternatives: [swachhata(), ...escalation(c)],
        warnings: ["warn.swachhata_sanitation_only"],
      }),
    },
    {
      id: "metro",
      when: (c) => !!findMetro(c.geo.city ?? c.slots.city),
      out: (c) => ({
        step,
        primary: metroForum(findMetro(c.geo.city ?? c.slots.city) as Metro),
        alternatives: [swachhata(), ...escalation(c)],
        warnings: ["warn.swachhata_sanitation_only"],
      }),
    },
    {
      id: "maharashtra_other",
      when: (c) => c.isMH,
      out: () => ({
        step,
        primary: aapleSarkarForum("why.civic_state_portal"),
        alternatives: [swachhata()],
        warnings: ["warn.local_body_not_in_data", "warn.swachhata_sanitation_only"],
      }),
    },
    {
      id: "other_state_portal",
      when: (c) => !!stateGrievanceForum(c),
      out: (c) => ({
        step,
        primary: stateGrievanceForum(c, "why.civic_state_portal") as ForumSpec,
        alternatives: [swachhata()],
        warnings: ["warn.local_body_not_in_data", "warn.swachhata_sanitation_only"],
      }),
    },
    {
      id: "fallback",
      out: (c) => ({
        step,
        primary: { ...swachhata(), why: "why.civic_fallback_national" },
        alternatives: [],
        warnings: ["warn.local_body_not_in_data", "warn.swachhata_sanitation_only", ...(c.state ? [] : ["warn.location_unknown"])],
      }),
    },
  ],
};
