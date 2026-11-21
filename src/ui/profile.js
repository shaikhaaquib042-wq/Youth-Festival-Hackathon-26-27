// "Who are you?" → sets everything else automatically, so nobody sees "Commuter / Moderate work" dropdowns.
// Writes the shared keys read by cards, route check, pins and the heat shift; fires sajag:mode + sajag:profile.
export const WHO = [
  { id: 'rider',  icon: '🛵', key: 'who.rider',  userMode: 'rider',      workType: 'moderate', hazard: 'flood' },
  { id: 'worker', icon: '👷', key: 'who.worker', userMode: 'pedestrian', workType: 'heavy',    hazard: 'heat' },
  { id: 'walk',   icon: '🚶', key: 'who.walk',   userMode: 'pedestrian', workType: 'light',    hazard: 'flood' },
  { id: 'car',    icon: '🚗', key: 'who.car',    userMode: 'commuter',   workType: 'light',    hazard: 'flood' },
  { id: 'school', icon: '🚌', key: 'who.school', userMode: 'parent',     workType: 'light',    hazard: 'flood' },
];

const get = (k, d) => { try { return localStorage.getItem(k) ?? d; } catch { return d; } };
const set = (k, v) => { try { localStorage.setItem(k, v); } catch { /* private mode */ } };

export const currentWho = () => get('sajag.who', null);

/** Apply a profile. `switchHazard` moves the person to their main side (first run only). */
export function applyWho(id, { switchHazard = false } = {}) {
  const w = WHO.find((x) => x.id === id); if (!w) return;
  set('sajag.who', w.id);
  set('sajag.userMode', w.userMode);
  set('sajag.workType', w.workType);
  if (get('sajag.newToHeat', null) == null) set('sajag.newToHeat', '0');
  window.dispatchEvent(new CustomEvent('sajag:mode', { detail: { mode: w.userMode } }));
  window.dispatchEvent(new CustomEvent('sajag:profile', { detail: { userMode: w.userMode, workType: w.workType, newToHeat: get('sajag.newToHeat', '0') === '1' } }));
  if (switchHazard) window.dispatchEvent(new CustomEvent('sajag:set-hazard', { detail: { hazard: w.hazard } }));
}
