import type { TemplateDef } from "../model";
import { COMMON_VARS, finish, has, partyTo, raw, v, vDate, vMoney, vd } from "./util";

export const groLetter: TemplateDef = {
  id: "gro_letter",
  title_en: "Complaint letter to the company's Grievance Officer",
  variables: [
    vd("customer_name", "Your name"),
    vd("seller_name", "Seller or company name"),
    vd("product_name", "Product or service"),
    vd("purchase_cost", "Amount paid (Rs.)", "number"),
    vd("invoice_number", "Invoice or bill number"),
    vd("purchase_date", "Date of purchase", "date"),
    vd("issue_summary", "What went wrong", "textarea"),
    vd("relief_sought", "What you want (refund, replacement, repair)", "textarea"),
    ...COMMON_VARS,
  ],
  build(vars, ctx) {
    const seller = ["seller_name", "shop_name", "company_name"];
    return finish({
      id: "gro_letter",
      title: "Complaint Letter",
      vars,
      ctx,
      nameKeys: ["customer_name", "consumer_name", "user_name"],
      to: partyTo(vars, seller, "The Grievance Officer"),
      subject: `Complaint about ${v(vars, "product_name")} (invoice ${v(vars, "invoice_number", "bill_number")})`,
      paragraphs: [
        "Sir or Madam,",
        `I bought ${v(vars, "product_name")} from ${v(vars, ...seller)} on ${vDate(vars, "purchase_date")}. I paid ${vMoney(vars, "purchase_cost", "charged_price")}. The invoice or bill number is ${v(vars, "invoice_number", "bill_number")}.`,
        `The problem is as follows: ${v(vars, "issue_summary", "summary")}`,
        `I request you to do the following: ${raw(vars, "relief_sought") || "a refund or a fair solution (details: ________)"}`,
        "Please reply in writing and give me a complaint reference number. I am keeping a copy of this letter and my papers. If this is not solved, I may use the National Consumer Helpline or the Consumer Commission.",
      ],
      enclosures: [
        "Copy of invoice or bill",
        "Copy of payment proof",
        ...(has(vars, "issue_summary") ? ["Photos, messages or emails about the problem"] : []),
      ],
    });
  },
};
