// Pin lifecycle + severity (PRD §5, §6.4, §9, §22.3). Pure functions — always pass `now` (scenario clock safe).
import { distM } from './geo.js';

const ageMin = (pin, now) => (now - Date.parse(pin.createdAt)) / 60000;

/**
 * Derive the live status of a report from its own data and the other reports around it.
 * unverified → confirmed (official/news tier, or an independent report nearby in the window, or enough "still there" taps)
 * → stale (past expiry) ; cleared (enough "cleared" taps outweighing "still").
 * Seed hotspots / cooling points keep their own status.
 */
export function deriveStatus(pin, all, now, cfg) {
  if (pin.type === 'hotspot') return 'unverified';
  if (pin.clearedVotes >= cfg.CLEAR_TAPS && pin.clearedVotes > pin.confirmations) return 'cleared';
  const expiry = cfg.EXPIRY_MIN[pin.type] ?? 120;
  if (ageMin(pin, now) > expiry) return 'stale';
  // Pasted text has no independently verifiable source or timestamp.
  if (pin.source?.kind === 'media') return 'unverified';
  if (pin.tier === 1 || pin.tier === 2) return 'confirmed';
  if (pin.confirmations >= cfg.CONFIRM_TAPS) return 'confirmed';
  const corroborated = all.some((o) => o.id !== pin.id && o.type === pin.type && o.status !== 'cleared' && o.type !== 'hotspot' && o.source?.kind !== 'media'
    && Math.abs(Date.parse(o.createdAt) - Date.parse(pin.createdAt)) <= cfg.CONFIRM_WINDOW_MIN * 60000
    && distM(o, pin) <= cfg.CONFIRM_RADIUS_M);
  return corroborated ? 'confirmed' : 'unverified';
}

/** Minutes left before expiry (for the countdown), or null. */
export function minutesLeft(pin, now, cfg) {
  if (pin.type === 'hotspot') return null;
  return Math.max(0, Math.round((cfg.EXPIRY_MIN[pin.type] ?? 120) - ageMin(pin, now)));
}

/**
 * Severity of ONE pin for the flood ladder: 'green'|'yellow'|'orange'|'red'|'grey'|'none'.
 * mode = 'commuter'|'rider'|'parent'|'pedestrian' (rider: confirmed ankle-deep → red).
 */
export function pinSeverity(pin, { mode = 'commuter', heavyRain = false } = {}) {
  if (pin.status === 'cleared') return 'none';
  if (pin.type === 'hotspot') return 'grey';
  if (pin.type === 'cooling') return 'none';
  if (pin.status === 'stale') return 'grey';
  const confirmed = pin.status === 'confirmed';
  if (pin.type === 'clog') return heavyRain ? 'orange' : 'yellow';
  // flood
  if (pin.inUnderpass) return confirmed ? 'red' : 'orange';
  if (!confirmed) return 'yellow';
  if (pin.depth === 'knee' || pin.depth === 'above_knee') return 'red';
  if (pin.depth === 'ankle') return mode === 'rider' ? 'red' : 'orange';
  return 'yellow';
}

const RANK = { none: 0, grey: 0, green: 1, yellow: 2, orange: 3, red: 4 };
export const worst = (levels) => levels.reduce((a, b) => (RANK[b] > RANK[a] ? b : a), 'green');
