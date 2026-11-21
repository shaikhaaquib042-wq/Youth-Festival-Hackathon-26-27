import assert from 'node:assert/strict';
import gazetteer from '../src/data/pune-gazetteer.json' with { type: 'json' };
import { classifyPost, matchPlaces } from '../src/engine/gazetteer.js';
import { deriveStatus } from '../src/engine/lifecycle.js';
import { makePin } from '../src/engine/pin.js';

const sample = 'Heavy waterlogging reported at Swargate chowk and Sinhagad Road, water knee deep, motorists advised to avoid. — Pune Traffic Police';
const matches = matchPlaces(sample, gazetteer);
assert.deepEqual(matches.map(({ name }) => name), ['Swargate', 'Sinhagad Road']);
assert.deepEqual(classifyPost(sample), {
  type: 'flood', depth: 'knee', depthKnown: true, closed: false, underpass: false,
});

// An imported post is never independent evidence for another report at the same spot.
const now = new Date();
const { lat, lng } = matches[0];
const pinData = { lat, lng, depth: 'knee', createdAt: now.toISOString() };
const pasted = makePin({ ...pinData, source: { kind: 'media', name: 'Pasted: Pune Traffic Police' } });
const citizen = makePin({ ...pinData, source: { kind: 'citizen', name: 'Citizen' } });
const config = { EXPIRY_MIN: { flood: 120 }, CLEAR_TAPS: 3, CONFIRM_TAPS: 3, CONFIRM_WINDOW_MIN: 30, CONFIRM_RADIUS_M: 500 };
const reports = [pasted, citizen];
for (const pin of reports) assert.equal(deriveStatus(pin, reports, now, config), 'unverified');

console.log('ALL PASTE TESTS PASSED');
