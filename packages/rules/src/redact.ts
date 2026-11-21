// PII redaction before any AI call. Pure, no network. Never masks rupee amounts such as "40,000" or "Rs 5000".

const D = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], [1, 2, 3, 4, 0, 6, 7, 8, 9, 5], [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
  [3, 4, 0, 1, 2, 8, 9, 5, 6, 7], [4, 0, 1, 2, 3, 9, 5, 6, 7, 8], [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
  [6, 5, 9, 8, 7, 1, 0, 4, 3, 2], [7, 6, 5, 9, 8, 2, 1, 0, 4, 3], [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
  [9, 8, 7, 6, 5, 4, 3, 2, 1, 0],
];
const P = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], [1, 5, 7, 6, 2, 8, 3, 0, 9, 4], [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
  [8, 9, 1, 6, 0, 4, 3, 5, 2, 7], [9, 4, 5, 3, 1, 2, 6, 8, 7, 0], [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
  [2, 7, 9, 3, 8, 0, 6, 4, 1, 5], [7, 0, 4, 6, 9, 1, 3, 2, 5, 8],
];

export function verhoeff(num: string): boolean {
  let c = 0;
  const digits = num.split("").reverse().map(Number);
  for (let i = 0; i < digits.length; i++) c = D[c][P[i % 8][digits[i]]];
  return c === 0;
}

export function luhn(num: string): boolean {
  let sum = 0;
  let alt = false;
  for (let i = num.length - 1; i >= 0; i--) {
    let n = Number(num[i]);
    if (alt) { n *= 2; if (n > 9) n -= 9; }
    sum += n;
    alt = !alt;
  }
  return sum % 10 === 0;
}

const digitsOnly = (s: string) => s.replace(/\D/g, "");
const CURRENCY_BEFORE = /(?:rs\.?|inr|rupees?|₹)\s*$/i;

export function redact(text: string): string {
  let out = text;

  // 1. Aadhaar: 12 digits (optionally grouped 4-4-4), first digit 2-9, Verhoeff valid.
  out = out.replace(/(?<![\d,.])[2-9]\d{3}[ -]?\d{4}[ -]?\d{4}(?![\d,]|\.\d)/g, (m) =>
    verhoeff(digitsOnly(m)) ? "[AADHAAR]" : m);

  // 2. Card: 13-19 digits, optional space or dash grouping, Luhn valid.
  out = out.replace(/(?<![\d,.])\d(?:[ -]?\d){12,18}(?![\d,]|\.\d)/g, (m) => {
    const d = digitsOnly(m);
    return d.length >= 13 && d.length <= 19 && luhn(d) ? "[CARD]" : m;
  });

  // 3. Email, then UPI id (name@handle without a dotted domain).
  out = out.replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/g, "[EMAIL]");
  out = out.replace(/(?<![\w.])[A-Za-z0-9._-]{2,}@[A-Za-z][A-Za-z0-9]{1,}(?![\w.@-])/g, "[UPI]");

  // 4. PAN: AAAAA9999A
  out = out.replace(/(?<![A-Za-z0-9])[A-Z]{5}\d{4}[A-Z](?![A-Za-z0-9])/gi, "[PAN]");

  // 5. Indian mobile numbers (+91, 0 prefix or bare), 10 digits starting 6-9, optional 5-5 grouping.
  out = out.replace(/(?<![\d,.])(?:\+?91[ -]?|0)?[6-9]\d{4}[ -]?\d{5}(?![\d,]|\.\d)/g, "[PHONE]");

  // 6. OTP / PIN / code near its keyword. "pin code 411001" (postal) is left alone.
  out = out.replace(
    /\b(otp|pin|passcode|code|cvv)\b([^\d\n]{0,25}?)(?<![\d,])(\d{4,8})(?![\d,]|\.\d)/gi,
    (m: string, kw: string, gap: string, _digits: string, offset: number, whole: string) => {
      if (/(?:rs\.?|inr|rupees?|₹)/i.test(gap)) return m;
      if (/^code$/i.test(kw) && /pin\s*$/i.test(whole.slice(Math.max(0, offset - 6), offset))) return m;
      if (/^pin$/i.test(kw) && /^\s*code/i.test(whole.slice(offset + kw.length))) return m;
      return `${kw}${gap}[OTP]`;
    },
  );
  out = out.replace(
    /(?<![\d,])(\d{4,8})(?![\d,]|\.\d)(\s+(?:is|was|as)\s+(?:my|the|your)\s+(?:otp|pin|passcode|code)\b)/gi,
    "[OTP]$2",
  );

  // 7. Bank account like runs of 9-18 digits, unless they follow a currency marker.
  out = out.replace(/(?<![\d,.])\d{9,18}(?![\d,]|\.\d)/g, (m, offset: number, whole: string) =>
    CURRENCY_BEFORE.test(whole.slice(0, offset)) ? m : "[ACCOUNT]");

  return out;
}
