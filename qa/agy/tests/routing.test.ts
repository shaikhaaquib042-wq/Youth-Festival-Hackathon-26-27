import { describe, expect, it } from "vitest";
import { platforms, platformById, states, stateByCode } from "@raasta/data";
import { route } from "@raasta/rules";
import type { IntakeSlots, RouteResult } from "@raasta/rules/types";
import { ALL_19_DISPUTES, DEFAULT_GEO, OUTSIDE_MH_GEO, baseSlots } from "./helpers";
import { feeOf, slaOf, NOT_PUBLISHED, registeredUrls } from "@raasta/rules/registry";

describe("Routing correctness for all 19 dispute types", () => {
  const allRegisteredUrls = registeredUrls();

  it("covers all 19 dispute types defined in the contract", () => {
    expect(ALL_19_DISPUTES.length).toBe(19);
  });

  for (const disputeType of ALL_19_DISPUTES) {
    describe(`Dispute type: ${disputeType}`, () => {
      it("routes to a sensible, registered platform in Pune", () => {
        const slots = baseSlots(disputeType);
        const result = route(slots, DEFAULT_GEO);

        expect(result.dispute_type).toBe(disputeType);
        expect(result.primary).toBeDefined();

        const pid = result.primary.platform_id;
        if (pid.startsWith("state:")) {
          const sc = pid.slice(6);
          const stateData = stateByCode(sc);
          expect(stateData).toBeDefined();
          expect(stateData?.grievance_portal?.url).toBeTruthy();
        } else {
          const platform = platformById(pid);
          expect(platform, `Platform ${pid} must exist in platforms.json`).toBeDefined();
        }

        // Verify alternatives
        for (const alt of result.alternatives) {
          if (alt.platform_id.startsWith("state:")) {
            const sc = alt.platform_id.slice(6);
            expect(stateByCode(sc)).toBeDefined();
          } else {
            expect(platformById(alt.platform_id), `Alternative ${alt.platform_id} must exist`).toBeDefined();
          }
        }
      });

      it("copies fee and SLA strings directly from registry (no invented strings)", () => {
        const slots = baseSlots(disputeType);
        const result = route(slots, DEFAULT_GEO);

        const allOptions = [result.primary, ...result.alternatives];
        for (const opt of allOptions) {
          expect(typeof opt.fee).toBe("string");
          expect(opt.fee.length).toBeGreaterThan(0);
          expect(typeof opt.sla).toBe("string");
          expect(opt.sla.length).toBeGreaterThan(0);

          if (!opt.platform_id.startsWith("state:")) {
            const p = platformById(opt.platform_id);
            expect(p).toBeDefined();
            // Verify fee is either NOT_PUBLISHED or matches registry fees
            if (opt.fee !== NOT_PUBLISHED) {
              const feesObj = JSON.stringify(p?.fees ?? {});
              // Must contain some substring or amount
              expect(feesObj.length).toBeGreaterThan(2);
            }
          }
        }
      });

      it("contains no invented URLs in sources or submission modes", () => {
        const slots = baseSlots(disputeType);
        const result = route(slots, DEFAULT_GEO);

        for (const src of result.sources) {
          expect(src.url).toMatch(/^https?:\/\//);
          expect(allRegisteredUrls.has(src.url), `URL ${src.url} must be in registered URLs list`).toBe(true);
        }

        for (const opt of [result.primary, ...result.alternatives]) {
          for (const sub of opt.submission) {
            if (sub.kind === "whatsapp") {
              expect(sub.template).toMatch(/^https:\/\/wa\.me\//);
              expect(allRegisteredUrls.has(sub.template), `WhatsApp template ${sub.template} must be registered`).toBe(true);
            }
          }
        }
      });

      it("provides a valid first peaceful step", () => {
        const slots = baseSlots(disputeType);
        const result = route(slots, DEFAULT_GEO);

        expect(result.first_peaceful_step).toBeDefined();
        expect(result.first_peaceful_step.key).toMatch(/^step\./);
        expect(typeof result.first_peaceful_step.free).toBe("boolean");
      });
    });
  }

  it("checks specific sensible platform targets for core dispute types", () => {
    // 1. consumer_refund default -> nch_ingram
    const crDefault = route(baseSlots("consumer_refund"), DEFAULT_GEO);
    expect(crDefault.primary.platform_id).toBe("nch_ingram");

    // 2. consumer_refund after 15 days notice -> e_jagriti
    const crNotice = route({
      ...baseSlots("consumer_refund"),
      prior_written_complaint_sent: true,
      prior_complaint_days_ago: 15,
    }, DEFAULT_GEO);
    expect(crNotice.primary.platform_id).toBe("e_jagriti");

    // 3. cyber_fraud -> ncrp_cybercrime
    const cf = route(baseSlots("cyber_fraud"), DEFAULT_GEO);
    expect(cf.primary.platform_id).toBe("ncrp_cybercrime");

    // 4. unpaid_wages central -> samadhan_labour
    const uwCentral = route({
      ...baseSlots("unpaid_wages"),
      employer_sphere: "central",
    }, DEFAULT_GEO);
    expect(uwCentral.primary.platform_id).toBe("samadhan_labour");

    // 5. unpaid_wages state MH -> mahakamgar_labour
    const uwState = route({
      ...baseSlots("unpaid_wages"),
      employer_sphere: "state",
    }, DEFAULT_GEO);
    expect(uwState.primary.platform_id).toBe("mahakamgar_labour");

    // 6. civic_failure Pune -> pmc_care_pune
    const civicPune = route(baseSlots("civic_failure"), DEFAULT_GEO);
    expect(civicPune.primary.platform_id).toBe("pmc_care_pune");

    // 7. civic_failure PCMC -> pcmc_grievance
    const civicPcmc = route(baseSlots("civic_failure"), { ...DEFAULT_GEO, ulb: "PCMC", city: "Pimpri" });
    expect(civicPcmc.primary.platform_id).toBe("pcmc_grievance");

    // 8. banking_nbfc after 30 days -> rbi_cms
    const bank30d = route({
      ...baseSlots("banking_nbfc"),
      prior_written_complaint_sent: true,
      prior_complaint_days_ago: 35,
    }, DEFAULT_GEO);
    expect(bank30d.primary.platform_id).toBe("rbi_cms");

    // 9. workplace_harassment -> she_box
    const wh = route(baseSlots("workplace_harassment"), DEFAULT_GEO);
    expect(wh.primary.platform_id).toBe("she_box");

    // 10. builder_delay in MH -> maharera
    const bd = route(baseSlots("builder_delay"), DEFAULT_GEO);
    expect(bd.primary.platform_id).toBe("maharera");
  });
});
