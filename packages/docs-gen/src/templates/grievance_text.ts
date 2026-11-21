import type { TemplateDef } from "../model";
import { COMMON_VARS, NAME_KEYS, finish, lines, officeTo, raw, v, vDate, vMoney, vd } from "./util";

export const grievanceText: TemplateDef = {
  id: "grievance_text",
  title_en: "Grievance text for CPGRAMS or Aaple Sarkar",
  variables: [
    vd("complainant_name", "Your name"),
    vd("department_name", "Office, department, company or ward you complain about"),
    vd("service_name", "Service or issue"),
    vd("application_number", "Application, policy, claim or reference number"),
    vd("applied_on", "Date you applied or the problem began", "date"),
    vd("amount", "Amount involved (Rs.)", "number"),
    vd("issue_summary", "What went wrong", "textarea"),
    vd("relief_sought", "What you want", "textarea"),
    ...COMMON_VARS,
  ],
  build(vars, ctx) {
    const against = raw(
      vars, "department_name", "insurer_name", "broker_name", "employer_name", "ward_name",
    );
    const details = lines([
      ["Against", against],
      ["Service or issue", raw(vars, "service_name", "issue_type", "claim_type")],
      [
        "Reference number",
        raw(
          vars, "application_number", "policy_number", "claim_number", "client_id",
          "uan_number", "complaint_reference",
        ),
      ],
      ["Date", raw(vars, "applied_on") ? vDate(vars, "applied_on") : ""],
      ["Amount", raw(vars, "claim_amount", "amount_involved", "amount") ? vMoney(vars, "claim_amount", "amount_involved", "amount") : ""],
      ["Place", raw(vars, "address")],
    ]);
    return finish({
      id: "grievance_text",
      title: "Public Grievance",
      vars,
      ctx,
      nameKeys: ["complainant_name", ...NAME_KEYS],
      to: officeTo(vars, ctx, "The Nodal Grievance Officer (CPGRAMS or Aaple Sarkar portal)"),
      subject: `Grievance about ${against || "________"}`,
      paragraphs: [
        "Sir or Madam,",
        "I am writing to raise the following grievance.",
        ...(details ? ["## Details", details] : []),
        "## What happened",
        v(vars, "issue_summary", "summary", "incident_summary"),
        "## What I request",
        v(vars, "relief_sought"),
        "Please send me the status of my grievance and the name of the officer who is handling it.",
      ],
      enclosures: ["Copy of application, receipt or earlier complaint", "Any other papers that support my grievance"],
    });
  },
};
