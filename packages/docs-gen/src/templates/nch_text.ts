import type { TemplateDef } from "../model";
import { finish, has, v, vDate, vMoney, vd } from "./util";

export const nchText: TemplateDef = {
  id: "nch_text",
  title_en: "Text for the National Consumer Helpline complaint",
  variables: [
    vd("customer_name", "Your name"),
    vd("seller_name", "Seller or company name"),
    vd("product_name", "Product or service"),
    vd("purchase_cost", "Amount paid (Rs.)", "number"),
    vd("purchase_date", "Date of purchase", "date"),
    vd("mrp", "MRP printed on the product (Rs.)", "number"),
    vd("charged_price", "Price you were charged (Rs.)", "number"),
    vd("issue_summary", "What went wrong", "textarea"),
    vd("relief_sought", "What you want", "textarea"),
  ],
  build(vars, ctx) {
    const seller = ["seller_name", "shop_name", "company_name"];
    const price =
      has(vars, "mrp") && has(vars, "charged_price")
        ? ` The MRP is ${vMoney(vars, "mrp")} but I was charged ${vMoney(vars, "charged_price")}.`
        : "";
    return finish({
      id: "nch_text",
      title: "Text to paste in the National Consumer Helpline form",
      vars,
      ctx,
      nameKeys: ["customer_name", "consumer_name", "user_name"],
      to: { name: "National Consumer Helpline (online complaint form)" },
      subject: `Complaint about ${v(vars, "product_name")}`,
      paragraphs: [
        `I am ${v(vars, "customer_name", "consumer_name", "user_name")}. On ${vDate(vars, "purchase_date")} I bought ${v(vars, "product_name")} from ${v(vars, ...seller)} for ${vMoney(vars, "purchase_cost", "charged_price")}.${price}`,
        `Problem: ${v(vars, "issue_summary", "summary")}`,
        `What I want: ${v(vars, "relief_sought")}`,
        "I have the bill and my messages as proof. I request that the company be asked to solve this.",
      ],
      enclosures: [],
    });
  },
};
