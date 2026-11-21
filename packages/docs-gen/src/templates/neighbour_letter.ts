import type { TemplateDef } from "../model";
import { COMMON_VARS, NAME_KEYS, finish, partyTo, v, vd } from "./util";

export const neighbourLetter: TemplateDef = {
  id: "neighbour_letter",
  title_en: "Friendly letter to a neighbour",
  variables: [
    vd("complainant_name", "Your name"),
    vd("neighbor_name", "Neighbour name"),
    vd("address", "Your address", "textarea"),
    vd("damage_type", "What is causing the problem (for example, noise, cracks, water leak)"),
    vd("issue_summary", "What is happening", "textarea"),
    vd("relief_sought", "What would help", "textarea"),
    ...COMMON_VARS,
  ],
  build(vars, ctx) {
    return finish({
      id: "neighbour_letter",
      title: "Letter to a Neighbour",
      vars,
      ctx,
      nameKeys: ["complainant_name", ...NAME_KEYS],
      to: {
        name: `${v(vars, "neighbor_name")} (neighbour)`,
        address: v(vars, "recipient_address"),
      },
      subject: "A request to talk and find a solution together",
      closing: "With respect,",
      paragraphs: [
        `Dear ${v(vars, "neighbor_name")},`,
        "I hope you and your family are well. I am writing because I want us to stay on good terms, and I would like to sort out one matter with you in a friendly way.",
        `The matter is about ${v(vars, "damage_type")}. ${v(vars, "issue_summary", "summary")}`,
        `It would help me if we could do this: ${v(vars, "relief_sought")}`,
        "I would be happy to meet you at a time that suits you, with a family elder or a society member if you like. Please tell me a day and time, or call me on the number above.",
        "Thank you for reading this letter. I am sure we can find a way that is fair to both of us.",
      ],
      enclosures: [],
    });
  },
};
