// ─────────────────────────────────────────────────────────────────────────────
// PIN CONTRACT (PRD §18) — FROZEN. Shared by orchestrator and worker.
// Do not change field names or enum values without agreement from BOTH sides.
// Adding optional fields is OK; announce it in the commit message.
// ─────────────────────────────────────────────────────────────────────────────

export const PIN_TYPES = ['flood', 'clog', 'hotspot', 'cooling'];
export const AMENITIES = ['water', 'shade', 'ors', 'clinic', 'toilet', 'cool_room']; // cooling pins only (PRD §21.5)
export const DEPTHS = ['none', 'ankle', 'knee', 'above_knee'];
export const CAUSES = ['rain', 'clogged_drain', 'nullah_overflow', 'river_dam', 'unknown'];
export const SOURCE_KINDS = ['official', 'news', 'citizen', 'social', 'seed'];
export const STATUSES = ['unverified', 'confirmed', 'stale', 'cleared'];

/** Trust tiers (§5): 1 OFFICIAL, 2 NEWS, 3 CITIZEN+PHOTO, 4 CITIZEN TEXT / SOCIAL. Seed hotspots use 0 (not a report). */
export const TIERS = { OFFICIAL: 1, NEWS: 2, CITIZEN_PHOTO: 3, CITIZEN_TEXT: 4, SEED: 0 };

/**
 * @typedef {Object} Pin
 * @property {string} id
 * @property {'flood'|'clog'|'hotspot'|'cooling'} type
 * @property {number} lat
 * @property {number} lng
 * @property {'none'|'ankle'|'knee'|'above_knee'} depth
 * @property {boolean} inUnderpass
 * @property {{bike:boolean, car:boolean}} passable
 * @property {'rain'|'clogged_drain'|'nullah_overflow'|'river_dam'|'unknown'} cause
 * @property {0|1|2|3|4} tier
 * @property {{kind:'official'|'news'|'citizen'|'social'|'seed', name:string, url:string|null}} source
 * @property {string|null} photo          dataURL
 * @property {string} createdAt           ISO timestamp (scenario clock in Scenario mode)
 * @property {number} confirmations
 * @property {number} clearedVotes
 * @property {'unverified'|'confirmed'|'stale'|'cleared'} status
 * @property {boolean} simulated          true for anything injected by Scenario mode
 * @property {string} [name]              optional place name (gazetteer / hotspot list)
 * @property {string[]} [amenities]       cooling pins: subset of AMENITIES
 */

const tierFor = (source, photo) =>
  source.kind === 'official' ? 1 :
  source.kind === 'news' ? 2 :
  source.kind === 'seed' ? 0 :
  source.kind === 'citizen' && photo ? 3 : 4;

/** Build a Pin with defaults. `source` and `createdAt` are mandatory — a pin without source + age is never shown. */
export function makePin(p) {
  if (!p.source?.kind || !p.source?.name) throw new Error('Pin needs source {kind,name}');
  const photo = p.photo ?? null;
  return {
    id: p.id ?? crypto.randomUUID(),
    type: p.type ?? 'flood',
    lat: p.lat,
    lng: p.lng,
    depth: p.depth ?? 'none',
    inUnderpass: p.inUnderpass ?? false,
    passable: p.passable ?? { bike: true, car: true },
    cause: p.cause ?? 'unknown',
    tier: p.tier ?? tierFor(p.source, photo),
    source: { url: null, ...p.source },
    photo,
    createdAt: p.createdAt ?? new Date().toISOString(),
    confirmations: p.confirmations ?? 0,
    clearedVotes: p.clearedVotes ?? 0,
    status: p.status ?? (p.source.kind === 'official' ? 'confirmed' : 'unverified'),
    simulated: p.simulated ?? false,
    ...(p.name ? { name: p.name } : {}),
    ...(p.amenities ? { amenities: p.amenities } : {}),
  };
}

/** Returns a list of problems; empty list = valid. */
export function validatePin(pin) {
  const errs = [];
  if (!PIN_TYPES.includes(pin.type)) errs.push('type');
  if (!Number.isFinite(pin.lat) || !Number.isFinite(pin.lng)) errs.push('lat/lng');
  if (!DEPTHS.includes(pin.depth)) errs.push('depth');
  if (!CAUSES.includes(pin.cause)) errs.push('cause');
  if (!SOURCE_KINDS.includes(pin.source?.kind) || !pin.source?.name) errs.push('source');
  if (!STATUSES.includes(pin.status)) errs.push('status');
  if (Number.isNaN(Date.parse(pin.createdAt))) errs.push('createdAt');
  if (pin.amenities && !pin.amenities.every((a) => AMENITIES.includes(a))) errs.push('amenities');
  return errs;
}
