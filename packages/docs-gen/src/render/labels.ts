import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import type { DocParty } from "../model";
import { MM, sanitize, wrapText } from "./text";

export const POST_LINE = "Speed Post / Registered Post A.D.";
export const POSTING_REMINDER =
  "Keep the proof of posting receipt. Write the article number here: ________ . You can track it on indiapost.gov.in.";

export interface LabelArgs {
  to: DocParty;
  from: DocParty;
  /** Number of labels to print, 4 per A4 sheet. Default 4, maximum 40. */
  copies?: number;
}

function partyLines(p: DocParty): string[] {
  const out: string[] = [];
  out.push(p.name || "________");
  out.push(p.address || "________");
  if (p.phone) out.push(`Phone: ${p.phone}`);
  if (p.email) out.push(`Email: ${p.email}`);
  return out.map((l) => sanitize(l).text);
}

function drawBlock(
  page: PDFPage, font: PDFFont, bold: PDFFont,
  heading: string, lines: string[], x: number, y: number, width: number, size: number,
): number {
  page.drawText(heading, { x, y, size: size - 1, font: bold, color: rgb(0.3, 0.3, 0.3) });
  y -= size + 3;
  for (const l of lines) {
    for (const w of wrapText(l, font, size, width)) {
      page.drawText(w, { x, y, size, font, color: rgb(0, 0, 0) });
      y -= size + 3;
    }
  }
  return y;
}

/** A4 sheet(s) with 2 x 2 labels per sheet. */
export async function renderLabels(args: LabelArgs): Promise<Uint8Array> {
  const copies = Math.max(1, Math.min(40, Math.floor(args.copies ?? 4)));
  const pdf = await PDFDocument.create();
  pdf.setTitle("Postal labels");
  pdf.setProducer("Raasta");
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const W = 210 * MM, H = 297 * MM;
  const cw = W / 2, ch = H / 2;
  const pad = 9 * MM;
  const toL = partyLines(args.to);
  const fromL = partyLines(args.from);
  const reminder = sanitize(POSTING_REMINDER).text;

  let page!: PDFPage;
  for (let i = 0; i < copies; i++) {
    const slot = i % 4;
    if (slot === 0) {
      page = pdf.addPage([W, H]);
      // cut lines
      const dash = { thickness: 0.5, color: rgb(0.6, 0.6, 0.6), dashArray: [4, 3] };
      page.drawLine({ start: { x: cw, y: 0 }, end: { x: cw, y: H }, ...dash });
      page.drawLine({ start: { x: 0, y: ch }, end: { x: W, y: ch }, ...dash });
    }
    const col = slot % 2;
    const row = Math.floor(slot / 2);
    const x0 = col * cw + pad;
    const top = H - row * ch - pad;
    const inner = cw - 2 * pad;

    page.drawText(POST_LINE, { x: x0, y: top - 10, size: 10, font: bold, color: rgb(0, 0, 0) });
    let y = top - 30;
    y = drawBlock(page, font, bold, "TO", toL, x0, y, inner, 13);
    y -= 14;
    y = drawBlock(page, font, bold, "FROM", fromL, x0, y, inner, 10);

    const rl = wrapText(reminder, font, 7.5, inner);
    let ry = H - (row + 1) * ch + pad + rl.length * 10;
    rl.forEach((l) => {
      page.drawText(l, { x: x0, y: ry, size: 7.5, font, color: rgb(0.3, 0.3, 0.3) });
      ry -= 10;
    });
  }
  return pdf.save();
}

/** DL envelope, 220 x 110 mm, landscape. */
export async function renderEnvelopeDL(args: { to: DocParty; from: DocParty }): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle("DL envelope");
  pdf.setProducer("Raasta");
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const W = 220 * MM, H = 110 * MM;
  const page = pdf.addPage([W, H]);
  const pad = 10 * MM;

  page.drawText(POST_LINE, { x: W - pad - bold.widthOfTextAtSize(POST_LINE, 11), y: H - pad - 6, size: 11, font: bold });
  drawBlock(page, font, bold, "FROM", partyLines(args.from), pad, H - pad - 6, 85 * MM, 9);
  drawBlock(page, font, bold, "TO", partyLines(args.to), 105 * MM, H / 2 + 6, W - 105 * MM - pad, 14);

  const rl = wrapText(sanitize(POSTING_REMINDER).text, font, 7.5, W - 2 * pad);
  let y = pad + rl.length * 10 - 4;
  rl.forEach((l) => {
    page.drawText(l, { x: pad, y, size: 7.5, font, color: rgb(0.3, 0.3, 0.3) });
    y -= 10;
  });
  return pdf.save();
}
