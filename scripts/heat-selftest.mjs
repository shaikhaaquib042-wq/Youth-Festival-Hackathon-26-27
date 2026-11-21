/**
 * Standalone self-test script for Sajag heat calculation engine.
 * Run with: node scripts/heat-selftest.mjs
 */

import assert from 'node:assert/strict';
import {
  DEFAULT_CFG,
  estimateWBGT,
  WORK_REST,
  assessWork,
  safeAgainTime,
  RED_FLAGS,
  WARNING_SIGNS,
  triage,
} from '../src/heat/index.js';

console.log('Running Sajag heat calculation engine self-tests...\n');

// --------------------------------------------------------------------------
// 1. WBGT Math
// --------------------------------------------------------------------------
console.log('1. Testing WBGT math...');

// Shade calculation without solar add (sr <= 600)
{
  const res = estimateWBGT({ t: 30.0, tw: 20.0, sr: 500 });
  // shade = 0.7 * 20 + 0.3 * 30 = 14 + 9 = 23.0
  assert.equal(res.shade, 23.0, 'WBGT shade should be 23.0');
  assert.equal(res.inSun, false, 'inSun should be false when sr <= 600');
  assert.equal(res.sun, 23.0, 'WBGT sun should equal shade when not in strong sun');
}

// Sun calculation with solar add (sr > 600)
{
  const res = estimateWBGT({ t: 30.0, tw: 20.0, sr: 800 });
  assert.equal(res.shade, 23.0, 'WBGT shade should be 23.0');
  assert.equal(res.inSun, true, 'inSun should be true when sr > 600');
  assert.equal(res.sun, 25.0, 'WBGT sun should be shade + 2.0 (25.0)');
}

// PRD §21.1 sanity check: Pune dry November noon (T 29.9, Tw 16.1)
{
  // 0.7 * 16.1 + 0.3 * 29.9 = 11.27 + 8.97 = 20.24 -> 20.2
  const resShade = estimateWBGT({ t: 29.9, tw: 16.1, sr: 400 });
  assert.equal(resShade.shade, 20.2, 'PRD sanity check shade WBGT');
  assert.equal(resShade.sun, 20.2);

  const resSun = estimateWBGT({ t: 29.9, tw: 16.1, sr: 700 });
  assert.equal(resSun.shade, 20.2);
  assert.equal(resSun.sun, 22.2, 'PRD sanity check sun WBGT');
  assert.equal(resSun.inSun, true);
}

// Custom configuration
{
  const customCfg = { SUN_SR_WM2: 500, SUN_WBGT_ADD_C: 3 };
  const res = estimateWBGT({ t: 30.0, tw: 20.0, sr: 550 }, customCfg);
  assert.equal(res.inSun, true);
  assert.equal(res.sun, 26.0); // 23.0 + 3
}

// --------------------------------------------------------------------------
// 2. Work / Rest Table & Boundaries
// --------------------------------------------------------------------------
console.log('2. Testing work/rest assessments at boundary values...');

// Moderate work (normal: 28.0, 45/15: 29.0, 30/30: 30.0, 15/45: 31.5, stop: 31.5)
{
  // Below normal -> green
  const g = assessWork({ wbgt: 27.9, workType: 'moderate' });
  assert.equal(g.level, 'green');
  assert.equal(g.work, 60);
  assert.equal(g.rest, 0);
  assert.equal(g.stop, false);
  assert.equal(g.i18nKey, 'heat.normal');
  assert.deepEqual(g.vars, { n: 20 });

  // At 28.0 -> yellow (45/15)
  const y1 = assessWork({ wbgt: 28.0, workType: 'moderate' });
  assert.equal(y1.level, 'yellow');
  assert.equal(y1.work, 45);
  assert.equal(y1.rest, 15);
  assert.equal(y1.stop, false);
  assert.equal(y1.i18nKey, 'heat.cycle');
  assert.deepEqual(y1.vars, { work: 45, rest: 15 });

  // At 29.0 -> yellow (45/15)
  const y2 = assessWork({ wbgt: 29.0, workType: 'moderate' });
  assert.equal(y2.level, 'yellow');

  // At 29.1 -> orange (30/30)
  const o1 = assessWork({ wbgt: 29.1, workType: 'moderate' });
  assert.equal(o1.level, 'orange');
  assert.equal(o1.work, 30);
  assert.equal(o1.rest, 30);
  assert.equal(o1.stop, false);
  assert.equal(o1.i18nKey, 'heat.cycle');
  assert.deepEqual(o1.vars, { work: 30, rest: 30 });

  // At 30.0 -> orange (30/30)
  const o2 = assessWork({ wbgt: 30.0, workType: 'moderate' });
  assert.equal(o2.level, 'orange');

  // At 30.1 -> red (15/45 cycle, not stopped)
  const r1 = assessWork({ wbgt: 30.1, workType: 'moderate' });
  assert.equal(r1.level, 'red');
  assert.equal(r1.work, 15);
  assert.equal(r1.rest, 45);
  assert.equal(r1.stop, false);
  assert.equal(r1.i18nKey, 'heat.cycle');
  assert.deepEqual(r1.vars, { work: 15, rest: 45 });

  // At 31.5 -> red (15/45 cycle, not stopped)
  const r2 = assessWork({ wbgt: 31.5, workType: 'moderate' });
  assert.equal(r2.level, 'red');
  assert.equal(r2.stop, false);

  // Above 31.5 -> red (STOP)
  const s = assessWork({ wbgt: 31.6, workType: 'moderate' });
  assert.equal(s.level, 'red');
  assert.equal(s.work, 0);
  assert.equal(s.rest, 60);
  assert.equal(s.stop, true);
  assert.equal(s.i18nKey, 'heat.stop');
  assert.deepEqual(s.vars, {});
}

// Light work (normal: 31.0, 45/15: 31.0, 30/30: 32.0, 15/45: 32.5, stop: 32.5)
{
  assert.equal(assessWork({ wbgt: 30.9, workType: 'light' }).level, 'green');
  assert.equal(assessWork({ wbgt: 31.0, workType: 'light' }).level, 'yellow');
  assert.equal(assessWork({ wbgt: 31.5, workType: 'light' }).level, 'orange');
  assert.equal(assessWork({ wbgt: 32.0, workType: 'light' }).level, 'orange');
  const r = assessWork({ wbgt: 32.5, workType: 'light' });
  assert.equal(r.level, 'red');
  assert.equal(r.stop, false);
  const s = assessWork({ wbgt: 32.6, workType: 'light' });
  assert.equal(s.level, 'red');
  assert.equal(s.stop, true);
  assert.equal(s.i18nKey, 'heat.stop');
}

// Heavy work (normal: 27.5, 45/15: 27.5, 30/30: 29.0, 15/45: 30.5, stop: 30.5)
{
  assert.equal(assessWork({ wbgt: 27.4, workType: 'heavy' }).level, 'green');
  assert.equal(assessWork({ wbgt: 27.5, workType: 'heavy' }).level, 'yellow');
  assert.equal(assessWork({ wbgt: 28.0, workType: 'heavy' }).level, 'orange');
  assert.equal(assessWork({ wbgt: 29.0, workType: 'heavy' }).level, 'orange');
  const r = assessWork({ wbgt: 30.5, workType: 'heavy' });
  assert.equal(r.level, 'red');
  assert.equal(r.stop, false);
  const s = assessWork({ wbgt: 30.6, workType: 'heavy' });
  assert.equal(s.level, 'red');
  assert.equal(s.stop, true);
  assert.equal(s.i18nKey, 'heat.stop');
}

// --------------------------------------------------------------------------
// 3. newToHeat Offset
// --------------------------------------------------------------------------
console.log('3. Testing newToHeat offset (UNACCLIMATISED_OFFSET_C)...');
{
  // For moderate: normal 28.0 - 2.5 = 25.5, stop 31.5 - 2.5 = 29.0
  assert.equal(assessWork({ wbgt: 25.4, workType: 'moderate', newToHeat: true }).level, 'green');

  const y = assessWork({ wbgt: 25.5, workType: 'moderate', newToHeat: true });
  assert.equal(y.level, 'yellow');
  assert.equal(y.work, 45);

  const r = assessWork({ wbgt: 29.0, workType: 'moderate', newToHeat: true });
  assert.equal(r.level, 'red');
  assert.equal(r.stop, false);

  const s = assessWork({ wbgt: 29.1, workType: 'moderate', newToHeat: true });
  assert.equal(s.level, 'red');
  assert.equal(s.stop, true);
  assert.equal(s.i18nKey, 'heat.stop');

  // Custom offset
  const customCfg = { UNACCLIMATISED_OFFSET_C: 3.0, HYDRATION_MIN: 15 };
  const resCustom = assessWork({ wbgt: 24.9, workType: 'moderate', newToHeat: true }, customCfg);
  assert.equal(resCustom.level, 'green');
  assert.deepEqual(resCustom.vars, { n: 15 });
}

// --------------------------------------------------------------------------
// 4. Safe-Again Time
// --------------------------------------------------------------------------
console.log('4. Testing safe-again time calculation...');

// Synthetic hourly series
// Pune afternoon scenario on 2026-11-21
const hourlyTimes = [
  '2026-11-21T12:00',
  '2026-11-21T13:00',
  '2026-11-21T14:00',
  '2026-11-21T15:00',
  '2026-11-21T16:00',
  '2026-11-21T17:00',
  '2026-11-22T06:00', // Next day
];

// Hot values: T=40, Tw=28, SR=800 -> WBGT shade=29.6, sun=31.6 (> 28 -> orange/red for moderate)
// Cool values: T=25, Tw=15, SR=200 -> WBGT shade=18.0, sun=18.0 (< 28 -> green for moderate)

// Case A: Hot until 16:00, then cooler -> safeAgain at 16:00
{
  const hourly = {
    time: hourlyTimes,
    temperature_2m:          [40, 40, 40, 40, 25, 24, 20],
    wet_bulb_temperature_2m: [28, 28, 28, 28, 15, 14, 12],
    shortwave_radiation:     [800, 800, 800, 700, 200, 50, 0],
  };

  const res = safeAgainTime({
    hourly,
    now: '2026-11-21T12:00',
    workType: 'moderate',
  });

  assert.equal(res.at, '2026-11-21T16:00', 'Should find 16:00 as safe again time');
  assert.equal(res.i18nKey, 'heat.safeAgain');
  assert.deepEqual(res.vars, { time: '16:00' });
}

// Case B: Hot all day -> safeAgainNotToday
{
  const hourly = {
    time: hourlyTimes,
    temperature_2m:          [40, 40, 40, 40, 40, 39, 20], // 22nd morning is cool, but today stays hot
    wet_bulb_temperature_2m: [28, 28, 28, 28, 28, 27, 12],
    shortwave_radiation:     [800, 800, 800, 700, 500, 200, 0],
  };

  const res = safeAgainTime({
    hourly,
    now: '2026-11-21T12:00',
    workType: 'moderate',
  });

  assert.equal(res.at, null);
  assert.equal(res.i18nKey, 'heat.safeAgainNotToday');
}

// Case C: Already green -> at: null, i18nKey: null
{
  const hourly = {
    time: hourlyTimes,
    temperature_2m:          [25, 25, 25, 25, 24, 23, 20],
    wet_bulb_temperature_2m: [15, 15, 15, 15, 14, 13, 12],
    shortwave_radiation:     [200, 200, 200, 200, 100, 0, 0],
  };

  const res = safeAgainTime({
    hourly,
    now: '2026-11-21T12:00',
    workType: 'moderate',
  });

  assert.equal(res.at, null);
  assert.equal(res.i18nKey, null);
  assert.equal(res.vars, null);
}

// --------------------------------------------------------------------------
// 5. Heat Illness Triage
// --------------------------------------------------------------------------
console.log('5. Testing heat illness triage...');

assert.equal(RED_FLAGS.length, 6, 'Should have 6 red flag signs');
assert.equal(WARNING_SIGNS.length, 8, 'Should have 8 warning signs');

// Red flag symptoms -> emergency
assert.equal(triage(['confusion']), 'emergency');
assert.equal(triage(['slurred_speech']), 'emergency');
assert.equal(triage(['fainting']), 'emergency');
assert.equal(triage(['seizure']), 'emergency');
assert.equal(triage(['hot_skin']), 'emergency');
assert.equal(triage(['nonsense']), 'emergency');

// Warning signs -> exhaustion
assert.equal(triage(['heavy_sweating']), 'exhaustion');
assert.equal(triage(['dizziness', 'headache']), 'exhaustion');
assert.equal(triage(['cramps', 'weakness']), 'exhaustion');

// Mixed red flag + warning signs -> emergency wins
assert.equal(triage(['confusion', 'dizziness', 'headache']), 'emergency');
assert.equal(triage(['fainting', 'nausea']), 'emergency');

// None or unknown
assert.equal(triage([]), 'ok');
assert.equal(triage(null), 'ok');
assert.equal(triage(undefined), 'ok');
assert.equal(triage(['some_random_id']), 'ok');

// Support Set input
assert.equal(triage(new Set(['dizziness'])), 'exhaustion');
assert.equal(triage(new Set(['hot_skin', 'dizziness'])), 'emergency');

console.log('\nALL HEAT TESTS PASSED');
