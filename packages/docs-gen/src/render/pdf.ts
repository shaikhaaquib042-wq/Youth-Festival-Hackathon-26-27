import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import type { DocModel } from "../model";
import { MM, sanitize, wrapText } from "./text";

const PAGE_W = 210 * MM;
const PAGE_H = 297 * MM;
const MARGIN_X = 20 * MM;
const MARGIN_TOP = 20 * MM;
const MARGIN_BOTTOM = 24 * MM;
const SIZE = 11;
const LEAD = 15;

export const PDF_LOSSY_NOTE =
  "Note: Some characters could not be shown in this PDF. Please use the print page for your language.";

export async function renderPdf(doc: DocModel): Promise<Uint8Array> {
  let lossy = false;
  const s = (x: string) => {
    const r = sanitize(x);
    if (r.lossy) lossy = true;
    return r.text;
  };

  const pdf = await PDFDocument.create();
  pdf.setTitle(s(doc.title));
  pdf.setProducer("Raasta");
  pdf.setCreator("Raasta");
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const pages: PDFPage[] = [];
  let page!: PDFPage;
  let y = 0;
  const textW = PAGE_W - 2 * MARGIN_X;

  const newPage = () => {
    page = pdf.addPage([PAGE_W, PAGE_H]);
    pages.push(page);
    y = PAGE_H - MARGIN_TOP;
  };
  newPage();

  const ensure = (h: number) => {
    if (y - h < MARGIN_BOTTOM) newPage();
  };

  const drawLines = (text: string, f: PDFFont, size: number, indent = 0, hang = 0) => {
    const ls = wrapText(text, f, size, textW - indent);
    ls.forEach((l, i) => {
      ensure(LEAD);
      y -= LEAD;
      page.drawText(l, { x: MARGIN_X + indent + (i > 0 ? hang : 0), y, size, font: f, color: rgb(0, 0, 0) });
    });
  };

  const gap = (h = 8) => { y -= h; };

  const block = (raw: string) => {
    const t = s(raw);
    if (t.startsWith("## ")) {
      gap(6);
      ensure(LEAD * 2);
      drawLines(t.slice(3), bold, SIZE + 1);
      return;
    }
    for (const part of t.split("\n")) {
      if (part.startsWith("- ")) drawLines(`-  ${part.slice(2)}`, font, SIZE, 10, 12);
      else drawLines(part, font, SIZE);
    }
  };

  // Title
  drawLines(s(doc.title), bold, 15);
  gap(10);

  // From, date, to
  const fromLines = [doc.from.name, doc.from.address, doc.from.phone ? `Phone: ${doc.from.phone}` : ""]
    .filter((x): x is string => !!x);
  if (fromLines.length) {
    drawLines("From:", bold, SIZE);
    fromLines.forEach((l) => drawLines(s(l), font, SIZE));
    gap();
  }
  drawLines(`Date: ${s(doc.date)}`, font, SIZE);
  gap();
  drawLines("To:", bold, SIZE);
  [doc.to.name, doc.to.address, doc.to.email ? `Email: ${doc.to.email}` : ""]
    .filter((x): x is string => !!x)
    .forEach((l) => drawLines(s(l), font, SIZE));
  gap();
  drawLines(`Subject: ${s(doc.subject)}`, bold, SIZE);
  gap();

  for (const p of doc.paragraphs) {
    block(p);
    gap(6);
  }

  if (doc.enclosures.length) {
    ensure(LEAD * 3);
    drawLines("Enclosures:", bold, SIZE);
    doc.enclosures.forEach((e, i) => drawLines(`${i + 1}. ${s(e)}`, font, SIZE, 10, 14));
    gap();
  }

  ensure(LEAD * (doc.signatureBlock.length + 1));
  gap(4);
  doc.signatureBlock.forEach((l) => {
    if (l === "") { y -= LEAD; return; }
    drawLines(s(l), font, SIZE);
  });

  if (lossy) {
    gap(10);
    drawLines(PDF_LOSSY_NOTE, font, 9);
  }

  // Footer on every page
  const footer = s(doc.footer);
  pages.forEach((p, i) => {
    const size = 8;
    const ls = wrapText(footer, font, size, textW);
    ls.forEach((l, j) => {
      p.drawText(l, { x: MARGIN_X, y: 14 * MM - j * 10, size, font, color: rgb(0.35, 0.35, 0.35) });
    });
    const label = `Page ${i + 1} of ${pages.length}`;
    p.drawText(label, {
      x: PAGE_W - MARGIN_X - font.widthOfTextAtSize(label, size),
      y: 14 * MM + 10,
      size, font, color: rgb(0.35, 0.35, 0.35),
    });
  });

  return pdf.save();
}
