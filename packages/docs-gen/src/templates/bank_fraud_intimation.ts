import type { TemplateDef } from "../model";
import { COMMON_VARS, finish, has, officeTo, raw, v, vDate, vMoney, vd } from "./util";

export const bankFraudIntimation: TemplateDef = {
  id: "bank_fraud_intimation",
  title_en: "Intimation of unauthorised transaction to the bank (3 working days)",
  variables: [
    vd("victim_name", "Your name", "text", true),
    vd("bank_name", "Bank name", "text", true),
    vd("account_last4", "Last 4 digits of account or card"),
    vd("transaction_id", "Transaction ID or reference"),
    vd("amount", "Amount taken (Rs.)", "number"),
    vd("transaction_date", "Date of transaction", "date"),
    vd("cybercrime_ack", "Cyber crime complaint or acknowledgement number, if any"),
    vd("recipient_address", "Bank branch address", "textarea"),
    ...COMMON_VARS,
  ],
  build(vars, ctx) {
    const bank = v(vars, "bank_name");
    const ack = raw(vars, "cybercrime_ack");
    return finish({
      id: "bank_fraud_intimation",
      title: "Intimation of Unauthorised Transaction",
      vars,
      ctx,
      nameKeys: ["victim_name", "user_name"],
      to: officeTo(vars, ctx, `The Branch Manager, ${bank}`),
      subject: `Unauthorised transaction of ${vMoney(vars, "amount")} on ${vDate(vars, "transaction_date")}`,
      paragraphs: [
        "Sir or Madam,",
        `I hold an account or card with your bank (last 4 digits: ${v(vars, "account_last4")}). A transaction of ${vMoney(vars, "amount")} was made on ${vDate(vars, "transaction_date")}, transaction ID ${v(vars, "transaction_id")}. I did not make or allow this transaction.`,
        "I am informing you about it within 3 working days. Please block my card, UPI and net banking access now, to stop any more loss.",
        "I understand that under the Reserve Bank of India rules on customer protection for unauthorised electronic transactions, a customer has zero liability when the matter is reported within 3 working days and the fault is not the customer's. I request you to treat my liability as zero and to credit the amount back to my account.",
        "Please give me a written acknowledgement with a complaint number, and tell me in writing what you find.",
        ack
          ? `I have also reported this on the cyber crime portal. The acknowledgement number is ${ack}.`
          : `Cyber crime complaint or acknowledgement number, if any: ${v(vars, "cybercrime_ack")}`,
        ...(has(vars, "issue_summary") ? [`More details: ${raw(vars, "issue_summary")}`] : []),
      ],
      enclosures: [
        "Screenshots of the bank messages or alerts",
        "Account statement showing the transaction",
        "Copy of the cyber crime complaint acknowledgement, if available",
      ],
    });
  },
};
