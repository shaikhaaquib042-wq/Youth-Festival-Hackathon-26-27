import type { TemplateDef } from "../model";
import { COMMON_VARS, finish, has, officeTo, raw, v, vDate, vMoney, vd } from "./util";

export const maharaeraConciliation: TemplateDef = {
  id: "maharera_conciliation",
  title_en: "MahaRERA conciliation request",
  variables: [
    vd("buyer_name", "Your name", "text", true),
    vd("builder_name", "Builder or promoter name", "text", true),
    vd("project_name", "Project name"),
    vd("rera_number", "MahaRERA registration number"),
    vd("amount_paid", "Amount paid so far (Rs.)", "number"),
    vd("promised_date", "Possession date promised in the agreement", "date"),
    vd("issue_summary", "What went wrong", "textarea"),
    vd("relief_sought", "What you want", "textarea"),
    ...COMMON_VARS,
  ],
  build(vars, ctx) {
    const builder = v(vars, "builder_name");
    return finish({
      id: "maharera_conciliation",
      title: "Request for Conciliation",
      vars,
      ctx,
      nameKeys: ["buyer_name", "user_name"],
      to: officeTo(vars, ctx, "The Conciliation Forum, MahaRERA"),
      subject: `Conciliation request against ${builder} for project ${v(vars, "project_name")}`,
      paragraphs: [
        "Sir or Madam,",
        `I am a buyer in the project ${v(vars, "project_name")} by ${builder}. The MahaRERA registration number is ${v(vars, "rera_number")}. I have paid ${vMoney(vars, "amount_paid")} so far.`,
        has(vars, "promised_date")
          ? `The agreement promised possession by ${vDate(vars, "promised_date")}.`
          : `The agreement promised possession by ${v(vars, "promised_date")}.`,
        `The problem is as follows: ${v(vars, "issue_summary")}`,
        `I request the Forum to help us settle this by talking: ${raw(vars, "relief_sought") || BLANK_RELIEF}`,
        "I am ready to take part in the conciliation meeting and to share my papers.",
      ],
      enclosures: [
        "Copy of agreement for sale or allotment letter",
        "Payment receipts",
        "Letters or messages exchanged with the builder",
      ],
    });
  },
};

const BLANK_RELIEF = "________";
