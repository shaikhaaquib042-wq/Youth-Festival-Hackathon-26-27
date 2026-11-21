import type { TemplateDef } from "../model";
import { COMMON_VARS, finish, partyTo, v, vMoney, vd } from "./util";

export const demandNoticeWages: TemplateDef = {
  id: "demand_notice_wages",
  title_en: "Demand notice for unpaid wages (7 days)",
  variables: [
    vd("worker_name", "Your name", "text", true),
    vd("employer_name", "Employer name", "text", true),
    vd("unpaid_amount", "Unpaid amount (Rs.)", "number"),
    vd("work_period", "Work period (for example, 1 March to 30 June)"),
    vd("designation", "Your job or work"),
    vd("recipient_address", "Employer address", "textarea"),
    ...COMMON_VARS,
  ],
  build(vars, ctx) {
    return finish({
      id: "demand_notice_wages",
      title: "Demand Notice for Unpaid Wages",
      vars,
      ctx,
      nameKeys: ["worker_name", "user_name"],
      to: partyTo(vars, ["employer_name"], "The Employer"),
      subject: `Request to pay unpaid wages of ${vMoney(vars, "unpaid_amount")}`,
      paragraphs: [
        "Sir or Madam,",
        `I worked for you as ${v(vars, "designation")} during ${v(vars, "work_period")}. My wages of ${vMoney(vars, "unpaid_amount")} for this period have not been paid to me.`,
        "I request you to pay the full unpaid amount within 7 days of receiving this notice. Please pay by bank transfer or give me a written receipt for cash.",
        "If I do not receive the payment, I may approach the Labour Office and ask for free legal aid from the District Legal Services Authority.",
        "I would like to settle this peacefully. You can contact me on the phone number given above.",
      ],
      enclosures: [
        "Copy of any appointment letter, ID card or wage slip",
        "Proof of work done (messages, attendance, photos)",
        "Bank statement or note of part payments received",
      ],
    });
  },
};
