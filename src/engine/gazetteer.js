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

/** Guess what a post says about a place (very simple keyword rules; English + Marathi + Hindi). */
export function classifyPost(text) {
  const s = String(text).toLowerCase();
  const has = (...w) => w.some((x) => s.includes(x));
  return {
    type: has('chamber', 'drain', 'clog', 'choked', 'gutter', 'गटार', 'चेंबर', 'नाली') ? 'clog' : 'flood',
    closed: has('closed', 'diverted', 'बंद', 'वळव'),
    underpass: has('underpass', 'subway', 'भुयारी', 'अंडरपास'),
    depth: has('waist', 'above knee', 'chest') ? 'above_knee' : has('knee', 'गुडघ') ? 'knee' : has('ankle', 'घोट') ? 'ankle' : 'knee',
  };
}
