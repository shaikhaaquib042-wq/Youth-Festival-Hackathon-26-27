import type { TemplateDef } from "../model";
import { COMMON_VARS, NAME_KEYS, finish, has, officeTo, raw, v, vMoney, vd } from "./util";

export const legalAidApplication: TemplateDef = {
  id: "legal_aid_application",
  title_en: "Application for free legal aid (NALSA or DLSA)",
  variables: [
    vd("applicant_name", "Your name"),
    vd("district", "District"),
    vd("annual_income", "Yearly family income (Rs.)", "number"),
    vd("status_flag", "Category that may apply (for example, woman, child, SC or ST, disability)"),
    vd("matter_summary", "What your problem is about", "textarea"),
    vd("opposite_party", "Other party in the matter"),
    ...COMMON_VARS,
  ],
  build(vars, ctx) {
    const district = v(vars, "district");
    return finish({
      id: "legal_aid_application",
      title: "Application for Free Legal Aid",
      vars,
      ctx,
      nameKeys: ["applicant_name", ...NAME_KEYS],
      to: officeTo(vars, ctx, `The Secretary, District Legal Services Authority, ${district}`),
      subject: "Application for free legal services",
      paragraphs: [
        "Sir or Madam,",
        `I am ${v(vars, "applicant_name", ...NAME_KEYS)}, living at ${v(vars, "user_address")}, district ${district}. I request free legal services from your Authority.`,
        `My yearly family income is ${vMoney(vars, "annual_income", "annual_income_inr")}.`,
        has(vars, "status_flag")
          ? `I belong to this category: ${raw(vars, "status_flag")}.`
          : "Category that may apply to me (woman, child, SC or ST, disability, other): ________",
        `My problem is as follows: ${v(vars, "matter_summary", "issue_summary", "summary")}`,
        `The other party is: ${v(vars, "opposite_party", "employer_name", "owner_name", "neighbor_name")}`,
        "I will give any papers or proof that you ask for. Please tell me what I should do next and when I should come to your office.",
      ],
      enclosures: [
        "Proof of identity",
        "Proof of income or income declaration",
        "Papers related to my problem",
        "Proof of category, if it applies",
      ],
    });
  },
};
