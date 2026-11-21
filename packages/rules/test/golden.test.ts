import { describe, expect, it } from "vitest";
import { route } from "../src";
import { platformById } from "@raasta/data";
import { GEO, slots } from "./fixtures";

const kinds = (o: { submission: { kind: string }[] }) => o.submission.map((m) => m.kind);

describe("golden routes, 10 MVP disputes", () => {
  it("consumer_refund: GRO letter, NCH, then e-Jagriti, fee from registry", () => {
    const r = route(slots({ dispute_type: "consumer_refund", amount_inr: 40000 }), GEO.pmc);
    expect(r.first_peaceful_step).toMatchObject({ key: "step.consumer_gro_letter", doc_template: "gro_letter" });
    expect(r.primary.platform_id).toBe("nch_ingram");
    expect(r.primary.submission[0]).toEqual({ kind: "phone", number: "1915" });
    expect(r.primary.submission).toContainEqual({ kind: "whatsapp", template: "https://wa.me/918800001915?text={summary}" });
    expect(r.alternatives[0].platform_id).toBe("e_jagriti");
    expect(r.alternatives[0].fee).toBe("Up to INR 5 lakh: INR 0");
    expect(r.timers.map((t) => t.key)).toContain("consumer_limitation_2y");
    expect(r.warnings).toContain("warn.nch_no_pause_limitation");
    expect(kinds(r.primary).at(-1)).toBe("guide");
    expect(r.sources.map((s) => s.url).join()).not.toContain("edaakhil");
  });

  it("consumer_refund: after 15 days without answer, e-Jagriti becomes primary", () => {
    const r = route(slots({ dispute_type: "consumer_refund", prior_written_complaint_sent: true, prior_complaint_days_ago: 20 }), GEO.pmc);
    expect(r.primary.platform_id).toBe("e_jagriti");
    expect(r.first_peaceful_step.doc_template).toBe("ejagriti_draft");
  });

  it("consumer_refund: e-Jagriti fee follows the claim slab", () => {
    const r = route(
      slots({ dispute_type: "consumer_refund", prior_written_complaint_sent: true, prior_complaint_days_ago: 20, amount_inr: 700000 }),
      GEO.pmc,
    );
    expect(r.primary.fee).toBe("Above INR 5 lakh to INR 10 lakh: INR 200");
  });

  it("mrp_overcharge: NCH WhatsApp first, e-Jagriti second, metrology warning", () => {
    const r = route(slots({ dispute_type: "mrp_overcharge" }), GEO.pmc);
    expect(r.primary.platform_id).toBe("nch_ingram");
    expect(kinds(r.primary)[0]).toBe("whatsapp");
    expect(r.alternatives.map((a) => a.platform_id)).toEqual(["e_jagriti"]);
    expect(r.warnings).toContain("warn.mrp_legal_metrology");
  });

  it("unpaid_wages: state sphere in Pune goes to Mahakamgar with Pune labour office", () => {
    const r = route(slots({ dispute_type: "unpaid_wages", employer_sphere: "state" }), GEO.pmc);
    expect(r.first_peaceful_step).toMatchObject({ key: "step.wages_demand_notice_7d", doc_template: "demand_notice_wages" });
    expect(r.primary.platform_id).toBe("mahakamgar_labour");
    expect(r.primary.submission).toContainEqual({ kind: "in_person", officeRef: "labour_commissioner_pune_division" });
    expect(r.warnings).toContain("warn.wages_civil_suit_option");
    expect(r.legal_aid.reason_key).toBe("legalaid.check_workman");
  });

  it("unpaid_wages: central sphere goes to SAMADHAN", () => {
    const r = route(slots({ dispute_type: "unpaid_wages", employer_sphere: "central" }), GEO.pmc);
    expect(r.primary.platform_id).toBe("samadhan_labour");
    expect(r.primary.submission).toContainEqual({ kind: "email", to: "samadhan-mole@gov.in", subjectKey: "email.subject.wages_claim" });
  });

  it("unpaid_wages: industrial workman gets free aid with no income test", () => {
    const r = route(slots({ dispute_type: "unpaid_wages", nalsa_status_flags: ["industrial_workman"] }), GEO.pmc);
    expect(r.legal_aid.eligible).toBe("yes");
  });

  it("security_deposit: notice, Tele-Law, DLSA Pune, Small Causes Court, never police", () => {
    const r = route(slots({ dispute_type: "security_deposit" }), GEO.pmc);
    expect(r.first_peaceful_step.key).toBe("step.deposit_notice_15d");
    expect(r.primary.platform_id).toBe("tele_law_nyaya_bandhu");
    expect(r.alternatives.map((a) => a.platform_id)).toEqual(["nalsa_mslsa_dlsa", "maharashtra_rent_small_causes_pune"]);
    expect(r.warnings).toContain("warn.not_police_for_deposit");
    expect(r.offices.map((o) => o.office_id)).toContain("dlsa_pune");
  });

  it("security_deposit: police offered only when cheating is indicated", () => {
    const r = route(slots({ dispute_type: "security_deposit", cheating_indicated: true }), GEO.pmc);
    expect(r.alternatives.map((a) => a.platform_id)).toContain("mahapolice_pune_police");
    expect(r.warnings).not.toContain("warn.not_police_for_deposit");
  });

  it("neighbour_construction: PMC encroachment email plus GPS ward office with zone cc, and DLSA track", () => {
    const r = route(slots({ dispute_type: "neighbour_construction" }), GEO.pmc);
    expect(r.primary.platform_id).toBe("pmc_care_pune");
    expect(r.primary.submission).toContainEqual({
      kind: "email", to: "encroachment1@punecorporation.org", subjectKey: "email.subject.encroachment",
    });
    expect(r.primary.submission).toContainEqual({
      kind: "email", to: "kothrud@punecorporation.org", cc: "dmc2@punecorporation.org", subjectKey: "email.subject.encroachment",
    });
    expect(r.alternatives[0].platform_id).toBe("nalsa_mslsa_dlsa");
    expect(r.first_peaceful_step.doc_template).toBe("neighbour_letter");
    expect(r.offices.map((o) => o.office_id)).toEqual(
      expect.arrayContaining(["pmc_ward_kothrud_bavdhan", "pmc_zone_dmc_2", "dlsa_pune"]),
    );
  });

  it("civic_failure: PMC uses WhatsApp 8888251001, ward email, Swachhata and Aaple Sarkar escalation", () => {
    const r = route(slots({ dispute_type: "civic_failure" }), GEO.pmc);
    expect(r.primary.platform_id).toBe("pmc_care_pune");
    expect(r.primary.submission[0]).toEqual({ kind: "whatsapp", template: "https://wa.me/918888251001?text={summary}" });
    expect(r.alternatives.map((a) => a.platform_id)).toEqual(["swachhata_mohua", "aaple_sarkar_maharashtra"]);
    expect(r.alternatives[1].sla).toBe("21 working days");
    expect(r.alternatives[0].sla).toBe("12 hours");
  });

  it("civic_failure: PCMC uses WhatsApp 9922501450", () => {
    const r = route(slots({ dispute_type: "civic_failure" }), GEO.pcmc);
    expect(r.primary.platform_id).toBe("pcmc_grievance");
    expect(r.primary.submission[0]).toMatchObject({ kind: "whatsapp" });
    expect((r.primary.submission[0] as { template: string }).template).toContain("919922501450");
  });

  it("civic_failure: DIGIT tenant gets the API adapter only when geo sets it", () => {
    const withTenant = route(slots({ dispute_type: "civic_failure" }), GEO.keralaDigit);
    expect(withTenant.primary.platform_id).toBe("digit_upyog_pgr_api");
    expect(withTenant.primary.submission[0]).toEqual({ kind: "api", adapter: "digit_pgr", tenantId: "kl.kochi" });
    const without = route(slots({ dispute_type: "civic_failure" }), GEO.kerala);
    expect(JSON.stringify(without)).not.toContain("digit_pgr");
  });

  it("civic_failure: Mumbai uses the metro portal and WhatsApp from the registry", () => {
    const r = route(slots({ dispute_type: "civic_failure" }), GEO.mumbai);
    expect(r.primary.platform_id).toBe("major_metro_municipal_portals");
    expect(r.sources[0].url).toBe("https://marg.mcgm.gov.in/");
    expect(r.primary.submission[0]).toMatchObject({ kind: "whatsapp" });
  });

  it("cyber_fraud: emergency first, tel 1930, bank letter step, 3 day warning", () => {
    const r = route(slots({ dispute_type: "cyber_fraud", days_since_incident: 1 }), GEO.pmc);
    expect(r.urgency).toBe("emergency");
    expect(r.first_peaceful_step).toMatchObject({ key: "step.call_1930_now", doc_template: "bank_fraud_intimation" });
    expect(r.primary.platform_id).toBe("ncrp_cybercrime");
    expect(r.primary.submission[0]).toEqual({ kind: "phone", number: "1930" });
    expect(r.warnings).toEqual(expect.arrayContaining(["warn.bank_zero_liability_3d", "warn.privacy_mode"]));
  });

  it("cyber_fraud: older than 72 hours is time sensitive but still starts with 1930", () => {
    const r = route(slots({ dispute_type: "cyber_fraud", days_since_incident: 10 }), GEO.pmc);
    expect(r.urgency).toBe("time_sensitive");
    expect(r.primary.submission[0]).toEqual({ kind: "phone", number: "1930" });
  });

  it("banking_nbfc: RBI CMS is blocked before day 30 and offers only the guide", () => {
    const r = route(
      slots({ dispute_type: "banking_nbfc", prior_written_complaint_sent: true, prior_complaint_days_ago: 12 }),
      GEO.pmc,
    );
    expect(r.primary.platform_id).toBe("rbi_cms");
    expect(r.primary.blocked_reason_key).toBe("warn.rbi_cms_blocked_30d");
    expect(r.primary.submission).toEqual([{ kind: "guide" }]);
    expect(r.first_peaceful_step.key).toBe("step.banking_wait_30_days");
    expect(r.timers.map((t) => t.key)).toContain("rbi_cms_prestep_30d");
  });

  it("banking_nbfc: nothing sent yet starts with the lender complaint", () => {
    const r = route(slots({ dispute_type: "banking_nbfc" }), GEO.pmc);
    expect(r.first_peaceful_step).toMatchObject({ key: "step.banking_lender_complaint", doc_template: "rbi_lender_precomplaint" });
    expect(r.primary.blocked_reason_key).toBeDefined();
  });

  it("banking_nbfc: unlocks at 30 days", () => {
    const r = route(
      slots({ dispute_type: "banking_nbfc", prior_written_complaint_sent: true, prior_complaint_days_ago: 30 }),
      GEO.pmc,
    );
    expect(r.primary.blocked_reason_key).toBeUndefined();
    expect(kinds(r.primary)).toEqual(["autofill_helper", "guide"]);
  });

  it("builder_delay: MahaRERA conciliation fee vs Form A fee, with exclusivity warning", () => {
    const r = route(slots({ dispute_type: "builder_delay" }), GEO.pmc);
    expect(r.primary.platform_id).toBe("maharera");
    expect(r.primary.fee).toBe(((platformById("maharera")?.fees ?? {}) as Record<string, string>).conciliation_forum);
    expect(r.primary.fee).toContain("1,000");
    expect(r.alternatives[0].fee).toContain("5,000");
    expect(r.alternatives[0].sla).toBe("120 days");
    expect(r.warnings).toContain("warn.forum_exclusivity_rera");
    expect(r.timers.map((t) => t.key)).toContain("maharera_conciliation_consent_7d");
  });

  it("govt_service: Maharashtra state matter goes to Aaple Sarkar, CPGRAMS as central alternative", () => {
    const r = route(slots({ dispute_type: "govt_service" }), GEO.pmc);
    expect(r.primary.platform_id).toBe("aaple_sarkar_maharashtra");
    expect(r.primary.sla).toBe("21 working days");
    expect(r.alternatives[0].platform_id).toBe("cpgrams");
    expect(r.alternatives[0].submission.some((m) => m.kind === "email")).toBe(false);
  });

  it("govt_service: central sphere goes to CPGRAMS", () => {
    const r = route(slots({ dispute_type: "govt_service", employer_sphere: "central" }), GEO.pmc);
    expect(r.primary.platform_id).toBe("cpgrams");
    expect(r.primary.sla).toBe("21 days");
  });

  it("govt_service: exclusions block CPGRAMS with a reason and send to free advice", () => {
    for (const flag of ["rti", "sub_judice", "personal_family"] as const) {
      const r = route(slots({ dispute_type: "govt_service", employer_sphere: "central", exclusion_flags: [flag] }), GEO.pmc);
      expect(r.primary.platform_id).toBe("tele_law_nyaya_bandhu");
      const cp = r.alternatives.find((a) => a.platform_id === "cpgrams");
      expect(cp?.blocked_reason_key).toBe(`warn.cpgrams_excluded_${flag}`);
      expect(cp?.submission).toEqual([{ kind: "guide" }]);
    }
  });

  it("workplace_harassment: SHe-Box with privacy mode", () => {
    const r = route(slots({ dispute_type: "workplace_harassment", nalsa_status_flags: ["woman"] }), GEO.pmc);
    expect(r.primary.platform_id).toBe("she_box");
    expect(r.warnings).toContain("warn.privacy_mode");
    expect(r.first_peaceful_step.doc_template).toBe("shebox_narrative");
    expect(r.legal_aid.eligible).toBe("yes");
  });
});

describe("golden routes, standard depth disputes", () => {
  it("cyber_harassment", () => {
    const r = route(slots({ dispute_type: "cyber_harassment" }), GEO.pmc);
    expect(r.primary.platform_id).toBe("ncrp_cybercrime");
    expect(r.warnings).toContain("warn.privacy_mode");
    expect(r.alternatives[0].platform_id).toBe("mahapolice_pune_police");
  });
  it("insurance_claim uses the IRDAI GRO directory, not bimabharosa", () => {
    const r = route(slots({ dispute_type: "insurance_claim" }), GEO.pmc);
    expect(r.primary.platform_id).toBe("irdai_bima_bharosa_ombudsman");
    expect(r.sources[0].url).toBe("https://irdai.gov.in/list-of-gros");
    expect(r.primary.submission[0]).toMatchObject({ kind: "email", to: "complaints@irdai.gov.in" });
  });
  it("investment_broker", () => {
    const r = route(slots({ dispute_type: "investment_broker" }), GEO.pmc);
    expect(r.primary.platform_id).toBe("sebi_scores");
    expect(r.timers.map((t) => t.key)).toContain("sebi_rbi_limitation_1y");
  });
  it("pension_pf", () => {
    const r = route(slots({ dispute_type: "pension_pf" }), GEO.pmc);
    expect(r.primary.platform_id).toBe("epfigms");
    expect(r.primary.submission[1]).toEqual({ kind: "phone", number: "14470" });
  });
  it("police_complaint", () => {
    const r = route(slots({ dispute_type: "police_complaint" }), GEO.pmc);
    expect(r.primary.platform_id).toBe("mahapolice_pune_police");
    expect(r.primary.submission[0]).toEqual({ kind: "phone", number: "112" });
    expect(r.warnings).toContain("warn.privacy_mode");
  });
  it("lost_mobile uses the missing mobile form", () => {
    const r = route(slots({ dispute_type: "lost_mobile" }), GEO.pmc);
    expect(r.primary.platform_id).toBe("mahapolice_pune_police");
    expect(r.sources[0].url).toContain("MobileMissingForm");
  });
  it("free_legal_aid", () => {
    const r = route(slots({ dispute_type: "free_legal_aid" }), GEO.pmc);
    expect(r.primary.platform_id).toBe("nalsa_mslsa_dlsa");
    expect(r.primary.submission).toContainEqual({ kind: "phone", number: "15100" });
    expect(r.primary.submission).toContainEqual({ kind: "in_person", officeRef: "dlsa_pune" });
  });
  it("other", () => {
    const r = route(slots({ dispute_type: "other" }), GEO.pmc);
    expect(r.primary.platform_id).toBe("tele_law_nyaya_bandhu");
  });
});

describe("generic behaviour", () => {
  it("is deterministic", () => {
    const s = slots({ dispute_type: "civic_failure" });
    expect(route(s, GEO.pmc)).toEqual(route(s, GEO.pmc));
  });
  it("flags a consumer case close to the 2 year limit as time sensitive", () => {
    const r = route(slots({ dispute_type: "consumer_refund", days_since_incident: 700 }), GEO.pmc);
    expect(r.urgency).toBe("time_sensitive");
    expect(r.warnings).toContain("warn.limitation_close");
  });
  it("warns when the limit has passed", () => {
    const r = route(slots({ dispute_type: "consumer_refund", days_since_incident: 800 }), GEO.pmc);
    expect(r.warnings).toContain("warn.limitation_passed");
  });
  it("is_emergency raises urgency for any dispute", () => {
    expect(route(slots({ dispute_type: "police_complaint", is_emergency: true }), GEO.pmc).urgency).toBe("emergency");
  });
  it("attaches documents from the dispute registry", () => {
    expect(route(slots({ dispute_type: "unpaid_wages" }), GEO.pmc).documents.length).toBeGreaterThan(0);
  });
});
