import type { DisputeType } from "@raasta/rules/types";

export type DoorKey = "police" | "consumer" | "labour" | "ward" | "legal" | "bank" | "post";

export const DOOR_FOR: Partial<Record<DisputeType, DoorKey>> = {
  consumer_refund: "consumer",
  mrp_overcharge: "consumer",
  insurance_claim: "consumer",
  builder_delay: "consumer",
  unpaid_wages: "labour",
  pension_pf: "labour",
  workplace_harassment: "labour",
  security_deposit: "legal",
  free_legal_aid: "legal",
  neighbour_construction: "ward",
  civic_failure: "ward",
  govt_service: "ward",
  police_complaint: "police",
  lost_mobile: "police",
  cyber_fraud: "police",
  cyber_harassment: "police",
  banking_nbfc: "bank",
  investment_broker: "bank",
};

/** Tiny local keyword map (English, Hindi, Marathi). Server intake does the real work. */
const KEYWORDS: Partial<Record<DisputeType, string[]>> = {
  security_deposit: ["deposit", "landlord", "rent", "tenant", "किराय", "मकान मालिक", "मकान मालक", "डिपॉजिट", "डिपॉझिट", "भाडे", "घरमालक", "भाडेकरू"],
  unpaid_wages: ["salary", "wage", "unpaid", "employer", "boss", "वेतन", "पगार", "तनख्वाह", "मजदूरी"],
  civic_failure: ["pothole", "garbage", "drain", "streetlight", "street light", "water supply", "road", "गड्ढा", "गड्ढे", "खड्डा", "कचरा", "नाली", "सड़क", "रस्ता"],
  police_complaint: ["police", "fir", "theft", "stolen", "threat", "पुलिस", "चोरी", "धमकी", "पोलीस", "तक्रार"],
  cyber_fraud: ["upi", "otp", "fraud", "scam", "hacked", "धोखा", "ठगी", "फसवणूक"],
  cyber_harassment: ["blackmail", "morphed", "online abuse", "ब्लैकमेल", "ब्लॅकमेल"],
  consumer_refund: ["refund", "defective", "faulty", "warranty", "delivery", "replace", "रिफंड", "खराब", "परतावा", "वस्तू"],
  mrp_overcharge: ["mrp", "overcharge", "ज्यादा दाम", "जास्त किंमत"],
  banking_nbfc: ["bank", "loan", "emi", "credit card", "बैंक", "कर्ज", "लोन"],
  insurance_claim: ["insurance", "policy", "बीमा", "विमा"],
  investment_broker: ["broker", "shares", "stock", "mutual fund", "शेअर", "शेयर"],
  builder_delay: ["builder", "flat", "possession", "बिल्डर", "फ्लॅट", "फ्लैट"],
  pension_pf: ["pension", "provident", "epfo", "पेंशन", "पीएफ"],
  workplace_harassment: ["harass", "छेड़", "छळ"],
  lost_mobile: ["lost phone", "lost mobile", "phone lost", "फोन खो", "मोबाईल हरवला", "फोन हरवला"],
  free_legal_aid: ["lawyer", "legal aid", "advocate", "वकील", "वकिल"],
  neighbour_construction: ["neighbour", "neighbor", "construction", "boundary", "पड़ोसी", "शेजारी"],
  govt_service: ["certificate", "ration", "government office", "प्रमाणपत्र", "राशन", "दाखला"],
};

export function matchDoor(text: string): DoorKey | null {
  const s = text.toLowerCase();
  if (s.trim().length < 3) return null;
  let best: DisputeType | null = null;
  let bestScore = 0;
  for (const [dispute, words] of Object.entries(KEYWORDS) as [DisputeType, string[]][]) {
    let score = 0;
    for (const w of words) if (s.includes(w)) score += w.length > 4 ? 2 : 1;
    if (score > bestScore) {
      best = dispute;
      bestScore = score;
    }
  }
  return best ? (DOOR_FOR[best] ?? null) : null;
}

function doorKeyOf(el: Element): string | null {
  const explicit = el.getAttribute("data-door");
  if (explicit) return explicit;
  const id = el.getAttribute("id");
  if (!id || !id.startsWith("door-")) return null;
  const k = id.slice(5);
  return k === "legal_aid" ? "legal" : k;
}

/** Dims non-matching doors, warms and opens the match, draws the dotted street path. Pure class toggles. */
export function applyDoor(street: Element | null, key: DoorKey | null): void {
  if (!street) return;
  const previous = street.getAttribute("data-key") ?? "";
  street.querySelectorAll<SVGElement | HTMLElement>('[data-door], [id^="door-"]').forEach((el) => {
    const k = doorKeyOf(el);
    el.classList.toggle("is-dim", key !== null && k !== key);
    el.classList.toggle("is-warm", key !== null && k === key);
    el.classList.toggle("is-chosen", key !== null && k === key);
  });
  street.querySelectorAll<SVGGeometryElement>("#path, [data-street-path], [data-path-for]").forEach((p) => {
    const target = p.getAttribute("data-path-for");
    const on = key !== null && (target === null || target === key);
    if (on && (previous !== key || !p.classList.contains("is-on"))) {
      let len = 240;
      try {
        len = Math.ceil(p.getTotalLength());
      } catch {
        /* path length unavailable */
      }
      p.style.setProperty("--len", String(len));
      p.classList.remove("is-on");
      void p.getBoundingClientRect();
    }
    p.classList.toggle("is-on", on);
  });
  street.setAttribute("data-key", key ?? "");
  street.classList.toggle("has-match", key !== null);
}
