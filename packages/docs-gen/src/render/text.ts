import type { PDFFont } from "pdf-lib";

const MAP: Record<string, string> = {
  "\u2018": "'", "\u2019": "'", "\u201C": '"', "\u201D": '"',
  "\u2013": "-", "\u2014": "-", "\u2212": "-", "\u2026": "...",
  "\u00A0": " ", "\u20B9": "Rs. ", "\u2022": "-", "\t": "    ", "\r": "",
};

export interface Sanitized {
  text: string;
  lossy: boolean;
}

/** Make text safe for the standard Helvetica font (Latin-1 only). */
export function sanitize(input: string): Sanitized {
  let lossy = false;
  let out = "";
  for (const ch of input.normalize("NFC")) {
    if (MAP[ch] !== undefined) { out += MAP[ch]; continue; }
    const cp = ch.codePointAt(0)!;
    if (ch === "\n" || (cp >= 0x20 && cp <= 0x7e) || (cp >= 0xa0 && cp <= 0xff)) { out += ch; continue; }
    if (cp < 0x20) continue;
    const base = ch.normalize("NFD").replace(/[\u0300-\u036F]/g, "");
    if (/^[\x20-\x7e]+$/.test(base)) { out += base; continue; }
    out += "?";
    lossy = true;
  }
  return { text: out, lossy };
}

/** Wrap text to a width, honouring hard line breaks and breaking very long words. */
export function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const result: string[] = [];
  for (const hard of text.split("\n")) {
    const words = hard.split(" ");
    let line = "";
    for (let word of words) {
      while (font.widthOfTextAtSize(word, size) > maxWidth) {
        let cut = word.length - 1;
        while (cut > 1 && font.widthOfTextAtSize(word.slice(0, cut), size) > maxWidth) cut--;
        if (line) { result.push(line); line = ""; }
        result.push(word.slice(0, cut));
        word = word.slice(cut);
      }
      const trial = line ? `${line} ${word}` : word;
      if (line && font.widthOfTextAtSize(trial, size) > maxWidth) {
        result.push(line);
        line = word;
      } else {
        line = trial;
      }
    }
    result.push(line);
  }
  return result;
}

export const MM = 72 / 25.4;
