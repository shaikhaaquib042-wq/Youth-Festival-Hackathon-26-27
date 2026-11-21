import type { TemplateDef } from "../model";
import { COMMON_VARS, NAME_KEYS, finish, has, officeTo, raw, v, vd } from "./util";

export const pmcWardLetter: TemplateDef = {
  id: "pmc_ward_letter",
  title_en: "Letter to the PMC ward office",
  variables: [
    vd("complainant_name", "Your name"),
    vd("address", "Place of the problem (address or landmark)", "textarea"),
    vd("issue_type", "Type of problem (for example, garbage, water, road, construction)"),
    vd("ward_name", "Ward name"),
    vd("complaint_reference", "Earlier complaint number, if any"),
    vd("neighbor_name", "Neighbour or other party, if it applies"),
    vd("damage_type", "Damage or nuisance, if it applies"),
    vd("issue_summary", "What happened", "textarea"),
    vd("relief_sought", "What you request", "textarea"),
    ...COMMON_VARS,
  ],
  build(vars, ctx) {
    const ward = v(vars, "ward_name");
    return finish({
      id: "pmc_ward_letter",
      title: "Letter to the Ward Office",
      vars,
      ctx,
      nameKeys: ["complainant_name", ...NAME_KEYS],
      to: officeTo(vars, ctx, `The Ward Officer, ${ward}, Pune Municipal Corporation`),
      subject: `Request for action: ${v(vars, "issue_type")} at ${v(vars, "address")}`,
      paragraphs: [
        "Sir or Madam,",
        `I live or work near ${v(vars, "address")} in ${ward}. I am writing about this problem: ${v(vars, "issue_type")}.`,
        ...(has(vars, "neighbor_name") || has(vars, "damage_type")
          ? [`Other party: ${v(vars, "neighbor_name")}. Damage or nuisance: ${v(vars, "damage_type")}.`]
          : []),
        v(vars, "issue_summary", "summary"),
        has(vars, "complaint_reference")
          ? `I have complained before. The complaint number is ${raw(vars, "complaint_reference")}. I have not received a solution.`
          : "Earlier complaint number, if any: ________",
        `I request you to do the following: ${v(vars, "relief_sought")}`,
        "Please send me a written reply or a complaint number so that I can follow up.",
      ],
      enclosures: ["Photos of the problem, with date if possible", "Copy of any earlier complaint"],
    });
  },
};
