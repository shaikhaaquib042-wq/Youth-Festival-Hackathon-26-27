// Generates packages/data/src/*.json from packages/data/source/.
// Run: node scripts/ingest.mjs
// Facts (URLs, phones, emails, fees, ceilings, timers) come only from the source files.
// Anything the sources do not contain is omitted, never invented.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  platformSchema, disputeSchema, officeSchema, legalAidSchema,
  stateInfoSchema, timerDefSchema, DISPUTE_IDS,
} from "../packages/data/src/schemas.ts";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(ROOT, "packages/data/source");
const OUT = join(ROOT, "packages/data/src");
mkdirSync(OUT, { recursive: true });

const EM = "2014";
const EN = "–";
const fail = (msg) => { throw new Error(`ingest: ${msg}`); };
const readJson = (name) => JSON.parse(readFileSync(join(SRC, name), "utf8"));
const writeJson = (name, value) => {
  writeFileSync(join(OUT, name), JSON.stringify(value, null, 2) + "\n", "utf8");
  console.log(`wrote packages/data/src/${name}`);
};
// Em dashes are banned in all generated output; the only transform applied to source text.
const noEm = (s) => s.split(EM).join(" - ");
const deepNoEm = (v) => {
  if (typeof v === "string") return noEm(v);
  if (Array.isArray(v)) return v.map(deepNoEm);
  if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, deepNoEm(x)]));
  return v;
};
const cleanName = (s) => noEm(s).split(EN).join("-");

// ---------------------------------------------------------------- platforms
const dirs = readJson("List of directories.json");
// The retired e-Daakhil portal domain must never appear in generated data (CONTRACTS: never link it).
// Its source value is replaced by a plain note; the domain itself is dropped.
const RETIRED = /https?:\/\/edaakhil\.nic\.in\S*(\s*\([^)]*\))?/gi;
const scrubRetired = (v) => {
  if (typeof v === "string") {
    return v.replace(RETIRED, "Retired on 1 January 2025; do not use. Replaced by e-Jagriti.").replace(/edaakhil/gi, "retired portal");
  }
  if (Array.isArray(v)) return v.map(scrubRetired);
  if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, scrubRetired(x)]));
  return v;
};
const platforms = scrubRetired(deepNoEm(dirs.platforms));
for (const p of platforms) {
  const r = platformSchema.safeParse(p);
  if (!r.success) fail(`platform ${p.id} schema drift: ${r.error.message}`);
  if (JSON.stringify(p).toLowerCase().includes("edaakhil")) fail(`retired portal name survived scrub in ${p.id}`);
}
const platformIds = new Set(platforms.map((p) => p.id));
writeJson("platforms.json", platforms);
writeJson("platforms.meta.json", scrubRetired(deepNoEm(dirs.metadata)));

// ---------------------------------------------------------------- offices (Pune)
// 3.1 anchor offices (handbook wins on phone/email; address from handbook).
const anchors = [
  {
    id: "consumer_commission_pune_main", type: "consumer_commission", city: "Pune",
    name: "District Consumer Disputes Redressal Commission, Pune",
    address: "New Administrative Building, A Wing, 4th Floor, Opp. Vidhan Bhavan, Sadhu Vaswani Chowk, Pune - 411001",
    phone: "020-26139191", email: "confo-pu-mh@nic.in", verified: true,
    source: "handbook 3.1; verified via grahak.maharashtra.gov.in",
  },
  {
    id: "consumer_commission_pune_additional", type: "consumer_commission", city: "Pune",
    name: "District Consumer Disputes Redressal Commission, Additional Pune",
    address: "New Administrative Building, A Wing, 4th Floor, Opp. Council Hall, Sadhu Vaswani Chowk, Pune - 411001",
    phone: "020-26120364", email: "confo-pu1-mh@nic.in", verified: true,
    source: "handbook 3.1; verified via grahak.maharashtra.gov.in",
  },
  {
    id: "dlsa_pune", type: "legal_aid", city: "Pune",
    name: "District Legal Services Authority (DLSA), Pune and Permanent Lok Adalat",
    address: "New Building, 1st Floor, District & Sessions Court Premises, Shivajinagar, Pune - 411005",
    phone: "020-25534881", email: "dlsapune2@gmail.com", verified: true,
    source: "handbook 3.1; verified via punedlsa.org and NALSA. Helpline 15100 is in legal-aid.json",
  },
  {
    id: "district_court_pune_tenancy", type: "court", city: "Pune",
    name: "District & Sessions Court / Small Causes Court, Pune (Registrar)",
    address: "CTS No. 9 & 9A, FP No. 805 & 891, Shivajinagar, Pune - 411005",
    phone: "020-25534799", email: "mahpundc@mhstate.nic.in", verified: true,
    source: "handbook 3.1; verified via pune.dcourts.gov.in",
  },
  {
    id: "labour_commissioner_pune_division", type: "labour_office", city: "Pune",
    name: "Additional Commissioner of Labour, Pune Division",
    address: "Bungalow No. 5, Mumbai-Pune Road, Shivajinagar, Pune - 411005",
    phone: "020-25542611", verified: false,
    source: "handbook 3.1; secondary directory, cross-check area ALC/GLO mobiles on pune.gov.in",
  },
  {
    id: "maharashtra_labour_welfare_board_pune", type: "labour_office", city: "Pune",
    name: "Maharashtra Labour Welfare Board, Pune",
    address: "Lalit Krida Bhavan, Sahakarnagar No. 1, Near Aranyeshwar Temple, Pune - 411009",
    phone: "020-24228988", verified: true,
    source: "handbook 3.1; verified via mahakamgar.maharashtra.gov.in",
  },
  {
    id: "pune_city_worker_facility_centre", type: "labour_office", city: "Pune",
    name: "Worker Facility Centre, Pune City",
    address: "S. No. 347, Private Road, Inaam Nagar, Tadiwala Road, Pune - 411001",
    phone: "9970765491", verified: true,
    source: "handbook 3.1; verified via pune.gov.in",
  },
  {
    id: "pcmc_worker_facility_centre", type: "labour_office", city: "Pimpri-Chinchwad",
    name: "Worker Facility Centre, Pimpri-Chinchwad",
    address: "Shop No. 29, Ground Floor, Sukhwani Chamber, Pimpri Chowk, Station Road, Pimpri",
    phone: "8087177331", verified: true,
    source: "handbook 3.1; verified via pune.gov.in",
  },
  {
    id: "central_labour_office_pune", type: "labour_office", city: "Pune",
    name: "Central Labour Office, Pune",
    address: "Survey No. 1-A, Guru Nanak Nagar, Shanti Nagar Society, Katad Khana, Pune - 411042",
    phone: "011-23354722", verified: false,
    source: "handbook 3.1; file online via samadhan.labour.gov.in; address via third-party directory, verify jurisdiction on SAMADHAN",
  },
  {
    id: "pmc_main_building", type: "municipal_hq", city: "Pune",
    name: "Pune Municipal Corporation Main Building",
    address: "Congress House Road, Near Mangala Theatre, Shivajinagar, Pune - 411005",
    phone: "1800-103-0222", verified: true,
    source: "handbook 3.1; verified via pmc.gov.in (toll-free)",
  },
];

// 3.2 zone DMCs and ward offices (handbook spelling kept, incl. hadpsar@).
const zoneDmc = {
  1: { phone: "020-25501591", email: "dmc1@punecorporation.org" },
  2: { phone: "020-26141484", email: "dmc2@punecorporation.org" },
  3: { phone: "020-25508121", email: "dmc3@punecorporation.org" },
  4: { phone: "020-26141484", email: "dmc4@punecorporation.org" },
  5: { phone: "020-26141484", email: "dmc5@punecorporation.org" },
};
// [zone, handbook ward name, ward phone, ward email, matching Mock Data pune_directory ward name or null]
const wards = [
  [1, "Dhole Patil Road", "020-26161470 / 26161472", "dholepatil@punecorporation.org", "Dhole Patil Road Ward Office"],
  [1, "Nagar Road - Wagholi", "020-25509000 / 26630103", "nagarroad@punecorporation.org", "Nagar Road - Wagholi Ward Office"],
  [1, "Yerwada - Wadgaonsheri", "020-25509100 / 26616550", "yerwada@punecorporation.org", "Yerawada - Vadgaonsheri Ward Office"],
  [2, "Aundh - Baner", "020-25506840", "aundh@punecorporation.org", "Aundh - Baner Ward Office"],
  [2, "Kothrud - Bavdhan", "020-25506930", "kothrud@punecorporation.org", "Kothrud - Bavdhan Ward Office"],
  [2, "Shivajinagar - Ghole Road", "020-25501500 / 25511956", "shivajinagar@punecorporation.org", "Shivajinagar - Ghole Road Ward Office"],
  [3, "Dhankawadi - Katraj - Ambegaon", "020-24229769", "dhankawadi@punecorporation.org", "Dhankawadi - Sahakarnagar Ward Office"],
  [3, "Sinhagad Road", "020-24431467 / 24431468", "sinhgadroad@punecorporation.org", "Sinhagad Road Ward Office"],
  [3, "Warje - Karvenagar", "020-25432192 / 25432193", "warjekarvenagar@punecorporation.org", "Warje - Karvenagar Ward Office"],
  [4, "Kondhwa - Undri", "020-26860230 / 26860320", "kondhwa@punecorporation.org", "Kondhwa - Yewalewadi Ward Office"],
  [4, "Hadapsar - Manjri", "020-26821092 / 26821093", "hadpsar@punecorporation.org", "Hadapsar - Mundhwa Ward Office"],
  [4, "Wanowrie (Wanawadi)", "020-25506264 / 25506299", "wanawadi@punecorporation.org", "Wanawadi - Ramtekdi Ward Office"],
  [5, "Vishrambaugwada", "020-24431461 / 24431462", "vishrambaugwada@punecorporation.org", null],
  [5, "Kasba Peth", "020-26437040 / 26437041", "kasbapeth@punecorporation.org", "Kasba - Vishrambaugwada Ward Office"],
  [5, "Bibvewadi", "020-24229768", "bibwewadi@punecorporation.org", "Bibwewadi Ward Office"],
];
const mock = readJson("Mock Data.json");
const mockWard = (name) => mock.pune_directory.pmc_ward_offices.find((w) => w.name === name);
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");

const officesPune = anchors.map((a) => ({ state_code: "MH", ...a }));
for (const z of [1, 2, 3, 4, 5]) {
  officesPune.push({
    id: `pmc_zone_dmc_${z}`, type: "zone_dmc", city: "Pune", state_code: "MH",
    name: `PMC Zone ${z} Divisional Municipal Commissioner (DMC) Office`,
    zone: String(z), phone: zoneDmc[z].phone, email: zoneDmc[z].email, verified: true,
    source: "handbook 3.2 (pmc.gov.in)",
  });
}
for (const [zone, rawName, phone, email, mockName] of wards) {
  const name = cleanName(rawName);
  const m = mockName ? mockWard(mockName) : null;
  if (mockName && !m) fail(`mock ward not found: ${mockName}`);
  officesPune.push({
    id: `pmc_ward_${slug(name)}`, type: "ward_office", city: "Pune", state_code: "MH",
    name: `PMC Ward Office: ${name}`,
    ...(m ? { address: m.address } : {}),
    phone, email, zone: String(zone), cc_office_id: `pmc_zone_dmc_${zone}`, verified: true,
    source: m ? "handbook 3.2 (pmc.gov.in); address from Mock Data pune_directory" : "handbook 3.2 (pmc.gov.in)",
  });
}
// Mock Data lists "Bhavani Peth Ward Office", which is not among the 15 handbook 3.2 rows; it is left out.
officesPune.forEach((o) => {
  officeSchema.parse({ ...o, address: o.address ? noEm(o.address) : undefined });
});
const officeIds = new Set(officesPune.map((o) => o.id));
if (officesPune.filter((o) => o.type === "ward_office").length !== 15) fail("expected 15 ward offices");
if (officesPune.filter((o) => o.type === "zone_dmc").length !== 5) fail("expected 5 zone DMCs");
writeJson("offices.pune.json", officesPune.map((o) => deepNoEm(o)));

// ---------------------------------------------------------------- legal aid
const section12 = [
  { flag: "woman", label_en: "A woman" },
  { flag: "child", label_en: "A child (under 18)" },
  { flag: "sc_st", label_en: "Member of a Scheduled Caste or Scheduled Tribe" },
  { flag: "industrial_workman", label_en: "Industrial workman" },
  { flag: "disability", label_en: "Person with disability or mental illness" },
  { flag: "custody", label_en: "Person in custody (protective, juvenile or psychiatric home)" },
  { flag: "trafficking", label_en: "Victim of human trafficking or begar" },
  { flag: "disaster", label_en: "Victim of mass disaster, ethnic violence, caste atrocity, flood, drought, earthquake or industrial disaster" },
];
// Handbook 4.2, all 37 entries in the order published.
const ceilings = [
  [300000, "AP", "Andhra Pradesh"], [300000, "AS", "Assam"], [300000, "GA", "Goa"],
  [300000, "HR", "Haryana"], [300000, "HP", "Himachal Pradesh"], [300000, "JK", "Jammu & Kashmir"],
  [300000, "JH", "Jharkhand"], [300000, "KA", "Karnataka"], [300000, "KL", "Kerala"],
  [300000, "MH", "Maharashtra"], [300000, "MN", "Manipur"], [300000, "ML", "Meghalaya"],
  [300000, "OD", "Odisha"], [300000, "PB", "Punjab"], [300000, "RJ", "Rajasthan"],
  [300000, "SK", "Sikkim"], [300000, "TN", "Tamil Nadu"], [300000, "TG", "Telangana"],
  [300000, "UP", "Uttar Pradesh"], [300000, "UK", "Uttarakhand"],
  [300000, "AN", "Andaman & Nicobar Islands"], [300000, "CH", "Chandigarh UT"],
  [300000, "DL", "Delhi"], [300000, "LD", "Lakshadweep"],
  [200000, "MP", "Madhya Pradesh"],
  [150000, "BR", "Bihar"], [150000, "CG", "Chhattisgarh"], [150000, "TR", "Tripura"],
  [100000, "AR", "Arunachal Pradesh"], [100000, "GJ", "Gujarat"], [100000, "NL", "Nagaland"],
  [100000, "WB", "West Bengal"], [100000, "DD", "Daman & Diu"], [100000, "LA", "Ladakh"],
  [100000, "PY", "Puducherry"],
  [25000, "MZ", "Mizoram"],
  [15000, "DN", "Dadra & Nagar Haveli UT"],
];
if (ceilings.length !== 37) fail(`expected 37 ceilings, got ${ceilings.length}`);
const legalAid = {
  section12_flags: section12,
  states: ceilings.map(([amt, code, name]) => ({
    state_code: code, name, income_ceiling_inr: amt,
    ...(code === "DN" || code === "DD"
      ? { ceiling_note: "Handbook 4.2 lists Dadra & Nagar Haveli UT and Daman & Diu separately with different ceilings." }
      : {}),
  })),
  tele_law_note_en: "Tele-Law pre-litigation legal advice is free for all citizens regardless of income or status.",
  helpline: "15100",
};
legalAidSchema.parse(legalAid);
writeJson("legal-aid.json", legalAid);

// ---------------------------------------------------------------- timers (handbook 5.2)
const timers = [
  { key: "bank_fraud_freeze_3d", label_en: "Report unauthorised bank or UPI fraud and freeze funds", days: 3, from: "incident", dispute_types: ["cyber_fraud", "banking_nbfc"], note_en: "Handbook 5.2: immediate, within 3 working days. Call 1930 and notify the bank." },
  { key: "electronic_fir_signature_3d", label_en: "Sign the electronic FIR in person", days: 3, from: "now", dispute_types: ["cyber_fraud", "cyber_harassment", "police_complaint"], note_en: "An electronic FIR must be signed in person within 3 days to be taken on record." },
  { key: "nalsa_decision_7d", label_en: "Expected NALSA legal aid decision", days: 7, from: "now", dispute_types: ["free_legal_aid", "unpaid_wages", "security_deposit", "neighbour_construction", "workplace_harassment"], note_en: "NALSA Reg. 7(2) expected window for Panel Advocate appointment." },
  { key: "maharera_conciliation_consent_7d", label_en: "Developer consent to MahaRERA conciliation", days: 7, from: "now", dispute_types: ["builder_delay"], note_en: "Developer must consent within 7 days to enter conciliation." },
  { key: "demand_notice_7d", label_en: "Written demand notice response window", days: 7, from: "now", dispute_types: ["unpaid_wages"], note_en: "Handbook 5.2 gives 7 to 15 days; send the demand notice and keep a dated copy." },
  { key: "deposit_notice_15d", label_en: "Deposit demand notice response window", days: 15, from: "now", dispute_types: ["security_deposit"], note_en: "Handbook 6.1 uses a 15-day notice for deposit refunds." },
  { key: "grievance_sla_21d", label_en: "Grievance portal SLA (CPGRAMS, SEBI SCORES, Aaple Sarkar)", days: 21, from: "prior_complaint", dispute_types: ["govt_service", "pension_pf", "civic_failure", "investment_broker"], note_en: "Aaple Sarkar uses 21 working days. Mark the date to plan escalation or appeal." },
  { key: "rbi_cms_prestep_30d", label_en: "RBI CMS mandatory pre-step: lender must reply first", days: 30, from: "prior_complaint", dispute_types: ["banking_nbfc"], note_en: "Filing earlier than 30 days can be rejected as non-maintainable." },
  { key: "sebi_rbi_limitation_1y", label_en: "SEBI SCORES or RBI CMS filing limit", days: 365, from: "incident", dispute_types: ["banking_nbfc", "investment_broker"], note_en: "Hard filing cutoff from the cause of action or the lender reply." },
  { key: "consumer_limitation_2y", label_en: "Consumer Commission limitation period", days: 730, from: "incident", dispute_types: ["consumer_refund", "mrp_overcharge"], note_en: "CPA 2019 Sec. 69. The National Consumer Helpline (1915) does not pause this 2-year clock." },
  { key: "civil_it_limitation_3y", label_en: "Civil recovery and IT Act limitation period", days: 1095, from: "incident", dispute_types: ["unpaid_wages", "cyber_fraud", "cyber_harassment"], note_en: "Cutoff for civil recovery suits and cyber prosecution under the Limitation Act and IT Act." },
];
timers.forEach((t) => timerDefSchema.parse(t));
writeJson("timers.json", timers.map(deepNoEm));

// ---------------------------------------------------------------- disputes
const Q = (id, label_en, type, extra = {}) => ({ id, label_en, type, ...extra });
const SEL = (id, label_en, slot, options) => Q(id, label_en, "select", { slot, options: options.map(([value, label]) => ({ value, label_en: label })) });
const DOC = (key, label_en, required) => ({ key, label_en, required });
const std = (o) => ({ depth: "standard", ...o });
const full = (o) => ({ depth: "full", ...o });

const disputeDefs = [
  // ---- 10 MVP disputes (handbook 6.1), full depth
  full({
    id: "consumer_refund", category: "money_shopping", icon: "package-x",
    title_en: "Faulty product or refund refused",
    short_en: "You bought something defective, or the seller will not refund it.",
    questions: [
      Q("purchase_amount", "How much did you pay (INR)?", "number", { slot: "amount_inr" }),
      Q("purchase_date", "When did you buy it?", "date"),
      Q("written_complaint_sent", "Have you already complained to the seller in writing?", "boolean", { slot: "prior_written_complaint_sent" }),
      SEL("seller_type", "What kind of seller was it?", "opposite_party_type", [["company", "Company or brand"], ["shop", "Shop"], ["unknown", "Not sure"]]),
      Q("defect", "What is wrong with the product or service?", "text"),
    ],
    documents: [
      DOC("tax_invoice", "Tax invoice or receipt", true),
      DOC("warranty_card", "Warranty card", false),
      DOC("service_reports", "Service centre visit reports", false),
      DOC("defect_photos", "Photos or videos of the defect", true),
      DOC("seller_communication", "Written complaint and seller replies", false),
    ],
    template_variables: ["customer_name", "seller_name", "product_name", "purchase_cost", "invoice_number", "purchase_date"],
    default_platform_ids: ["nch_ingram", "e_jagriti", "cpgrams"],
    doc_templates: ["gro_letter", "nch_text", "ejagriti_draft"],
  }),
  full({
    id: "mrp_overcharge", category: "money_shopping", icon: "receipt",
    title_en: "Shop charged above MRP",
    short_en: "A shop charged you more than the printed maximum retail price.",
    questions: [
      Q("overcharged_amount", "How much extra were you charged (INR)?", "number", { slot: "amount_inr" }),
      Q("bill_available", "Do you have the bill?", "boolean"),
      SEL("shop_type", "What kind of seller was it?", "opposite_party_type", [["shop", "Shop"], ["company", "Company or brand"], ["unknown", "Not sure"]]),
      Q("purchase_date", "When did you buy it?", "date"),
    ],
    documents: [
      DOC("bill", "Bill or receipt showing the price charged", true),
      DOC("mrp_photo", "Photo of the packaging showing the MRP", true),
      DOC("shop_details", "Shop name and address", true),
      DOC("prior_complaint", "Written complaint to the shop, if any", false),
    ],
    template_variables: ["consumer_name", "shop_name", "product_name", "mrp", "charged_price", "bill_number"],
    default_platform_ids: ["nch_ingram", "e_jagriti"],
    doc_templates: ["nch_text", "grievance_text", "ejagriti_draft"],
  }),
  full({
    id: "unpaid_wages", category: "work", icon: "banknote",
    title_en: "Unpaid wages or salary",
    short_en: "Your employer has not paid your salary or final settlement.",
    questions: [
      Q("unpaid_amount", "Total unpaid amount (INR)", "number", { slot: "amount_inr" }),
      Q("work_period", "Period you worked (for example, Jan to Mar 2026)", "text"),
      Q("employer_name", "Employer or firm name", "text"),
      SEL("employer_sphere", "Who is your employer?", "employer_sphere", [["central", "Central government or central PSU"], ["state", "State government, private company or shop"], ["unknown", "Not sure"]]),
      Q("demand_sent", "Have you sent a written demand notice to the employer?", "boolean", { slot: "prior_written_complaint_sent" }),
    ],
    documents: [
      DOC("appointment_letter", "Appointment letter, ID card or work order", true),
      DOC("bank_statement", "Bank statement showing the missing salary", true),
      DOC("attendance", "Attendance log or shift records", false),
      DOC("demand_notice", "Written demand notice sent to the employer", true),
    ],
    template_variables: ["worker_name", "employer_name", "unpaid_amount", "work_period"],
    default_platform_ids: ["mahakamgar_labour", "samadhan_labour", "nalsa_mslsa_dlsa"],
    doc_templates: ["demand_notice_wages", "legal_aid_application"],
  }),
  full({
    id: "security_deposit", category: "home", icon: "key-round",
    title_en: "Landlord not returning security deposit",
    short_en: "You moved out and the landlord is keeping your deposit.",
    questions: [
      Q("deposit_amount", "Total security deposit (INR)", "number", { slot: "amount_inr" }),
      Q("vacate_date", "Date you vacated the property", "date"),
      Q("agreement_registered", "Is the leave and licence agreement registered?", "boolean"),
      Q("written_complaint_sent", "Have you already asked the landlord in writing?", "boolean", { slot: "prior_written_complaint_sent" }),
    ],
    documents: [
      DOC("agreement", "Registered leave and licence agreement", true),
      DOC("deposit_transfer", "Bank transfer proof of the security deposit", true),
      DOC("vacate_notice", "Notice of vacating or key handover acknowledgement", true),
      DOC("communication_log", "WhatsApp or written communication log", false),
    ],
    template_variables: ["tenant_name", "owner_name", "property_address", "deposit_amount", "vacate_date"],
    default_platform_ids: ["maharashtra_rent_small_causes_pune", "tele_law_nyaya_bandhu", "nalsa_mslsa_dlsa"],
    doc_templates: ["deposit_notice", "legal_aid_application"],
  }),
  full({
    id: "neighbour_construction", category: "home", icon: "hammer",
    title_en: "Neighbour's construction or drainage damages property",
    short_en: "A neighbour's work is causing seepage, cracks or drainage damage to your property.",
    questions: [
      SEL("damage_type", "What kind of damage is it?", undefined, [["seepage", "Seepage"], ["structural", "Structural cracks"], ["drainage", "Drainage blockage or flow"], ["other", "Other"]]),
      Q("ward_location", "Your PMC ward or area", "text", { slot: "city" }),
      Q("written_request_sent", "Have you already asked your neighbour in writing to stop?", "boolean", { slot: "prior_written_complaint_sent" }),
      SEL("ownership", "Are you the owner or a tenant?", undefined, [["owner", "Owner"], ["tenant", "Tenant"]]),
    ],
    documents: [
      DOC("geo_photos", "Geo-tagged photographs of the damage", true),
      DOC("ownership_proof", "Property ownership or tenancy proof", true),
      DOC("prior_requests", "Earlier written requests to the neighbour", false),
    ],
    template_variables: ["complainant_name", "neighbor_name", "address", "damage_type", "ward_name"],
    default_platform_ids: ["pmc_care_pune", "pcmc_grievance", "nalsa_mslsa_dlsa"],
    doc_templates: ["neighbour_letter", "pmc_ward_letter", "legal_aid_application"],
  }),
  full({
    id: "civic_failure", category: "civic", icon: "construction",
    title_en: "Civic problem not fixed",
    short_en: "A pothole, drain, garbage, water or streetlight problem is not being fixed.",
    questions: [
      SEL("issue_type", "What is the problem?", undefined, [["pothole", "Pothole or road damage"], ["drainage", "Drainage"], ["garbage", "Garbage"], ["water", "Water supply"], ["streetlight", "Streetlight"], ["other", "Other"]]),
      Q("first_noticed_days", "How many days ago did you first notice it?", "number", { slot: "days_since_incident" }),
      Q("complaint_made", "Have you already complained to the civic body?", "boolean", { slot: "prior_written_complaint_sent" }),
      Q("complaint_days_ago", "If yes, how many days ago?", "number", { slot: "prior_complaint_days_ago" }),
      Q("location_area", "Your ward or nearest landmark", "text", { slot: "city" }),
    ],
    documents: [
      DOC("problem_photo", "Geo-tagged photo of the problem", true),
      DOC("complaint_reference", "Complaint reference number, if any", false),
      DOC("earlier_complaint", "Date and copy of an earlier complaint, if any", false),
    ],
    template_variables: ["complainant_name", "address", "issue_type", "ward_name", "complaint_reference"],
    default_platform_ids: ["pmc_care_pune", "pcmc_grievance", "swachhata_mohua", "aaple_sarkar_maharashtra"],
    doc_templates: ["grievance_text", "pmc_ward_letter"],
  }),
  full({
    id: "cyber_fraud", category: "cyber", icon: "shield-alert",
    title_en: "UPI, card or online banking fraud",
    short_en: "Money was taken from your account or card without your permission, or you were tricked into paying.",
    questions: [
      Q("money_lost", "How much money was lost (INR)?", "number", { slot: "amount_inr" }),
      Q("days_since_fraud", "How many days ago did it happen?", "number", { slot: "days_since_incident" }),
      SEL("fraud_channel", "How was the money taken?", undefined, [["upi", "UPI"], ["card", "Card"], ["net_banking", "Net banking"], ["other", "Other"]]),
      Q("bank_called", "Have you already called 1930 or told your bank?", "boolean", { slot: "prior_written_complaint_sent" }),
      Q("bank_name", "Bank or app name", "text"),
    ],
    documents: [
      DOC("statement", "Bank statement showing the transaction", true),
      DOC("transaction_ids", "Transaction IDs or UTR numbers", true),
      DOC("screenshots", "Screenshots of messages, calls or payment screens", true),
      DOC("helpline_ack", "1930 complaint number, if any", false),
      DOC("id_proof", "ID proof", false),
    ],
    template_variables: ["victim_name", "bank_name", "transaction_id", "amount", "transaction_date"],
    default_platform_ids: ["ncrp_cybercrime", "mahapolice_pune_police"],
    doc_templates: ["bank_fraud_intimation", "police_complaint"],
  }),
  full({
    id: "banking_nbfc", category: "money_shopping", icon: "landmark",
    title_en: "Bank or NBFC harassment or wrong credit entry",
    short_en: "A bank or lender is harassing you, or has put a wrong entry on your credit record.",
    questions: [
      SEL("lender_type", "What kind of lender is it?", "opposite_party_type", [["bank", "Bank"], ["company", "NBFC or finance company"], ["unknown", "Not sure"]]),
      SEL("issue_type", "What is the problem?", undefined, [["harassment", "Harassment or recovery calls"], ["wrong_credit_entry", "Wrong credit report entry"], ["wrong_charge", "Wrong charge or fee"], ["other", "Other"]]),
      Q("amount_disputed", "Amount involved (INR)", "number", { slot: "amount_inr" }),
      Q("lender_contacted", "Have you already complained to the lender in writing?", "boolean", { slot: "prior_written_complaint_sent" }),
      Q("lender_contact_days_ago", "If yes, how many days ago?", "number", { slot: "prior_complaint_days_ago" }),
    ],
    documents: [
      DOC("account_details", "Loan or account number and statement of the issue", true),
      DOC("lender_letter", "Letter sent to the lender and any reply", true),
      DOC("credit_report", "Copy of the credit report showing the wrong entry", false),
      DOC("call_records", "Call records or messages, if harassment", false),
    ],
    template_variables: ["borrower_name", "lender_name", "account_last4", "issue_summary"],
    default_platform_ids: ["rbi_cms"],
    doc_templates: ["rbi_lender_precomplaint"],
  }),
  full({
    id: "builder_delay", category: "home", icon: "building-2",
    title_en: "Builder delay or possession without occupancy certificate",
    short_en: "Your flat is late, or handed over without the required occupancy papers.",
    questions: [
      Q("project_name", "Project name", "text"),
      Q("rera_number", "MahaRERA registration number, if you know it", "text"),
      Q("amount_paid", "Total amount paid to the builder (INR)", "number", { slot: "amount_inr" }),
      Q("promised_date", "Promised possession date", "date"),
      Q("written_complaint_sent", "Have you already complained to the builder in writing?", "boolean", { slot: "prior_written_complaint_sent" }),
    ],
    documents: [
      DOC("agreement", "Agreement for sale", true),
      DOC("payment_receipts", "Payment receipts", true),
      DOC("possession_letter", "Possession letter or promised date in writing", false),
      DOC("rera_page", "MahaRERA project page or registration certificate", false),
      DOC("builder_letter", "Written complaint to the builder and any reply", false),
    ],
    template_variables: ["buyer_name", "builder_name", "project_name", "rera_number", "amount_paid"],
    default_platform_ids: ["maharera", "tele_law_nyaya_bandhu"],
    doc_templates: ["maharera_conciliation"],
  }),
  full({
    id: "govt_service", category: "govt", icon: "building",
    title_en: "Delayed government service, certificate or pension",
    short_en: "A government office has not delivered a service or decided your application.",
    questions: [
      Q("service_name", "Which service or certificate?", "text"),
      Q("applied_days_ago", "How many days ago did you apply?", "number", { slot: "days_since_incident" }),
      Q("complaint_made", "Have you already reminded the office in writing?", "boolean", { slot: "prior_written_complaint_sent" }),
      SEL("exclusion", "Is this about an RTI request, a court case or a family matter?", undefined, [["none", "No"], ["rti", "Yes, RTI"], ["sub_judice", "Yes, court case"], ["personal_family", "Yes, family matter"]]),
    ],
    documents: [
      DOC("acknowledgement", "Application receipt or acknowledgement number", true),
      DOC("submitted_docs", "Copies of the documents you submitted", true),
      DOC("reminder", "Earlier reminder or complaint, if any", false),
    ],
    template_variables: ["applicant_name", "department_name", "application_number", "service_name", "applied_on"],
    default_platform_ids: ["aaple_sarkar_maharashtra", "cpgrams"],
    doc_templates: ["grievance_text"],
  }),
  // ---- remaining disputes, standard depth
  std({
    id: "insurance_claim", category: "money_shopping", icon: "shield-check",
    title_en: "Insurance claim rejected or delayed",
    short_en: "An insurer rejected, delayed or underpaid your claim.",
    questions: [
      Q("claim_amount", "Claim amount (INR)", "number", { slot: "amount_inr" }),
      Q("claim_date", "Date you made the claim", "date"),
      Q("written_complaint_sent", "Have you already complained to the insurer in writing?", "boolean", { slot: "prior_written_complaint_sent" }),
    ],
    documents: [
      DOC("policy", "Policy document", true),
      DOC("claim_ack", "Claim form and acknowledgement", true),
      DOC("rejection_letter", "Rejection letter, or proof of no reply", true),
      DOC("medical_papers", "Medical or other supporting papers", false),
    ],
    template_variables: ["policy_holder_name", "insurer_name", "policy_number", "claim_number", "claim_amount"],
    default_platform_ids: ["irdai_bima_bharosa_ombudsman", "nch_ingram"],
    doc_templates: ["grievance_text"],
  }),
  std({
    id: "investment_broker", category: "money_shopping", icon: "trending-up",
    title_en: "Broker or investment platform problem",
    short_en: "A broker or investment firm is not resolving a complaint about your money or account.",
    questions: [
      Q("amount_involved", "Amount involved (INR)", "number", { slot: "amount_inr" }),
      Q("days_since_issue", "How many days ago did the problem start?", "number", { slot: "days_since_incident" }),
      Q("written_complaint_sent", "Have you already complained to the firm in writing?", "boolean", { slot: "prior_written_complaint_sent" }),
    ],
    documents: [
      DOC("account_statements", "Account statements and contract notes", true),
      DOC("complaint_emails", "Complaint emails and replies", true),
      DOC("client_id", "Client ID or KYC details", false),
    ],
    template_variables: ["investor_name", "broker_name", "client_id", "amount_involved"],
    default_platform_ids: ["sebi_scores"],
    doc_templates: ["grievance_text"],
  }),
  std({
    id: "workplace_harassment", category: "work", icon: "user-x",
    title_en: "Harassment at work",
    short_en: "You are facing sexual or other harassment at your workplace.",
    questions: [
      SEL("employer_sphere", "Who is your employer?", "employer_sphere", [["central", "Central government or central PSU"], ["state", "State government, private company or shop"], ["unknown", "Not sure"]]),
      Q("days_since_incident", "How many days ago did the latest incident happen?", "number", { slot: "days_since_incident" }),
      Q("in_danger", "Are you in immediate danger right now?", "boolean", { slot: "is_emergency" }),
      Q("internal_complaint", "Have you complained to your employer or an internal committee?", "boolean", { slot: "prior_written_complaint_sent" }),
    ],
    documents: [
      DOC("incident_account", "Written account of the incidents with dates", true),
      DOC("messages", "Messages or emails as evidence", false),
      DOC("internal_copy", "Copy of your internal complaint, if any", false),
      DOC("id_proof", "ID proof", false),
    ],
    template_variables: ["complainant_name", "employer_name", "incident_summary"],
    default_platform_ids: ["she_box", "nalsa_mslsa_dlsa"],
    doc_templates: ["shebox_narrative", "legal_aid_application"],
  }),
  std({
    id: "pension_pf", category: "work", icon: "piggy-bank",
    title_en: "Pension or provident fund claim pending",
    short_en: "A PF or pension claim is stuck or was wrongly rejected.",
    questions: [
      Q("claim_amount", "Amount you are claiming (INR)", "number", { slot: "amount_inr" }),
      Q("days_since_applied", "How many days ago did you apply?", "number", { slot: "days_since_incident" }),
      Q("written_complaint_sent", "Have you already reminded the office in writing?", "boolean", { slot: "prior_written_complaint_sent" }),
    ],
    documents: [
      DOC("uan_details", "UAN and PF account details", true),
      DOC("claim_ack", "Claim form and acknowledgement", true),
      DOC("service_history", "Employer certificate or service history", false),
      DOC("rejection_letter", "Rejection letter, if any", false),
    ],
    template_variables: ["member_name", "uan_number", "employer_name", "claim_type"],
    default_platform_ids: ["epfigms", "cpgrams"],
    doc_templates: ["grievance_text"],
  }),
  std({
    id: "police_complaint", category: "police", icon: "siren",
    title_en: "File a police complaint",
    short_en: "You want to report a crime or incident to the police.",
    questions: [
      Q("city", "City or area where it happened", "text", { slot: "city" }),
      Q("days_since_incident", "How many days ago did it happen?", "number", { slot: "days_since_incident" }),
      Q("in_danger", "Is this an emergency right now?", "boolean", { slot: "is_emergency" }),
    ],
    documents: [
      DOC("id_proof", "ID proof", true),
      DOC("incident_description", "Written description of the incident", true),
      DOC("evidence", "Photos, videos or documents as evidence", false),
    ],
    template_variables: ["complainant_name", "police_station", "incident_date", "incident_summary"],
    default_platform_ids: ["mahapolice_pune_police"],
    doc_templates: ["police_complaint"],
  }),
  std({
    id: "lost_mobile", category: "police", icon: "smartphone",
    title_en: "Lost or stolen mobile phone",
    short_en: "Your phone is lost or stolen and you need a police record.",
    questions: [
      Q("imei_known", "Do you know the IMEI numbers?", "boolean"),
      Q("days_since_lost", "How many days ago did you lose it?", "number", { slot: "days_since_incident" }),
    ],
    documents: [
      DOC("imei", "IMEI numbers from the box or the bill", false),
      DOC("purchase_bill", "Purchase bill", false),
      DOC("id_proof", "ID proof", true),
    ],
    template_variables: ["owner_name", "phone_model", "imei_numbers", "location_lost"],
    default_platform_ids: ["mahapolice_pune_police", "ncrp_cybercrime"],
    doc_templates: ["police_complaint"],
  }),
  std({
    id: "cyber_harassment", category: "cyber", icon: "shield-alert",
    title_en: "Online harassment or abuse",
    short_en: "Someone is harassing, threatening or impersonating you online.",
    questions: [
      Q("threatened_now", "Are you being threatened right now?", "boolean", { slot: "is_emergency" }),
      Q("days_since_incident", "How many days ago did it start?", "number", { slot: "days_since_incident" }),
      Q("platform_used", "Which app or website was used?", "text"),
    ],
    documents: [
      DOC("screenshots", "Screenshots with dates and links", true),
      DOC("account_details", "Account names or profile links of the accused", true),
      DOC("messages", "Messages received", true),
      DOC("id_proof", "ID proof", false),
    ],
    template_variables: ["victim_name", "accused_handle", "platform_used", "incident_summary"],
    default_platform_ids: ["ncrp_cybercrime", "she_box", "mahapolice_pune_police"],
    doc_templates: ["police_complaint", "shebox_narrative"],
  }),
  std({
    id: "free_legal_aid", category: "legal_aid", icon: "scale",
    title_en: "Free legal aid",
    short_en: "You may qualify for a free lawyer or free advice from a legal aid authority.",
    questions: [
      Q("annual_income", "Annual family income (INR)", "number", { slot: "annual_income_inr" }),
      SEL("status_flag", "Do any of these apply to you?", undefined, [["woman", "Woman"], ["child", "Child under 18"], ["sc_st", "Scheduled Caste or Tribe"], ["industrial_workman", "Industrial workman"], ["disability", "Disability or mental illness"], ["custody", "In custody"], ["trafficking", "Victim of trafficking"], ["disaster", "Victim of disaster"], ["none", "None of these"]]),
      Q("district", "Your district", "text", { slot: "district" }),
    ],
    documents: [
      DOC("income_affidavit", "Income certificate or income affidavit", false),
      DOC("id_proof", "ID proof", true),
      DOC("status_proof", "Proof of status, such as a caste or disability certificate", false),
      DOC("case_papers", "Case papers, if any", false),
    ],
    template_variables: ["applicant_name", "district", "annual_income", "status_flag"],
    default_platform_ids: ["nalsa_mslsa_dlsa", "tele_law_nyaya_bandhu"],
    doc_templates: ["legal_aid_application"],
  }),
  std({
    id: "other", category: "govt", icon: "help-circle",
    title_en: "Something else",
    short_en: "Your problem does not fit a listed category. Raasta will suggest general routes.",
    questions: [
      Q("summary", "Describe the problem in a few words", "text", { slot: "summary" }),
      Q("city", "City or area", "text", { slot: "city" }),
      Q("amount", "Amount involved, if any (INR)", "number", { slot: "amount_inr" }),
    ],
    documents: [
      DOC("id_proof", "ID proof", false),
      DOC("written_records", "Any written records of the problem", false),
    ],
    template_variables: ["complainant_name", "summary"],
    default_platform_ids: ["cpgrams", "tele_law_nyaya_bandhu"],
    doc_templates: ["grievance_text"],
  }),
];

const disputes = disputeDefs.map((d) => {
  const out = { ...d, title_en: d.title_en, short_en: d.short_en };
  for (const p of out.default_platform_ids) if (!platformIds.has(p)) fail(`dispute ${d.id} unknown platform ${p}`);
  for (const q of out.questions) if (q.slot === undefined) delete q.slot;
  disputeSchema.parse(out);
  return out;
});
if (disputes.length !== DISPUTE_IDS.length || new Set(disputes.map((d) => d.id)).size !== 19) fail("expected 19 unique disputes");
for (const id of DISPUTE_IDS) if (!disputes.some((d) => d.id === id)) fail(`missing dispute ${id}`);
if (disputes.filter((d) => d.depth === "full").length !== 10) fail("expected 10 full-depth disputes");
for (const d of disputes) {
  if (d.depth === "standard" && (d.questions.length < 2 || d.questions.length > 4)) fail(`standard ${d.id} needs 2-4 questions`);
}
writeJson("disputes.json", deepNoEm(disputes));

// ---------------------------------------------------------------- states (36 States/UTs)
const ceilingByCode = Object.fromEntries(legalAid.states.map((s) => [s.state_code, s.income_ceiling_inr]));
const stateRows = [
  ["AN", "Andaman and Nicobar Islands", ["en", "hi"]],
  ["AP", "Andhra Pradesh", ["en", "te"]],
  ["AR", "Arunachal Pradesh", ["en", "hi"]],
  ["AS", "Assam", ["en"]],
  ["BR", "Bihar", ["en", "hi"]],
  ["CH", "Chandigarh", ["en", "hi", "pa"]],
  ["CG", "Chhattisgarh", ["en", "hi"]],
  ["DN", "Dadra and Nagar Haveli and Daman and Diu", ["en", "gu", "mr"]],
  ["DL", "Delhi", ["en", "hi", "pa", "ur"]],
  ["GA", "Goa", ["en", "mr"]],
  ["GJ", "Gujarat", ["en", "gu", "hi"]],
  ["HR", "Haryana", ["en", "hi", "pa"]],
  ["HP", "Himachal Pradesh", ["en", "hi"]],
  ["JK", "Jammu and Kashmir", ["en", "ur", "hi"]],
  ["JH", "Jharkhand", ["en", "hi"]],
  ["KA", "Karnataka", ["en", "kn"]],
  ["KL", "Kerala", ["en", "ml"]],
  ["LA", "Ladakh", ["en", "hi", "ur"]],
  ["LD", "Lakshadweep", ["en", "ml"]],
  ["MP", "Madhya Pradesh", ["en", "hi"]],
  ["MH", "Maharashtra", ["en", "mr", "hi"]],
  ["MN", "Manipur", ["en"]],
  ["ML", "Meghalaya", ["en"]],
  ["MZ", "Mizoram", ["en"]],
  ["NL", "Nagaland", ["en"]],
  ["OD", "Odisha", ["en", "or"]],
  ["PY", "Puducherry", ["en", "ta"]],
  ["PB", "Punjab", ["en", "pa", "hi"]],
  ["RJ", "Rajasthan", ["en", "hi"]],
  ["SK", "Sikkim", ["en", "hi"]],
  ["TN", "Tamil Nadu", ["en", "ta"]],
  ["TG", "Telangana", ["en", "te", "ur"]],
  ["TR", "Tripura", ["en", "bn"]],
  ["UP", "Uttar Pradesh", ["en", "hi", "ur"]],
  ["UK", "Uttarakhand", ["en", "hi"]],
  ["WB", "West Bengal", ["en", "bn"]],
];
if (stateRows.length !== 36) fail("expected 36 states");
const SLSA_URL = "https://nalsa.gov.in/directory/"; // handbook 2.2; per-state contacts not fetched
const states = stateRows.map(([code, name, languages]) => {
  const row = {
    code, name, languages,
    coverage: code === "MH" ? "deep" : "standard",
    slsa: { name: `${name} State Legal Services Authority`, url: SLSA_URL, verified: false },
    legal_aid_ceiling_inr: code === "DN" ? null : ceilingByCode[code],
  };
  return row;
});
// Only the Maharashtra portal URL is taken from the sources (directories JSON); other states' portal URLs are not in the sources and are omitted.
const aaple = platforms.find((p) => p.id === "aaple_sarkar_maharashtra");
const aapleHome = aaple && aaple.urls && aaple.urls.home;
if (typeof aapleHome === "string") {
  states.find((s) => s.code === "MH").grievance_portal = { name: "Aaple Sarkar (Maharashtra)", url: aapleHome, verified: false };
}
states.forEach((s) => stateInfoSchema.parse(s));
writeJson("states.json", states.map(deepNoEm));

console.log("ingest complete");
