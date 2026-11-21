import { describe, expect, it } from "vitest";
import { legalAidCheck, liveTimers } from "../src";
import type { TimerSpec } from "../src";
import { slots } from "./fixtures";

describe("legalAidCheck", () => {
  it("any Section 12 status flag means yes, no income limit", () => {
    const r = legalAidCheck(slots({ nalsa_status_flags: ["sc_st"], annual_income_inr: 99_00_000 }), "MH");
    expect(r.eligible).toBe("yes");
    expect(r.reason_key).toBe("legalaid.status_exempt");
  });
  it("Maharashtra income within 3 lakh is likely", () => {
    expect(legalAidCheck(slots({ annual_income_inr: 300000 }), "MH").eligible).toBe("likely");
  });
  it("Maharashtra income above 3 lakh is no", () => {
    const r = legalAidCheck(slots({ annual_income_inr: 300001 }), "MH");
    expect(r.eligible).toBe("no");
    expect(r.reason_key).toBe("legalaid.income_above_ceiling");
  });
  it("Madhya Pradesh uses its own lower ceiling", () => {
    expect(legalAidCheck(slots({ annual_income_inr: 250000 }), "MP").eligible).toBe("no");
    expect(legalAidCheck(slots({ annual_income_inr: 200000 }), "MP").eligible).toBe("likely");
  });
  it("unknown income asks to check", () => {
    expect(legalAidCheck(slots(), "MH").eligible).toBe("check");
  });
  it("wages case without workman flag asks the industrial workman question", () => {
    expect(legalAidCheck(slots({ dispute_type: "unpaid_wages" }), "MH").reason_key).toBe("legalaid.check_workman");
  });
  it("unknown state with an income is a check, not a guess", () => {
    expect(legalAidCheck(slots({ annual_income_inr: 1000 }), undefined).eligible).toBe("check");
  });
  it("contact is DLSA Pune for Pune", () => {
    const r = legalAidCheck(slots({ city: "Pune" }), "MH");
    expect(r.contact.office_id).toBe("dlsa_pune");
    expect(r.contact.email).toBe("dlsapune2@gmail.com");
  });
  it("contact is SLSA with NALSA directory and helpline for other states", () => {
    const r = legalAidCheck(slots({ city: "Lucknow" }), "UP");
    expect(r.contact.office_id).toBe("slsa:UP");
    expect(r.contact.url).toBe("https://nalsa.gov.in/directory/");
    expect(r.contact.phone).toBe("15100");
    expect(typeof r.contact.verified).toBe("boolean"); // set by scripts/check-links.mjs
  });
  it("Maharashtra outside Pune is SLSA, not DLSA Pune", () => {
    expect(legalAidCheck(slots({ city: "Nagpur" }), "MH").contact.office_id).toBe("slsa:MH");
  });
});

describe("liveTimers", () => {
  const specs: TimerSpec[] = [
    { key: "a", label_en: "from incident", days: 30, from: "incident" },
    { key: "b", label_en: "from prior complaint", days: 21, from: "prior_complaint" },
    { key: "c", label_en: "from now", days: 7, from: "now" },
  ];
  const now = new Date("2026-03-10T10:00:00Z");

  it("counts down from the incident date", () => {
    const [a] = liveTimers(specs, { incidentDate: "2026-03-01", now });
    expect(a.due_date).toBe("2026-03-31");
    expect(a.days_remaining).toBe(21);
    expect(a.status).toBe("running");
    expect(a.label_key).toBe("timer.a");
  });
  it("counts from the prior complaint date", () => {
    const b = liveTimers(specs, { priorComplaintDate: new Date("2026-02-01T00:00:00Z"), now })[1];
    expect(b.due_date).toBe("2026-02-22");
    expect(b.days_remaining).toBe(-16);
    expect(b.status).toBe("overdue");
  });
  it("starts 'now' timers today", () => {
    const c = liveTimers(specs, { now })[2];
    expect(c.due_date).toBe("2026-03-17");
    expect(c.days_remaining).toBe(7);
  });
  it("reports needs_date when the start date is missing", () => {
    const [a, b] = liveTimers(specs, { now });
    expect(a).toMatchObject({ due_date: null, days_remaining: null, status: "needs_date" });
    expect(b.status).toBe("needs_date");
  });
  it("is due_today on the due date and ignores time of day", () => {
    const t = liveTimers([specs[0]], { incidentDate: "2026-02-08", now: new Date("2026-03-10T23:59:00Z") })[0];
    expect(t.days_remaining).toBe(0);
    expect(t.status).toBe("due_today");
  });
  it("rejects an invalid date as needs_date", () => {
    expect(liveTimers([specs[0]], { incidentDate: "not a date", now })[0].status).toBe("needs_date");
  });
});
