// Place-name matcher (PRD §5): free text (e.g. a Traffic Police post) → named places from the city gazetteer.
// Case-insensitive, matches the name or any alias as a whole phrase; no ML. One advisory naming 13 junctions → 13 places.

const norm = (s) => ` ${String(s).toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim()} `;

/**
 * @param {string} text
 * @param {Array<{name:string, aliases?:string[], lat:number, lng:number}>} gazetteer
 * @returns {Array<{name, lat, lng, matched:string}>} unique places, in order of first appearance in the text
 */
export function matchPlaces(text, gazetteer) {
  const hay = norm(text);
  const found = [];
  for (const p of gazetteer) {
    const terms = [p.name, ...(p.aliases ?? [])].map(norm).filter((x) => x.trim().length >= 3);
    let best = -1, term = null;
    for (const tm of terms) {
      const i = hay.indexOf(tm);
      if (i >= 0 && (best < 0 || i < best)) { best = i; term = tm.trim(); }
    }
    if (best >= 0) found.push({ ...p, matched: term, at: best });
  }
  // Drop places whose matched term is contained in a longer match at the same spot ("Sinhagad Road" vs "Road").
  return found
    .filter((f) => !found.some((g) => g !== f && g.matched.length > f.matched.length && g.matched.includes(f.matched) && Math.abs(g.at - f.at) <= g.matched.length))
    .sort((a, b) => a.at - b.at)
    .map(({ at, ...rest }) => rest);
}

/**
 * Guess what a post / spoken report says about a place (simple keyword rules; en + mr + hi + kn + te).
 * `depthKnown` is false when no depth word was found (depth then defaults to 'knee' for pasted posts;
 * voice reports leave it for the user to pick). kn / te words are machine-written — native review pending.
 */
export function classifyPost(text) {
  const s = String(text).toLowerCase();
  const has = (...w) => w.some((x) => s.includes(x));
  const above = has('waist', 'above knee', 'chest', 'कंबर', 'कमर', 'छाती', 'ಸೊಂಟ', 'ಎದೆ', 'నడుము', 'ఛాతీ');
  const knee = has('knee', 'need deep', 'गुडघ', 'गुढघ', 'गुद्दा', 'गुडगा', 'घुटन', 'ಮೊಣಕಾಲು', 'ಮಂಡಿ', 'మోకాలు', 'మోకాళ్ల');
  const ankle = has('ankle', 'घोट', 'टखन', 'ಪಾದ', 'ಕಣಕಾಲು', 'చీలమండ', 'పాదం');
  return {
    type: has('chamber', 'drain', 'clog', 'choked', 'gutter', 'गटार', 'चेंबर', 'नाली', 'नाला', 'ಚರಂಡಿ', 'ಮೋರಿ', 'డ్రైనేజీ', 'మురుగు') ? 'clog' : 'flood',
    closed: has('closed', 'diverted', 'बंद', 'वळव', 'ಬಂದ್', 'ಮುಚ್ಚ', 'మూసి', 'బంద్'),
    underpass: has('underpass', 'subway', 'भुयारी', 'अंडरपास', 'ಅಂಡರ್‌ಪಾಸ್', 'ಅಂಡರ್ಪಾಸ್', 'అండర్‌పాస్', 'అండర్పాస్'),
    depth: above ? 'above_knee' : knee ? 'knee' : ankle ? 'ankle' : 'knee',
    depthKnown: above || knee || ankle,
  };
}
