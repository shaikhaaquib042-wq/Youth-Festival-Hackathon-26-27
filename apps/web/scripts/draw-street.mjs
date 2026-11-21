// Generates apps/web/public/img/street-of-doors.svg, the "street of doors" signature illustration.
// Run: node apps/web/scripts/draw-street.mjs
// Contract used by src/lib/doors.ts: each building is <g id="door-<key>" data-door="<key>">, its door panel has class "door",
// and each building has a dotted path <path data-path-for="<key>"> from the walker to its door.
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const W = 1200, H = 330, ROAD = 292;
const doors = [
  { key: "police", sign: "Police", body: "#E8EEF9", trim: "#1F3A8A", roof: "flat" },
  { key: "consumer", sign: "Consumer", body: "#FFF1E2", trim: "#F57A2F", roof: "pediment" },
  { key: "labour", sign: "Labour", body: "#EAF3E5", trim: "#3D8854", roof: "factory" },
  { key: "ward", sign: "Ward office", body: "#FFF8EC", trim: "#E56420", roof: "dome" },
  { key: "legal_aid", sign: "Legal aid", body: "#E9F6EC", trim: "#2D7341", roof: "dome-flag" },
  { key: "bank", sign: "Bank", body: "#F3EFE6", trim: "#8A6D3B", roof: "pediment-coin" },
  { key: "post", sign: "Post", body: "#FDEDEA", trim: "#C0392B", roof: "arch" },
];

const X0 = 132, STEP = 150, BW = 124, TOP = 132, BH = ROAD - TOP; // building box
const r = (n) => Math.round(n * 10) / 10;

function roof(kind, trim, w) {
  const c = w / 2;
  switch (kind) {
    case "flat":
      return `<rect x="-6" y="-14" width="${w + 12}" height="18" rx="9" fill="${trim}"/>
      <rect x="${c - 10}" y="-30" width="20" height="16" rx="6" fill="#FFFFFF" stroke="${trim}" stroke-width="3"/>
      <circle class="beacon" cx="${c}" cy="-22" r="4" fill="#E56420"/>`;
    case "pediment":
      return `<path d="M-8 4 Q${c} -46 ${w + 8} 4 Z" fill="${trim}"/>
      <path d="M8 2 Q${c} -30 ${w - 8} 2" fill="none" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round" opacity=".7"/>`;
    case "pediment-coin":
      return `<path d="M-8 4 Q${c} -46 ${w + 8} 4 Z" fill="${trim}"/>
      <circle cx="${c}" cy="-14" r="10" fill="#FFD27A" stroke="#FFFFFF" stroke-width="3"/>`;
    case "factory":
      return `<path d="M-4 6 L-4 -10 Q8 -26 24 -10 Q36 -26 52 -10 Q64 -26 80 -10 Q92 -26 108 -10 L${w + 4} -10 L${w + 4} 6 Z" fill="${trim}"/>
      <rect x="${w - 30}" y="-52" width="16" height="44" rx="8" fill="${trim}"/>
      <circle class="smoke" cx="${w - 22}" cy="-62" r="7" fill="#DDE7D8"/>
      <circle class="smoke smoke-2" cx="${w - 14}" cy="-76" r="9" fill="#E9F0E5"/>`;
    case "dome":
      return `<path d="M-6 6 Q-6 -10 10 -10 L${w - 10} -10 Q${w + 6} -10 ${w + 6} 6 Z" fill="${trim}"/>
      <path d="M${c - 30} -10 Q${c} -58 ${c + 30} -10 Z" fill="${trim}"/>
      <circle cx="${c}" cy="-50" r="5" fill="#FFD27A"/>`;
    case "dome-flag":
      return `<path d="M-6 6 Q-6 -10 10 -10 L${w - 10} -10 Q${w + 6} -10 ${w + 6} 6 Z" fill="${trim}"/>
      <path d="M${c - 34} -10 Q${c} -62 ${c + 34} -10 Z" fill="${trim}"/>
      <line x1="${c}" y1="-48" x2="${c}" y2="-86" stroke="#3B4A40" stroke-width="3" stroke-linecap="round"/>
      <g class="flag"><path d="M${c} -86 Q${c + 14} -92 ${c + 26} -84 Q${c + 14} -78 ${c} -72 Z" fill="#FF8C42"/>
      <path d="M${c} -79 Q${c + 13} -85 ${c + 26} -77" fill="none" stroke="#FFFFFF" stroke-width="3"/></g>`;
    case "arch":
      return `<path d="M-6 8 Q${c} -50 ${w + 6} 8 Z" fill="${trim}"/>
      <rect x="${w + 6}" y="${BH - 46}" width="20" height="46" rx="10" fill="#C0392B"/>
      <rect x="${w + 9}" y="${BH - 38}" width="14" height="5" rx="2.5" fill="#FFFFFF" opacity=".85"/>`;
  }
  return "";
}

function building(d, i) {
  const x = X0 + i * STEP;
  const c = BW / 2;
  const dw = 42, dh = 66, dx = c - dw / 2, dy = BH - dh;
  return `
  <g id="door-${d.key}" data-door="${d.key}" class="bld" transform="translate(${x} ${TOP})">
    <ellipse cx="${c}" cy="${BH + 4}" rx="${BW / 2 + 10}" ry="7" fill="#1D2B22" opacity=".08"/>
    <rect x="0" y="0" width="${BW}" height="${BH}" rx="20" fill="${d.body}" stroke="${d.trim}" stroke-width="3"/>
    ${roof(d.roof, d.trim, BW)}
    <rect x="12" y="16" width="${BW - 24}" height="28" rx="14" fill="#FFFFFF" stroke="${d.trim}" stroke-width="2.5"/>
    <text x="${c}" y="35.5" text-anchor="middle" font-family="'Baloo 2','Nunito',sans-serif" font-weight="700" font-size="15" fill="#1D2B22">${d.sign}</text>
    <rect x="16" y="58" width="26" height="26" rx="10" fill="#FFFFFF" stroke="${d.trim}" stroke-width="2.5"/>
    <rect x="${BW - 42}" y="58" width="26" height="26" rx="10" fill="#FFFFFF" stroke="${d.trim}" stroke-width="2.5"/>
    <path d="M${dx - 6} ${BH} L${dx - 6} ${dy + 18} Q${dx - 6} ${dy - 6} ${c} ${dy - 6} Q${dx + dw + 6} ${dy - 6} ${dx + dw + 6} ${dy + 18} L${dx + dw + 6} ${BH} Z" fill="${d.trim}" opacity=".22"/>
    <path class="door-glow" d="M${dx} ${BH} L${dx} ${dy + 20} Q${dx} ${dy} ${c} ${dy} Q${dx + dw} ${dy} ${dx + dw} ${dy + 20} L${dx + dw} ${BH} Z" fill="#FFE6A8"/>
    <g class="door">
      <path d="M${dx} ${BH} L${dx} ${dy + 20} Q${dx} ${dy} ${c} ${dy} Q${dx + dw} ${dy} ${dx + dw} ${dy + 20} L${dx + dw} ${BH} Z" fill="${d.trim}"/>
      <circle cx="${dx + dw - 9}" cy="${dy + dh / 2 + 6}" r="3.2" fill="#FFFFFF"/>
    </g>
    <g class="pin" transform="translate(${c} -${d.roof.startsWith("dome") ? 104 : 74})">
      <path d="M0 26 C-12 12 -15 6 -15 -1 A15 15 0 0 1 15 -1 C15 6 12 12 0 26 Z" fill="#E56420"/>
      <circle cx="0" cy="-1" r="6" fill="#FFFFFF"/>
    </g>
  </g>`;
}

function path(i) {
  const doorX = X0 + i * STEP + BW / 2;
  const sx = 62, sy = ROAD + 14;
  return `<path data-path-for="${doors[i].key}" d="M${sx} ${sy} C${sx + 60} ${sy + 14}, ${r(doorX - 90)} ${sy + 14}, ${r(doorX - 20)} ${sy + 4} Q${doorX} ${sy} ${doorX} ${ROAD + 2}"/>`;
}

const tree = (x, s = 1) => `<g class="tree" transform="translate(${x} ${ROAD}) scale(${s})">
    <rect x="-4" y="-40" width="8" height="40" rx="4" fill="#8A6D3B"/>
    <circle cx="0" cy="-54" r="22" fill="#8FB57F"/><circle cx="-14" cy="-42" r="14" fill="#7AA86B"/><circle cx="14" cy="-44" r="15" fill="#A8CB98"/></g>`;

const cloud = (x, y, s, cls) => `<g class="cloud ${cls}" transform="translate(${x} ${y}) scale(${s})">
    <path d="M0 20 Q0 0 22 2 Q30 -14 50 -6 Q70 -16 80 4 Q100 4 98 20 Z" fill="#FFFFFF"/></g>`;

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="A street of offices: police, consumer commission, labour office, ward office, legal aid, bank and post office">
  <g class="sky">
    <g class="sun" transform="translate(1080 64)"><circle r="30" fill="#FFD27A"/>
      <g class="rays" stroke="#FFD27A" stroke-width="5" stroke-linecap="round">
        <line x1="0" y1="-44" x2="0" y2="-54"/><line x1="0" y1="44" x2="0" y2="54"/><line x1="-44" y1="0" x2="-54" y2="0"/><line x1="44" y1="0" x2="54" y2="0"/>
        <line x1="31" y1="31" x2="38" y2="38"/><line x1="-31" y1="31" x2="-38" y2="38"/><line x1="31" y1="-31" x2="38" y2="-38"/><line x1="-31" y1="-31" x2="-38" y2="-38"/></g></g>
    ${cloud(90, 40, 0.9, "c1")}${cloud(520, 22, 0.7, "c2")}${cloud(820, 56, 0.8, "c3")}
  </g>
  <path d="M0 210 Q150 150 320 196 T640 184 T960 192 T1200 170 L1200 ${H} L0 ${H} Z" fill="#E6EFE2"/>
  <path d="M0 240 Q200 200 420 236 T820 228 T1200 222 L1200 ${H} L0 ${H} Z" fill="#D3E3CB"/>
  ${tree(100, 0.78)}${tree(1188, 0.7)}
  <rect x="0" y="${ROAD}" width="${W}" height="${H - ROAD}" fill="#F4E9D8"/>
  <path d="M0 ${ROAD} L${W} ${ROAD}" stroke="#E2D3BC" stroke-width="3"/>
  ${doors.map(building).join("")}
  <g class="paths" fill="none" stroke="#E56420" stroke-width="4" stroke-linecap="round" stroke-dasharray="2 11">
    ${doors.map((_, i) => path(i)).join("\n    ")}
  </g>
  <g class="walker" transform="translate(46 ${ROAD + 10})">
    <ellipse cx="0" cy="16" rx="14" ry="4" fill="#1D2B22" opacity=".12"/>
    <path d="M-11 14 Q-11 -6 0 -6 Q11 -6 11 14 Z" fill="#2D7341"/>
    <circle cx="0" cy="-16" r="9" fill="#F2C9A0"/>
    <path d="M-9 -19 Q0 -32 9 -19 Q4 -23 0 -22 Q-4 -23 -9 -19 Z" fill="#1D2B22"/>
  </g>
</svg>
`;

const out = fileURLToPath(new URL("../public/img/street-of-doors.svg", import.meta.url));
writeFileSync(out, svg);
console.log("wrote", out, svg.length, "bytes");
