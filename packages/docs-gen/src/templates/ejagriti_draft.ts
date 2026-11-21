import type { TemplateDef } from "../model";
import { BLANK, COMMON_VARS, finish, has, officeTo, raw, v, vDate, vMoney, vd } from "./util";

export const ejagritiDraft: TemplateDef = {
  id: "ejagriti_draft",
  title_en: "e-Jagriti consumer complaint draft with affidavit format",
  variables: [
    vd("customer_name", "Your name"),
    vd("seller_name", "Seller or company name"),
    vd("product_name", "Product or service"),
    vd("purchase_cost", "Amount paid (Rs.)", "number"),
    vd("invoice_number", "Invoice or bill number"),
    vd("purchase_date", "Date of purchase", "date"),
    vd("mrp", "MRP printed on the product (Rs.)", "number"),
    vd("charged_price", "Price you were charged (Rs.)", "number"),
    vd("issue_summary", "What went wrong", "textarea"),
    vd("earlier_contact", "What you already did to solve it", "textarea"),
    vd("relief_sought", "What you want", "textarea"),
    vd("recipient_address", "Seller address", "textarea"),
    ...COMMON_VARS,
  ],
  build(vars, ctx) {
    const seller = ["seller_name", "shop_name", "company_name"];
    const me = v(vars, "customer_name", "consumer_name", "user_name");
    const facts = [
      `- On ${vDate(vars, "purchase_date")}, I bought ${v(vars, "product_name")} from ${v(vars, ...seller)}.`,
      `- I paid ${vMoney(vars, "purchase_cost", "charged_price")}. The invoice or bill number is ${v(vars, "invoice_number", "bill_number")}.`,
    ];
    if (has(vars, "mrp") && has(vars, "charged_price")) {
      facts.push(
        `- The MRP printed on the product is ${vMoney(vars, "mrp")}. I was charged ${vMoney(vars, "charged_price")}.`,
      );
    }
    facts.push(`- ${v(vars, "issue_summary", "summary")}`);
    if (has(vars, "earlier_contact")) facts.push(`- Earlier steps taken by me: ${raw(vars, "earlier_contact")}`);
    return finish({
      id: "ejagriti_draft",
      title: "Consumer Complaint (Draft for e-Jagriti)",
      vars,
      ctx,
      nameKeys: ["customer_name", "consumer_name", "user_name"],
      to: officeTo(vars, ctx, "The President, District Consumer Disputes Redressal Commission"),
      subject: `Complaint against ${v(vars, ...seller)} about ${v(vars, "product_name")}`,
      paragraphs: [
        "## Complainant",
        `Name: ${me}\nAddress: ${v(vars, "user_address")}\nPhone: ${v(vars, "user_phone")}\nEmail: ${v(vars, "user_email")}`,
        "## Opposite party",
        `Name: ${v(vars, ...seller)}\nAddress: ${v(vars, "recipient_address")}`,
        "## Facts of the complaint",
        facts.join("\n"),
        "## Relief asked",
        `I request the Commission to order the following: ${v(vars, "relief_sought")}`,
        "## Documents attached",
        "See the list of enclosures below.",
        "## Affidavit (format)",
        `I, ${me}, residing at ${v(vars, "user_address")}, state as follows:`,
        "1. I am the complainant in this matter.\n2. The facts stated in the complaint above are true to the best of my knowledge and belief.\n3. The documents I have attached are true copies of the documents I have.",
        `Signature of the person making the statement: ${BLANK}\nPlace: ${BLANK}     Date: ${BLANK}`,
        "Verification: I state that the contents of this affidavit are true to my knowledge and that nothing important has been hidden.",
        "Note: Sign the affidavit before a notary or an oath commissioner if the Commission asks for it. Please check the e-Jagriti portal for the current rules and fee before you file.",
      ],
      enclosures: [
        "Copy of invoice or bill",
        "Proof of payment",
        "Warranty card or terms, if any",
        "Messages, emails or earlier complaints about the problem",
      ],
      closing: "Complainant,",
    });
  },
};
