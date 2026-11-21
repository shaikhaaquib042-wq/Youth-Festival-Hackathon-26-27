// Advisory and Status Cards self-test (pure logic, no config.js import).
import assert from 'node:assert/strict';
import {
  ADVISORY_RULES,
  advise,
  computeFloodCardStatus,
  computeHeatCardStatus,
} from '../src/engine/advisory.js';

console.log('Running Sajag advisory and status card self-tests...');

// 1. Table structure check
assert.ok(Array.isArray(ADVISORY_RULES.rain), 'ADVISORY_RULES.rain is an array');
assert.ok(Array.isArray(ADVISORY_RULES.heat), 'ADVISORY_RULES.heat is an array');

// 2. advise() checks
const now = new Date('2026-11-21T14:30:00+05:30');

// Case A: Dry clear day, no pins
const dryAdvice = advise({
  cell: { current: { precipitation: 0, wind_gusts_10m: 10, temperature_2m: 28 }, hourly: { precipitation: [0], precipitation_probability: [10] } },
  pins: [],
  mode: 'commuter',
  now,
});
assert.deepEqual(dryAdvice, [{ key: 'advice.normalDay', vars: {} }]);

// Case B: Rain probability >= 50%
const probAdvice = advise({
  cell: { current: { precipitation: 0, wind_gusts_10m: 10, temperature_2m: 26 }, hourly: { precipitation: [0], precipitation_probability: [60] } },
  pins: [],
  mode: 'commuter',
  now,
});
assert.ok(probAdvice.some((a) => a.key === 'advice.umbrella'), 'Expected umbrella advice for prob >= 50%');

// Case C: Heavy rain (>= 2.5 mm/h or prob >= 80%)
const heavyAdvice = advise({
  cell: { current: { precipitation: 3.0, wind_gusts_10m: 15, temperature_2m: 24 }, hourly: { precipitation: [3.0], precipitation_probability: [85] } },
  pins: [],
  mode: 'commuter',
  now,
});
assert.ok(heavyAdvice.some((a) => a.key === 'advice.raincoat'), 'Expected raincoat for heavy rain');
assert.ok(heavyAdvice.some((a) => a.key === 'advice.waterproofBag'), 'Expected waterproof bag for heavy rain');

// Case D: High wind gusts (>= 40 km/h)
const windAdvice = advise({
  cell: { current: { precipitation: 0, wind_gusts_10m: 45, temperature_2m: 26 }, hourly: { precipitation: [0], precipitation_probability: [20] } },
  pins: [],
  mode: 'rider',
  now,
});
assert.ok(windAdvice.some((a) => a.key === 'advice.windRider'), 'Expected windRider advice for gusts >= 40');

// Case E: Ankle-deep flood pin nearby
const anklePin = {
  id: 'p1',
  type: 'flood',
  depth: 'ankle',
  status: 'confirmed',
  lat: 18.52,
  lng: 73.85,
  createdAt: '2026-11-21T14:00:00+05:30',
  confirmations: 3,
};
const ankleAdvice = advise({
  cell: { current: { precipitation: 0, wind_gusts_10m: 10, temperature_2m: 26 }, hourly: { precipitation_probability: [10] } },
  pins: [anklePin],
  mode: 'commuter',
  now,
});
assert.ok(ankleAdvice.some((a) => a.key === 'advice.gumboots'), 'Expected gumboots advice for ankle pin');

// Case F: Knee+ confirmed water replaces ALL gear advice with hard warning
const kneePin = {
  id: 'p2',
  type: 'flood',
  depth: 'knee',
  status: 'confirmed',
  lat: 18.52,
  lng: 73.85,
  createdAt: '2026-11-21T14:10:00+05:30',
  confirmations: 4,
};
const kneeAdvice = advise({
  cell: { current: { precipitation: 5.0, wind_gusts_10m: 45, temperature_2m: 24 }, hourly: { precipitation_probability: [90] } },
  pins: [anklePin, kneePin],
  mode: 'commuter',
  now,
});
assert.equal(kneeAdvice.length, 1);
assert.equal(kneeAdvice[0].key, 'advice.kneeWarning', 'Knee confirmed must replace all gear advice with hard warning');

// Case G: Heat rules
const heat38 = advise({
  cell: { current: { precipitation: 0, wind_gusts_10m: 5, temperature_2m: 38 }, hourly: { precipitation_probability: [0] } },
  pins: [],
  now,
});
assert.ok(heat38.some((a) => a.key === 'advice.heat37'));

const heat42 = advise({
  cell: { current: { precipitation: 0, wind_gusts_10m: 5, temperature_2m: 42 }, hourly: { precipitation_probability: [0] } },
  pins: [],
  now,
});
assert.ok(heat42.some((a) => a.key === 'advice.heat40'));

const heat46 = advise({
  cell: { current: { precipitation: 0, wind_gusts_10m: 5, temperature_2m: 46 }, hourly: { precipitation_probability: [0] } },
  pins: [],
  now,
});
assert.equal(heat46.length, 1);
assert.equal(heat46[0].key, 'advice.heat45', 'Extreme heat >= 45 must replace gear advice with stop-work health warning');

// 3. computeFloodCardStatus() checks
const userLoc = { lat: 18.5204, lng: 73.8567 };

// 3a. Clear conditions
const floodGreen = computeFloodCardStatus({
  pins: [],
  cell: { current: { precipitation: 0 }, hourly: { precipitation_probability: [10], precipitation: [0] } },
  userLoc,
  mode: 'commuter',
  now,
});
assert.equal(floodGreen.level, 'green');
assert.equal(floodGreen.actionKey, 'advice.normalDay');

// 3b. Rain expected nearby -> yellow
const floodRainExpected = computeFloodCardStatus({
  pins: [],
  cell: { current: { precipitation: 0 }, hourly: { precipitation_probability: [60], precipitation: [0] } },
  userLoc,
  mode: 'commuter',
  now,
});
assert.equal(floodRainExpected.level, 'yellow');

// 3c. Unverified report nearby -> yellow
const unverifiedPin = {
  id: 'uv1',
  type: 'flood',
  depth: 'ankle',
  status: 'unverified',
  lat: 18.521,
  lng: 73.857,
  createdAt: '2026-11-21T14:15:00+05:30',
};
const floodUnverified = computeFloodCardStatus({
  pins: [unverifiedPin],
  cell: { current: { precipitation: 0 }, hourly: { precipitation_probability: [10] } },
  userLoc,
  mode: 'commuter',
  now,
});
assert.equal(floodUnverified.level, 'yellow');
assert.equal(floodUnverified.actionKey, 'severity.yellow');

// 3d. Confirmed ankle-deep for commuter -> orange; for rider -> red
const confAnklePin = {
  id: 'ca1',
  type: 'flood',
  depth: 'ankle',
  status: 'confirmed',
  lat: 18.521,
  lng: 73.857,
  createdAt: '2026-11-21T14:10:00+05:30',
  confirmations: 2,
};
const floodCommuter = computeFloodCardStatus({
  pins: [confAnklePin],
  cell: null,
  userLoc,
  mode: 'commuter',
  now,
});
assert.equal(floodCommuter.level, 'orange');
assert.equal(floodCommuter.actionKey, 'severity.orange');

const floodRider = computeFloodCardStatus({
  pins: [confAnklePin],
  cell: null,
  userLoc,
  mode: 'rider',
  now,
});
assert.equal(floodRider.level, 'red', 'Rider mode shifts confirmed ankle-deep to red');
assert.equal(floodRider.actionKey, 'red.doNotEnter');

// 3e. Underpass rules: unconfirmed underpass -> orange; confirmed -> red
const unconfUnderpass = {
  id: 'up1',
  type: 'flood',
  depth: 'ankle',
  inUnderpass: true,
  status: 'unverified',
  lat: 18.521,
  lng: 73.857,
  createdAt: '2026-11-21T14:10:00+05:30',
};
const floodUnconfUp = computeFloodCardStatus({
  pins: [unconfUnderpass],
  cell: null,
  userLoc,
  mode: 'commuter',
  now,
});
assert.equal(floodUnconfUp.level, 'orange', 'Unconfirmed underpass must be orange');

const confUnderpass = {
  id: 'up2',
  type: 'flood',
  depth: 'ankle',
  inUnderpass: true,
  status: 'confirmed',
  lat: 18.521,
  lng: 73.857,
  createdAt: '2026-11-21T14:10:00+05:30',
  confirmations: 2,
};
const floodConfUp = computeFloodCardStatus({
  pins: [confUnderpass],
  cell: null,
  userLoc,
  mode: 'commuter',
  now,
});
assert.equal(floodConfUp.level, 'red', 'Confirmed underpass must be red');

// 4. computeHeatCardStatus() checks
// 4a. Mild weather -> green
const heatGreen = computeHeatCardStatus({
  cell: {
    current: { temperature_2m: 29.0, wet_bulb_temperature_2m: 16.0, shortwave_radiation: 500 },
    hourly: {
      time: ['2026-11-21T14:00', '2026-11-21T15:00', '2026-11-21T16:00'],
      temperature_2m: [29, 28, 27],
      wet_bulb_temperature_2m: [16, 15, 14],
      shortwave_radiation: [500, 300, 100],
    },
  },
  workType: 'moderate',
  newToHeat: false,
  isMaharashtra: true,
  now,
});
assert.equal(heatGreen.level, 'green');
assert.equal(heatGreen.showMhSop, false);

// 4b. Extreme heat in Pune (Maharashtra SOP test) -> Orange/Red
const heatHot = computeHeatCardStatus({
  cell: {
    current: { temperature_2m: 41.0, wet_bulb_temperature_2m: 28.0, shortwave_radiation: 800 },
    hourly: {
      time: ['2026-11-21T14:00', '2026-11-21T15:00', '2026-11-21T16:00', '2026-11-21T17:00'],
      temperature_2m: [41, 39, 36, 31],
      wet_bulb_temperature_2m: [28, 26, 22, 19],
      shortwave_radiation: [800, 600, 300, 50],
    },
  },
  workType: 'heavy',
  newToHeat: false,
  isMaharashtra: true,
  now: new Date('2026-11-21T14:00:00+05:30'),
});
assert.ok(heatHot.level === 'orange' || heatHot.level === 'red', 'Expected orange or red under high WBGT');
assert.equal(heatHot.showNdma, true);
assert.equal(heatHot.showMhSop, true, 'Maharashtra SOP must be active on orange/red');
// PRD §23: never show safe-again earlier than 16:00
if (heatHot.safeAgain?.at) {
  assert.ok(
    heatHot.safeAgain.at >= '16:00',
    `Safe-again time (${heatHot.safeAgain.at}) must never be earlier than 16:00 under MH SOP`,
  );
}

console.log('ALL ADVISORY TESTS PASSED');
