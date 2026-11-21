import type { TemplateDef } from "../model";
import { COMMON_VARS, finish, partyTo, v, vDate, vMoney, vd } from "./util";

export const depositNotice: TemplateDef = {
  id: "deposit_notice",
  title_en: "Notice for return of security deposit (15 days)",
  variables: [
    vd("tenant_name", "Your name", "text", true),
    vd("owner_name", "Owner or landlord name", "text", true),
    vd("property_address", "Address of the rented property", "textarea"),
    vd("deposit_amount", "Deposit paid (Rs.)", "number"),
    vd("vacate_date", "Date you vacated", "date"),
    vd("recipient_address", "Owner address", "textarea"),
    ...COMMON_VARS,
  ],
  build(vars, ctx) {
    return finish({
      id: "deposit_notice",
      title: "Notice for Return of Security Deposit",
      vars,
      ctx,
      nameKeys: ["tenant_name", "user_name"],
      to: partyTo(vars, ["owner_name"], "Owner or Landlord"),
      subject: `Return of security deposit of ${vMoney(vars, "deposit_amount")} for ${v(vars, "property_address")}`,
      paragraphs: [
        "Sir or Madam,",
        `I was your tenant at ${v(vars, "property_address")}. I paid a security deposit of ${vMoney(vars, "deposit_amount")}. I vacated the property on ${vDate(vars, "vacate_date")}.`,
        "The deposit has not been returned to me. I request you to return the full deposit within 15 days of receiving this notice. If you have any deduction, please send me the details and bills in writing.",
        "If the deposit is not returned, I may approach the Rent Authority or a Civil Court, and ask for free legal aid from the District Legal Services Authority.",
        "I would like to settle this peacefully. You can contact me on the phone number given above.",
      ],
      enclosures: [
        "Copy of rent agreement",
        "Proof of deposit payment (receipt or bank statement)",
        "Proof that the property was handed back (message, key handover note)",
      ],
    });
  },
};
