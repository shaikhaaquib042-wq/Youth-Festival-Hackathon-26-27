/* Small hand-drawn style illustrations. Decorative only (aria-hidden). Palette from docs/DESIGN.md. */

export function TellIllo() {
  return (
    <svg viewBox="0 0 160 120" aria-hidden="true" className="illo">
      <ellipse cx="80" cy="110" rx="56" ry="6" fill="#1D2B22" opacity=".07" />
      <path d="M26 22 Q26 10 40 10 H120 Q134 10 134 22 V66 Q134 78 120 78 H70 L48 98 L52 78 H40 Q26 78 26 66 Z" fill="#FFF5EB" stroke="#E56420" strokeWidth="3.5" strokeLinejoin="round" />
      <path className="illo-line l1" d="M44 32 H112" stroke="#F57A2F" strokeWidth="6" strokeLinecap="round" />
      <path className="illo-line l2" d="M44 46 H100" stroke="#FFB27A" strokeWidth="6" strokeLinecap="round" />
      <path className="illo-line l3" d="M44 60 H84" stroke="#FFD2AE" strokeWidth="6" strokeLinecap="round" />
      <circle className="illo-dot" cx="126" cy="14" r="9" fill="#2D7341" />
    </svg>
  );
}

export function DoorIllo() {
  return (
    <svg viewBox="0 0 160 120" aria-hidden="true" className="illo">
      <ellipse cx="80" cy="110" rx="56" ry="6" fill="#1D2B22" opacity=".07" />
      <path d="M40 106 V38 Q40 14 80 14 Q120 14 120 38 V106 Z" fill="#E9F6EC" stroke="#2D7341" strokeWidth="3.5" />
      <path d="M56 106 V48 Q56 30 80 30 Q104 30 104 48 V106 Z" fill="#FFE6A8" />
      <g className="illo-door">
        <path d="M56 106 V48 Q56 30 80 30 Q104 30 104 48 V106 Z" fill="#2D7341" />
        <circle cx="96" cy="72" r="3.5" fill="#FFFFFF" />
      </g>
      <path d="M30 106 H130" stroke="#8FB57F" strokeWidth="4" strokeLinecap="round" />
      <path className="illo-pin" d="M80 4 C70 -8 68 -12 68 -17 A12 12 0 0 1 92 -17 C92 -12 90 -8 80 4 Z" fill="#E56420" transform="translate(0 2)" />
    </svg>
  );
}

export function SendIllo() {
  return (
    <svg viewBox="0 0 160 120" aria-hidden="true" className="illo">
      <ellipse cx="80" cy="110" rx="56" ry="6" fill="#1D2B22" opacity=".07" />
      <g className="illo-letter">
        <rect x="30" y="34" width="100" height="66" rx="14" fill="#FFFFFF" stroke="#1F3A8A" strokeWidth="3.5" />
        <path d="M32 40 L80 74 L128 40" fill="none" stroke="#1F3A8A" strokeWidth="3.5" strokeLinejoin="round" />
        <rect x="104" y="44" width="18" height="20" rx="5" fill="#FF8C42" />
      </g>
      <path className="illo-trail" d="M8 30 Q20 22 30 28" stroke="#F57A2F" strokeWidth="4" strokeLinecap="round" fill="none" strokeDasharray="2 8" />
      <circle cx="138" cy="24" r="12" fill="#A2E0B4" />
      <path d="M132 24 L137 29 L145 19" fill="none" stroke="#2D7341" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function PeaceIllo() {
  return (
    <svg viewBox="0 0 260 200" aria-hidden="true" className="illo illo-peace">
      <circle cx="130" cy="96" r="86" fill="#FFF5EB" />
      <circle className="float-a" cx="40" cy="40" r="10" fill="#A2E0B4" />
      <circle className="float-b" cx="222" cy="52" r="7" fill="#FFB27A" />
      <ellipse cx="130" cy="186" rx="90" ry="8" fill="#1D2B22" opacity=".07" />
      {/* two people meeting halfway */}
      <g>
        <circle cx="78" cy="70" r="18" fill="#F2C9A0" />
        <path d="M60 64 Q78 44 96 64 Q88 56 78 57 Q68 56 60 64 Z" fill="#1D2B22" />
        <path d="M48 182 V124 Q48 98 78 98 Q104 98 108 120 L126 132" fill="#2D7341" stroke="#2D7341" strokeWidth="4" strokeLinejoin="round" />
      </g>
      <g>
        <circle cx="182" cy="70" r="18" fill="#D9A47A" />
        <path d="M164 70 Q166 48 182 50 Q200 50 200 70 Q196 58 182 58 Q170 58 164 70 Z" fill="#3B4A40" />
        <path d="M212 182 V124 Q212 98 182 98 Q156 98 152 120 L134 132" fill="#E56420" stroke="#E56420" strokeWidth="4" strokeLinejoin="round" />
      </g>
      <circle cx="130" cy="134" r="12" fill="#FFD27A" stroke="#FFFFFF" strokeWidth="3" />
      <path className="float-c" d="M130 20 C122 10 118 6 118 1 A6 6 0 0 1 130 -2 A6 6 0 0 1 142 1 C142 6 138 10 130 20 Z" fill="#E56420" transform="translate(0 18)" />
    </svg>
  );
}
