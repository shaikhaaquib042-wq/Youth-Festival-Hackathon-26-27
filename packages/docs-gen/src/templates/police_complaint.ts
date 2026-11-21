import type { TemplateDef } from "../model";
import { COMMON_VARS, NAME_KEYS, finish, lines, officeTo, raw, v, vDate, vMoney, vd } from "./util";

export const policeComplaint: TemplateDef = {
  id: "police_complaint",
  title_en: "Written complaint to the police (request to register an FIR)",
  variables: [
    vd("complainant_name", "Your name"),
    vd("police_station", "Police station"),
    vd("incident_date", "Date of the incident", "date"),
    vd("incident_summary", "What happened", "textarea"),
    vd("phone_model", "Phone make and model (lost phone)"),
    vd("imei_numbers", "IMEI numbers (lost phone)"),
    vd("location_lost", "Where the phone was lost"),
    vd("accused_handle", "Name or online handle of the other person"),
    vd("platform_used", "App or website used"),
    vd("bank_name", "Bank (money fraud)"),
    vd("transaction_id", "Transaction ID (money fraud)"),
    vd("amount", "Amount lost (Rs.)", "number"),
    vd("transaction_date", "Date of transaction", "date"),
    ...COMMON_VARS,
  ],
  build(vars, ctx) {
    const extra = lines([
      ["Phone", raw(vars, "phone_model")],
      ["IMEI numbers", raw(vars, "imei_numbers")],
      ["Place lost", raw(vars, "location_lost")],
      ["Other person or handle", raw(vars, "accused_handle")],
      ["App or website", raw(vars, "platform_used")],
      ["Bank", raw(vars, "bank_name")],
      ["Transaction ID", raw(vars, "transaction_id")],
      ["Amount", raw(vars, "amount") ? vMoney(vars, "amount") : ""],
      ["Transaction date", raw(vars, "transaction_date") ? vDate(vars, "transaction_date") : ""],
    ]);
    return finish({
      id: "police_complaint",
      title: "Written Complaint to the Police",
      vars,
      ctx,
      nameKeys: ["complainant_name", ...NAME_KEYS],
      to: officeTo(vars, ctx, `The Station House Officer, ${v(vars, "police_station")} Police Station`),
      subject: "Request to register my complaint",
      paragraphs: [
        "Sir or Madam,",
        `I, ${v(vars, "complainant_name", ...NAME_KEYS)}, living at ${v(vars, "user_address")}, want to report the following incident that took place on ${vDate(vars, "incident_date")}.`,
        v(vars, "incident_summary", "summary"),
        ...(extra ? ["## Details", extra] : []),
        "I request you to register my complaint and, if the facts show an offence, to register an FIR. Please give me a copy of the FIR, or a receipt or acknowledgement with a number, so that I can follow up.",
        "I am ready to give my statement and any more papers you need.",
      ],
      enclosures: ["Copy of my identity proof", "Papers, screenshots or bills about the incident"],
    });
  },
};
