// Depth level SVG icons (Ankle · Knee · Waist/torso).
// Exported for report sheet, pin popups, and route panel reuse.
export const DEPTH_EMOJI = {
  ankle: '🦶',
  knee: '🦵',
  above_knee: '🧍',
};

/**
 * Generates an inline SVG representing water depth on a standing person.
 * @param {'ankle'|'knee'|'above_knee'} depth
 * @param {number} size Width & height in px
 * @returns {string} Inline SVG string with emoji fallback accessibility
 */
export function depthIcon(depth, size = 32) {
  const emoji = DEPTH_EMOJI[depth] || '🧍';

  let waterY = 27;
  let waveCurve = 'M2 27 Q9 25.5 16 27 T30 27';

  if (depth === 'knee') {
    waterY = 23;
    waveCurve = 'M2 23 Q9 21.5 16 23 T30 23';
  } else if (depth === 'above_knee') {
    waterY = 15;
    waveCurve = 'M2 15 Q9 13.5 16 15 T30 15';
  } else if (depth !== 'ankle') {
    // Unknown depth fallback
    return `<span class="depth-emoji" title="${depth}" style="font-size:${size * 0.8}px;line-height:1;">${emoji}</span>`;
  }

  const waterHeight = 32 - waterY;

  return `
    <svg class="depth-svg depth-svg-${depth}" width="${size}" height="${size}" viewBox="0 0 32 32" aria-hidden="true" style="display:inline-block;vertical-align:middle;flex-shrink:0;">
      <!-- Person Figure -->
      <circle cx="16" cy="6" r="3" fill="#374151" />
      <rect x="13.5" y="10" width="5" height="9" rx="1.5" fill="#374151" />
      <path d="M13 11 L9.5 18 M19 11 L22.5 18" stroke="#374151" stroke-width="1.8" stroke-linecap="round" />
      <rect x="13.2" y="19" width="2.3" height="10" rx="1.1" fill="#374151" />
      <rect x="16.5" y="19" width="2.3" height="10" rx="1.1" fill="#374151" />
      <!-- Water level -->
      <rect x="2" y="${waterY}" width="28" height="${waterHeight}" rx="1" fill="#1c7ed6" fill-opacity="0.65" />
      <path d="${waveCurve}" stroke="#1864ab" stroke-width="1.6" fill="none" stroke-linecap="round" />
    </svg>
    <span class="depth-fallback-emoji" style="display:none;">${emoji}</span>
  `.trim();
}
