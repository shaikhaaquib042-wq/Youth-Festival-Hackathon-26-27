import { describe, expect, it } from "vitest";
import { route } from "../src";
import { GEO, slots } from "./fixtures";

describe("state fallbacks", () => {
  it("Kerala user, civic: national Swachhata fallback, no Pune or Maharashtra contacts", () => {
    const r = route(slots({ dispute_type: "civic_failure" }), GEO.kerala);
    expect(r.primary.platform_id).toBe("swachhata_mohua");
    expect(r.warnings).toContain("warn.local_body_not_in_data");
    expect(JSON.stringify([r.primary, r.alternatives, r.sources, r.offices])).not.toMatch(/punecorporation|aaple|maharashtra/i);
    expect(r.legal_aid.contact.office_id).toBe("slsa:KL");
    expect(r.legal_aid.contact.url).toBe("https://nalsa.gov.in/directory/");
    expect(r.offices).toEqual([]);
  });

  it("Kerala user, wages: legal aid, since no state labour office is on file", () => {
    const r = route(slots({ dispute_type: "unpaid_wages", employer_sphere: "state" }), GEO.kerala);
    expect(r.primary.platform_id).toBe("nalsa_mslsa_dlsa");
    expect(r.primary.submission).toContainEqual({ kind: "phone", number: "15100" });
    expect(r.primary.submission.some((m) => m.kind === "in_person")).toBe(false);
    expect(r.warnings).toContain("warn.state_office_not_in_data");
  });

  it("UP user, builder delay: no MahaRERA", () => {
    const r = route(slots({ dispute_type: "builder_delay" }), GEO.up);
    expect(r.primary.platform_id).toBe("tele_law_nyaya_bandhu");
    expect(JSON.stringify(r)).not.toContain("maharera");
    expect(r.warnings).toContain("warn.state_rera_not_in_data");
  });

  it("UP user, deposit: no Pune small causes court", () => {
    const r = route(slots({ dispute_type: "security_deposit", cheating_indicated: true }), GEO.up);
    const ids = r.alternatives.map((a) => a.platform_id);
    expect(ids).not.toContain("maharashtra_rent_small_causes_pune");
    expect(ids).not.toContain("mahapolice_pune_police");
  });

  it("UP user, govt service: central CPGRAMS as the only portal on file", () => {
    const r = route(slots({ dispute_type: "govt_service", employer_sphere: "central" }), GEO.up);
    expect(r.primary.platform_id).toBe("cpgrams");
    expect(r.legal_aid.contact.office_id).toBe("slsa:UP");
  });

  it("UP user, police: no Maharashtra portal", () => {
    const r = route(slots({ dispute_type: "police_complaint" }), GEO.up);
    expect(r.primary.platform_id).toBe("tele_law_nyaya_bandhu");
    expect(r.warnings).toContain("warn.state_office_not_in_data");
  });

  it("Pune PMC ward user: ward and zone offices resolved", () => {
    const r = route(slots({ dispute_type: "civic_failure" }), GEO.pmc);
    expect(r.offices.map((o) => o.office_id)).toEqual(["pmc_ward_kothrud_bavdhan", "pmc_zone_dmc_2", "pmc_main_building"]);
    expect(r.primary.submission).toContainEqual({
      kind: "email", to: "kothrud@punecorporation.org", cc: "dmc2@punecorporation.org", subjectKey: "email.subject.civic",
    });
    expect(r.legal_aid.contact.office_id).toBe("dlsa_pune");
  });

  it("Pune PMC without a ward id: still routes to PMC, no ward email", () => {
    const r = route(slots({ dispute_type: "civic_failure" }), GEO.pmcNoWard);
    expect(r.primary.platform_id).toBe("pmc_care_pune");
    expect(r.primary.submission.some((m) => m.kind === "email")).toBe(false);
  });

  it("PCMC user: PCMC WhatsApp, never PMC contacts", () => {
    const r = route(slots({ dispute_type: "civic_failure" }), GEO.pcmc);
    expect(JSON.stringify(r)).not.toContain("918888251001");
    expect(r.legal_aid.contact.office_id).toBe("dlsa_pune");
  });

  it("PCMC neighbour construction uses PCMC, not the PMC encroachment email", () => {
    const r = route(slots({ dispute_type: "neighbour_construction" }), GEO.pcmc);
    expect(r.primary.platform_id).toBe("pcmc_grievance");
    expect(JSON.stringify(r)).not.toContain("encroachment1@");
  });

  it("Maharashtra outside Pune, civic: Aaple Sarkar state portal", () => {
    const r = route(slots({ dispute_type: "civic_failure" }), GEO.nagpur);
    expect(r.primary.platform_id).toBe("aaple_sarkar_maharashtra");
    expect(r.legal_aid.contact.office_id).toBe("slsa:MH");
  });

  it("unknown location: civic falls back nationally and says the location is unknown", () => {
    const r = route(slots({ dispute_type: "civic_failure" }), GEO.unknown);
    expect(r.primary.platform_id).toBe("swachhata_mohua");
    expect(r.warnings).toContain("warn.location_unknown");
    expect(r.legal_aid.contact.office_id).toBe("slsa:NALSA");
    expect(r.legal_aid.contact.phone).toBe("15100");
  });

  it("unknown location: consumer and cyber routes still work (national forums)", () => {
    expect(route(slots({ dispute_type: "consumer_refund" }), GEO.unknown).primary.platform_id).toBe("nch_ingram");
    expect(route(slots({ dispute_type: "cyber_fraud", days_since_incident: 0 }), GEO.unknown).primary.submission[0]).toEqual({
      kind: "phone", number: "1930",
    });
  });

  it("slots.state_code is used when geo has none", () => {
    const r = route(slots({ dispute_type: "builder_delay", state_code: "MH" }), { coverage: "unknown" });
    expect(r.primary.platform_id).toBe("maharera");
  });
});

describe("legal aid on results", () => {
  it("every result carries a contact with a phone or office", () => {
    const r = route(slots({ dispute_type: "free_legal_aid" }), GEO.kerala);
    expect(r.legal_aid.contact.phone).toBeDefined();
  });
});
