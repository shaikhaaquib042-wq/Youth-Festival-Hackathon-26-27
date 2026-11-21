import type { DisputeType, IntakeSlots } from "@raasta/rules/types";

// Fallback classifier (English, Hindi, Marathi) used when no AI provider works. Order matters: first strong match wins.
const RULES: { type: DisputeType; words: string[] }[] = [
  { type: "cyber_fraud", words: ["upi", "otp", "scam", "fraud", "phishing", "cyber", "1930", "online fraud", "धोखाधड़ी", "ठगी", "फसवणूक", "ऑनलाइन"] },
  { type: "cyber_harassment", words: ["blackmail", "morphed", "stalk", "threaten online", "ब्लैकमेल", "धमकी", "सायबर"] },
  { type: "lost_mobile", words: ["lost phone", "lost my phone", "lost mobile", "stolen phone", "stolen mobile", "phone stolen", "imei", "मोबाइल खो", "फोन खो", "मोबाईल हरवला", "फोन चोरी"] },
  { type: "security_deposit", words: ["deposit", "landlord", "rent", "tenant", "जमा राशि", "किराया", "मकान मालिक", "डिपॉझिट", "घरमालक", "भाडे"] },
  { type: "unpaid_wages", words: ["salary", "wages", "not paid", "unpaid", "employer", "पगार", "वेतन", "तनख्वाह", "मजदूरी", "नियोक्ता", "मालक"] },
  { type: "workplace_harassment", words: ["sexual harassment", "harass at work", "workplace", "boss harass", "कार्यस्थल", "छेड़छाड़", "छळ"] },
  { type: "mrp_overcharge", words: ["mrp", "overcharg", "charged more", "extra charge", "एमआरपी", "ज्यादा पैसे", "जास्त पैसे"] },
  { type: "insurance_claim", words: ["insurance", "claim rejected", "policy", "बीमा", "विमा"] },
  { type: "banking_nbfc", words: ["bank", "loan", "credit card", "emi", "nbfc", "बैंक", "ऋण", "कर्ज", "बँक"] },
  { type: "investment_broker", words: ["broker", "demat", "mutual fund", "investment", "sebi", "stock", "शेयर", "निवेश", "गुंतवणूक"] },
  { type: "builder_delay", words: ["builder", "flat", "possession", "rera", "developer", "बिल्डर", "फ्लैट", "कब्जा", "ताबा"] },
  { type: "pension_pf", words: ["pension", "provident fund", "epf", "pf ", "पेंशन", "भविष्य निधि", "पीएफ"] },
  { type: "neighbour_construction", words: ["neighbour", "neighbor", "illegal construction", "encroach", "पड़ोसी", "अवैध निर्माण", "शेजारी", "अनधिकृत बांधकाम"] },
  { type: "civic_failure", words: ["pothole", "garbage", "drain", "water supply", "streetlight", "street light", "sewage", "road", "गड्ढा", "कचरा", "सड़क", "पानी", "खड्डा", "रस्ता", "कचरा"] },
  { type: "police_complaint", words: ["police", "fir", "theft", "assault", "पुलिस", "चोरी", "पोलीस", "एफआयआर"] },
  { type: "govt_service", words: ["certificate", "government office", "ration", "licence", "license", "application pending", "प्रमाणपत्र", "सरकारी", "दाखला", "शासकीय"] },
  { type: "free_legal_aid", words: ["legal aid", "free lawyer", "cannot afford a lawyer", "मुफ्त वकील", "कानूनी सहायता", "मोफत वकील"] },
  { type: "consumer_refund", words: ["refund", "defective", "faulty", "return", "warranty", "delivered", "order", "रिफंड", "खराब", "वापसी", "परतावा", "सदोष"] },
];

export function classifyKeyword(text: string): DisputeType {
  const s = ` ${text.toLowerCase()} `;
  for (const r of RULES) if (r.words.some((w) => s.includes(w))) return r.type;
  return "other";
}

/** Pulls a rupee amount such as "Rs 12,000", "INR 5000", "12000 rupees" or "₹500". */
export function extractAmount(text: string): number | undefined {
  const m =
    /(?:rs\.?|inr|₹|रु\.?|रुपये|rupees)\s*([0-9][0-9,]*(?:\.\d+)?)/i.exec(text) ??
    /([0-9][0-9,]*(?:\.\d+)?)\s*(?:rs\b|rupees|रुपये|रुपए|₹)/i.exec(text);
  if (!m) return undefined;
  const n = Number((m[1] ?? "").replace(/,/g, ""));
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

/** Rough days from phrases like "3 months", "two weeks", "10 days". Returns undefined when nothing is found. */
export function extractDays(text: string): number | undefined {
  const words: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10 };
  const m = /\b(\d{1,3}|one|two|three|four|five|six|seven|eight|nine|ten)\s*(day|days|week|weeks|month|months|year|years)\b/i.exec(text);
  if (!m) return undefined;
  const n = words[(m[1] ?? "").toLowerCase()] ?? Number(m[1]);
  const unit = (m[2] ?? "").toLowerCase();
  const mult = unit.startsWith("day") ? 1 : unit.startsWith("week") ? 7 : unit.startsWith("month") ? 30 : 365;
  return n * mult;
}

export function keywordSlots(redacted: string): Omit<IntakeSlots, "missing_fields"> {
  const dispute_type = classifyKeyword(redacted);
  const slots: Omit<IntakeSlots, "missing_fields"> = { dispute_type, summary: redacted.slice(0, 280) };
  const amount = extractAmount(redacted);
  if (amount !== undefined) slots.amount_inr = amount;
  const days = extractDays(redacted);
  if (days !== undefined) slots.days_since_incident = days;
  if (/\bemergency\b|\bright now\b|\bin danger\b|आपातकाल|तुरंत/i.test(redacted)) slots.is_emergency = true;
  return slots;
}
