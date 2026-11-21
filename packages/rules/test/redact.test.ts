import { describe, expect, it } from "vitest";
import { luhn, redact, verhoeff } from "../src";

// 2345 6789 0124 passes Verhoeff (checked in the test below).
function aadhaarWithCheck(prefix11: string): string {
  for (let d = 0; d < 10; d++) if (verhoeff(prefix11 + d)) return prefix11 + d;
  throw new Error("unreachable");
}

describe("redact: true positives", () => {
  const aadhaar = aadhaarWithCheck("23456789012");
  it("masks Aadhaar with a valid Verhoeff check, plain or grouped", () => {
    expect(verhoeff(aadhaar)).toBe(true);
    expect(redact(`my aadhaar ${aadhaar} is lost`)).toBe("my aadhaar [AADHAAR] is lost");
    const g = `${aadhaar.slice(0, 4)} ${aadhaar.slice(4, 8)} ${aadhaar.slice(8)}`;
    expect(redact(`id ${g}.`)).toBe("id [AADHAAR].");
  });
  it("masks PAN", () => {
    expect(redact("PAN ABCDE1234F filed")).toBe("PAN [PAN] filed");
  });
  it("masks Indian phone numbers in common shapes", () => {
    expect(redact("call 9876543210 now")).toBe("call [PHONE] now");
    expect(redact("call +91 98765 43210 now")).toBe("call [PHONE] now");
    expect(redact("call +91-9876543210")).toBe("call [PHONE]");
    expect(redact("call 09876543210")).toBe("call [PHONE]");
  });
  it("masks emails", () => {
    expect(redact("write to ravi.k@example.com please")).toBe("write to [EMAIL] please");
  });
  it("masks UPI ids", () => {
    expect(redact("paid to ravi@okhdfcbank today")).toBe("paid to [UPI] today");
    expect(redact("pay 9876543210@ybl")).toBe("pay [UPI]");
  });
  it("masks Luhn valid card numbers, with or without spaces", () => {
    expect(luhn("4111111111111111")).toBe(true);
    expect(redact("card 4111 1111 1111 1111 was used")).toBe("card [CARD] was used");
    expect(redact("card 4111111111111111 was used")).toBe("card [CARD] was used");
  });
  it("masks bank account like numbers", () => {
    expect(redact("a/c 123456789012 at SBI")).toBe("a/c [ACCOUNT] at SBI");
    expect(redact("a/c 000123456789")).toBe("a/c [ACCOUNT]");
  });
  it("masks OTP near its keyword", () => {
    expect(redact("the otp is 482913")).toBe("the otp is [OTP]");
    expect(redact("OTP: 4829")).toBe("OTP: [OTP]");
    expect(redact("my pin 1234 was shared")).toBe("my pin [OTP] was shared");
    expect(redact("code 55123 came by sms")).toBe("code [OTP] came by sms");
    expect(redact("482913 is my OTP")).toBe("[OTP] is my OTP");
  });
  it("handles several items in one text", () => {
    const out = redact("Ravi 9876543210 ravi@example.com paid 4,500 to ravi@okaxis");
    expect(out).toBe("Ravi [PHONE] [EMAIL] paid 4,500 to [UPI]");
  });
});

describe("redact: false positives are left alone", () => {
  it("keeps rupee amounts", () => {
    for (const t of [
      "I paid 40,000 for it", "refund of Rs 5000 pending", "Rs. 45000 deducted", "INR 150000 charged",
      "amount 4,00,000 rupees", "₹5000 only", "Rs 150000000 crore", "1,00,00,000 total",
    ]) expect(redact(t)).toBe(t);
  });
  it("keeps short numbers, dates and years", () => {
    for (const t of ["on 12/03/2026 at 5 pm", "2 years ago", "flat 402, building 7", "called 1930 and 1915", "dial 112"]) {
      expect(redact(t)).toBe(t);
    }
  });
  it("keeps postal pin codes", () => {
    expect(redact("Pune pin code 411001")).toBe("Pune pin code 411001");
    expect(redact("pincode 411001")).toBe("pincode 411001");
  });
  it("keeps an amount near the word code", () => {
    expect(redact("promo code applied, Rs 5000 charged")).toBe("promo code applied, Rs 5000 charged");
  });
  it("does not mask a 12 digit number that fails Verhoeff as Aadhaar", () => {
    const n = "234567890123";
    const out = redact(`ref ${n}`);
    expect(out).not.toContain("[AADHAAR]");
  });
  it("does not mask a 16 digit number that fails Luhn as a card", () => {
    expect(redact("order 1234567890123456")).not.toContain("[CARD]");
  });
  it("keeps registered toll free and helpline numbers", () => {
    expect(redact("call 1800-103-0222 or 020-25501000")).toBe("call 1800-103-0222 or 020-25501000");
  });
  it("keeps a plain sentence", () => {
    const t = "The landlord refused to return my deposit after I left the flat.";
    expect(redact(t)).toBe(t);
  });
});
