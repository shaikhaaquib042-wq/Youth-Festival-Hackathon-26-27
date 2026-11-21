import type { TemplateDef } from "../model";
import { NAME_KEYS, finish, v, vDate, vd } from "./util";

export const sheboxNarrative: TemplateDef = {
  id: "shebox_narrative",
  title_en: "Narrative for a SHe-Box complaint",
  variables: [
    vd("complainant_name", "Your name"),
    vd("employer_name", "Workplace or organisation"),
    vd("incident_date", "Date of incident, or period", "date"),
    vd("incident_place", "Place within the workplace"),
    vd("accused_name", "Name and role of the person involved"),
    vd("incident_summary", "What happened, in your own words", "textarea"),
    vd("witnesses", "Anyone who saw or knows about it"),
    vd("relief_sought", "What you want to happen", "textarea"),
  ],
  build(vars, ctx) {
    return finish({
      id: "shebox_narrative",
      title: "Narrative for the SHe-Box Complaint Form",
      vars,
      ctx,
      nameKeys: ["complainant_name", ...NAME_KEYS],
      to: { name: "SHe-Box online complaint form (copy and paste this text)" },
      subject: "Complaint of harassment at the workplace",
      paragraphs: [
        `I am ${v(vars, "complainant_name", ...NAME_KEYS)}. I work, or worked, at ${v(vars, "employer_name")}.`,
        `Date or period: ${vDate(vars, "incident_date")}. Place: ${v(vars, "incident_place")}.`,
        `Person involved: ${v(vars, "accused_name")}.`,
        `What happened: ${v(vars, "incident_summary", "summary")}`,
        `People who saw or know about it: ${v(vars, "witnesses")}`,
        `What I want: ${v(vars, "relief_sought")}`,
        "I am keeping my messages, notes and any other proof, and can share them if asked.",
      ],
      enclosures: [],
    });
  },
};
