export const APP_NAME = "Raasta";
export const TAGLINE = "Find the right door for your problem.";
export const SITE_URL = "https://raasta.safalmutha.in";
export const DISCLAIMER_EN =
  "Raasta gives procedural guidance based on public government rules. It is not legal advice.";
export const DOC_FOOTER_EN =
  "Prepared with Raasta. This is a draft for you to check, sign and send. It is not legal advice.";

export const LOCALES = ["en", "hi", "mr", "bn", "ta", "te", "kn", "ml", "gu", "pa", "or", "ur"] as const;
export type Locale = (typeof LOCALES)[number];
export const RTL_LOCALES: Locale[] = ["ur"];

export const FLAGS = {
  voice_input: false,
  digit_sandbox: true,
  map: true,
} as const;
