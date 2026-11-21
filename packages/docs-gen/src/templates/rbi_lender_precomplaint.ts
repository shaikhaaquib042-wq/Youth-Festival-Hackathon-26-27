import type { TemplateDef } from "../model";
import { COMMON_VARS, finish, officeTo, v, vd } from "./util";

export const rbiLenderPrecomplaint: TemplateDef = {
  id: "rbi_lender_precomplaint",
  title_en: "Complaint to a bank or lender before going to the RBI",
  variables: [
    vd("borrower_name", "Your name", "text", true),
    vd("lender_name", "Bank or lender name", "text", true),
    vd("account_last4", "Last 4 digits of loan or account number"),
    vd("issue_summary", "What went wrong", "textarea"),
    vd("relief_sought", "What you want", "textarea"),
    vd("recipient_address", "Lender address", "textarea"),
    ...COMMON_VARS,
  ],
  build(vars, ctx) {
    const lender = v(vars, "lender_name");
    return finish({
      id: "rbi_lender_precomplaint",
      title: "Complaint to the Lender",
      vars,
      ctx,
      nameKeys: ["borrower_name", "user_name"],
      to: officeTo(vars, ctx, `The Grievance Redressal Officer, ${lender}`),
      subject: `Complaint about my account with ${lender} (last 4 digits ${v(vars, "account_last4")})`,
      paragraphs: [
        "Sir or Madam,",
        `I am a customer of ${lender}. My account or loan number ends with ${v(vars, "account_last4")}.`,
        `My complaint is as follows: ${v(vars, "issue_summary")}`,
        `I request you to do the following: ${v(vars, "relief_sought")}`,
        "Please send me a written reply and a complaint reference number. I am keeping a copy of this letter. If my complaint is not solved, I may take it to the Reserve Bank of India Complaint Management System.",
      ],
      enclosures: [
        "Loan or account statement",
        "Earlier emails, messages or letters about this problem",
      ],
    });
  },
};
