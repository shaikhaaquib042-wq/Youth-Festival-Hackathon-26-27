import type { DocModel } from "../model";

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

interface FontSpec { noto: string; baloo?: string }

const FONTS: Record<string, FontSpec> = {
  en: { noto: "Noto Sans" },
  hi: { noto: "Noto Sans Devanagari", baloo: "Baloo 2" },
  mr: { noto: "Noto Sans Devanagari", baloo: "Baloo 2" },
  bn: { noto: "Noto Sans Bengali", baloo: "Baloo Da 2" },
  ta: { noto: "Noto Sans Tamil", baloo: "Baloo Thambi 2" },
  te: { noto: "Noto Sans Telugu", baloo: "Baloo Tammudu 2" },
  kn: { noto: "Noto Sans Kannada", baloo: "Baloo Tamma 2" },
  ml: { noto: "Noto Sans Malayalam", baloo: "Baloo Chettan 2" },
  gu: { noto: "Noto Sans Gujarati", baloo: "Baloo Bhai 2" },
  pa: { noto: "Noto Sans Gurmukhi", baloo: "Baloo Paaji 2" },
  or: { noto: "Noto Sans Oriya", baloo: "Baloo Bhaina 2" },
  ur: { noto: "Noto Naskh Arabic" },
};

function fam(name: string): string {
  return `family=${name.replace(/ /g, "+")}:wght@400;700`;
}

function para(raw: string): string {
  if (raw.startsWith("## ")) return `<h2>${escapeHtml(raw.slice(3))}</h2>`;
  const parts = raw.split("\n");
  const out: string[] = [];
  let list: string[] = [];
  const flush = () => {
    if (list.length) { out.push(`<ul>${list.join("")}</ul>`); list = []; }
  };
  for (const p of parts) {
    if (p.startsWith("- ")) list.push(`<li>${escapeHtml(p.slice(2))}</li>`);
    else { flush(); out.push(`<p>${escapeHtml(p)}</p>`); }
  }
  flush();
  return out.join("");
}

/** A complete, escaped, print-ready HTML page (A4). Safe to serve for any language. */
export function renderPrintHtml(doc: DocModel): string {
  const spec = FONTS[doc.lang] ?? FONTS.en;
  const dir = doc.lang === "ur" ? "rtl" : "ltr";
  const families = [spec.noto, spec.baloo].filter((x): x is string => !!x).map(fam).join("&amp;");
  const stack = [spec.noto, spec.baloo, "Noto Sans", "Arial", "sans-serif"]
    .filter((x): x is string => !!x)
    .map((f) => `"${f}"`)
    .join(", ");
  const fromLines = [doc.from.name, doc.from.address, doc.from.phone ? `Phone: ${doc.from.phone}` : ""]
    .filter((x): x is string => !!x);
  const toLines = [doc.to.name, doc.to.address, doc.to.email ? `Email: ${doc.to.email}` : ""]
    .filter((x): x is string => !!x);
  const lines = (a: string[]) => a.map((l) => `<div>${escapeHtml(l)}</div>`).join("");

  return `<!doctype html>
<html lang="${escapeHtml(doc.lang)}" dir="${dir}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>${escapeHtml(doc.title)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?${families}&amp;display=swap">
<style>
@page { size: A4; margin: 20mm 18mm 22mm 18mm; }
* { box-sizing: border-box; }
body { margin: 0; background: #f4f4f4; color: #111; font-family: ${stack}; font-size: 12pt; line-height: 1.55; }
.bar { position: sticky; top: 0; background: #fff; border-bottom: 1px solid #ccc; padding: 10px 16px; font-size: 11pt; }
.bar button { font: inherit; font-weight: 700; padding: 10px 16px; border: 0; border-radius: 6px; background: #1d4ed8; color: #fff; cursor: pointer; }
.bar p { margin: 6px 0 0; color: #333; }
.sheet { max-width: 210mm; margin: 12px auto; background: #fff; padding: 20mm 18mm; }
h1 { font-size: 16pt; margin: 0 0 12pt; }
h2 { font-size: 12.5pt; margin: 14pt 0 4pt; }
p { margin: 0 0 8pt; white-space: pre-wrap; overflow-wrap: anywhere; }
ul, ol { margin: 0 0 8pt; padding-inline-start: 20pt; }
.block { margin-bottom: 10pt; }
.label { font-weight: 700; }
.sig div { min-height: 1.4em; }
.foot { margin-top: 24pt; padding-top: 8pt; border-top: 1px solid #999; font-size: 9pt; color: #444; }
@media print {
  body { background: #fff; }
  .bar { display: none; }
  .sheet { margin: 0; padding: 0; max-width: none; }
  h1, h2 { break-after: avoid; }
}
</style>
</head>
<body>
<div class="bar">
<button type="button" onclick="window.print()">Print or save as PDF</button>
<p>If the button does not work, use your browser menu and choose Print, then Save as PDF.</p>
<noscript><p>Your browser has scripts turned off. Use your browser menu and choose Print, then Save as PDF.</p></noscript>
</div>
<main class="sheet">
<h1>${escapeHtml(doc.title)}</h1>
${fromLines.length ? `<div class="block"><div class="label">From:</div>${lines(fromLines)}</div>` : ""}
<div class="block"><span class="label">Date:</span> ${escapeHtml(doc.date)}</div>
<div class="block"><div class="label">To:</div>${lines(toLines)}</div>
<div class="block"><span class="label">Subject: ${escapeHtml(doc.subject)}</span></div>
${doc.paragraphs.map(para).join("\n")}
${doc.enclosures.length ? `<h2>Enclosures</h2><ol>${doc.enclosures.map((e) => `<li>${escapeHtml(e)}</li>`).join("")}</ol>` : ""}
<div class="sig block">${doc.signatureBlock.map((l) => `<div>${escapeHtml(l)}</div>`).join("")}</div>
<div class="foot">${escapeHtml(doc.footer)}</div>
</main>
</body>
</html>
`;
}
