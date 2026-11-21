// Advisory engine — "Before you leave" (PRD §8, §9, §21, §22, §23).
// Pure functions — always pass `now`. NO CONFIG IMPORT (Node self-test safe).
import { distM } from './geo.js';
import { pinSeverity, worst } from './lifecycle.js';
import { estimateWBGT, assessWork, safeAgainTime } from '../heat/index.js';

/**
 * §8 Rule Table: readable constants for rain and heat advisory rules.
 */
export const ADVISORY_RULES = {
  rain: [
    {
      id: 'rain_probable',
      condition: 'Rain probability ≥ 50% or any rain expected',
      action: 'umbrella',
      i18nKey: 'advice.umbrella',
      test: ({ prob, precip }) => prob >= 50 || precip > 0,
    },
    {
      id: 'rain_heavy',
      condition: 'Rain ≥ 2.5 mm/hr expected, or probability ≥ 80%',
      action: 'raincoat + waterproof bag',
      i18nKeys: ['advice.raincoat', 'advice.waterproofBag'],
      test: ({ prob, maxHourlyPrecip, precip }) =>
        precip >= 2.5 || maxHourlyPrecip >= 2.5 || prob >= 80,
    },
    {
      id: 'wind_gusts',
      condition: 'Wind gusts ≥ 40 km/h',
      action: 'raincoat only; riders advised to postpone if possible',
      i18nKey: 'advice.windRider',
      test: ({ windGusts }) => windGusts >= 40,
    },
    {
      id: 'flood_ankle',
      condition: 'Any ankle+ pin on/near route',
      action: 'gumboots, spare socks, phone in waterproof pouch',
      i18nKey: 'advice.gumboots',
      test: ({ hasAnklePlus }) => hasAnklePlus,
    },
    {
      id: 'flood_knee_hard_warning',
      condition: 'Knee+ confirmed water on route',
      action: 'gear advice REPLACED by hard warning; never advise wading',
      i18nKey: 'advice.kneeWarning',
      replacesGear: true,
      test: ({ hasKneeConfirmed }) => hasKneeConfirmed,
    },
  ],
  heat: [
    {
      id: 'heat_37',
      thresholdC: 37,
      condition: '≥ 37 °C',
      action: 'water, cap; outdoor workers extra breaks',
      i18nKey: 'advice.heat37',
      test: ({ temp }) => temp >= 37 && temp < 40,
    },
    {
      id: 'heat_40',
      thresholdC: 40,
      condition: '≥ 40 °C',
      action: 'water + ORS, light clothing, avoid 11 am–4 pm',
      i18nKey: 'advice.heat40',
      test: ({ temp }) => temp >= 40 && temp < 45,
    },
    {
      id: 'heat_45',
      thresholdC: 45,
      condition: '≥ 45 °C',
      action: 'stop-work advisory for outdoor workers; health warning replaces gear advice',
      i18nKey: 'advice.heat45',
      replacesGear: true,
      test: ({ temp }) => temp >= 45,
    },
  ],
};

/**
 * Returns an array of i18n keys (+vars) for the "Before you leave" line.
 * Knee+ confirmed water replaces gear advice with the hard warning.
 * Extreme heat (≥45 °C) replaces gear advice with the stop-work warning.
 */
export function advise({ cell, pins = [], mode = 'commuter', now = new Date() } = {}) {
  // 1. Hard safety check: Knee+ confirmed water on route replaces all gear advice
  const hasKneeConfirmed = pins.some(
    (p) =>
      p.status === 'confirmed' &&
      (p.depth === 'knee' || p.depth === 'above_knee'),
  );
  if (hasKneeConfirmed) {
    return [{ key: 'advice.kneeWarning', vars: {} }];
  }

  // 2. Weather metrics
  const precip = cell?.current?.precipitation ?? 0;
  const prob = Array.isArray(cell?.hourly?.precipitation_probability)
    ? Math.max(0, ...cell.hourly.precipitation_probability)
    : 0;
  const maxHourlyPrecip = Array.isArray(cell?.hourly?.precipitation)
    ? Math.max(0, ...cell.hourly.precipitation)
    : 0;
  const windGusts = cell?.current?.wind_gusts_10m ?? 0;
  const temp = cell?.current?.temperature_2m ?? 0;

  // 3. Extreme heat check: ≥ 45 °C replaces gear advice
  if (temp >= 45) {
    return [{ key: 'advice.heat45', vars: {} }];
  }

  const adviceList = [];

  // Rain rules
  if (precip >= 2.5 || maxHourlyPrecip >= 2.5 || prob >= 80) {
    adviceList.push({ key: 'advice.raincoat', vars: {} });
    adviceList.push({ key: 'advice.waterproofBag', vars: {} });
  } else if (prob >= 50 || precip > 0) {
    adviceList.push({ key: 'advice.umbrella', vars: {} });
  }

  // Wind rule
  if (windGusts >= 40) {
    adviceList.push({
      key: 'advice.windRider',
      vars: { speed: Math.round(windGusts) },
    });
  }

  // Ankle+ water on/near route
  const hasAnklePlus = pins.some(
    (p) =>
      p.status !== 'cleared' &&
      (p.depth === 'ankle' || p.depth === 'knee' || p.depth === 'above_knee'),
  );
  if (hasAnklePlus) {
    adviceList.push({ key: 'advice.gumboots', vars: {} });
  }

  // Heat rules (if active)
  if (temp >= 40) {
    adviceList.push({ key: 'advice.heat40', vars: {} });
  } else if (temp >= 37) {
    adviceList.push({ key: 'advice.heat37', vars: {} });
  }

  if (adviceList.length === 0) {
    adviceList.push({ key: 'advice.normalDay', vars: {} });
  }

  return adviceList;
}

const SEV_RANK = { none: 0, grey: 0, green: 1, yellow: 2, orange: 3, red: 4 };

/**
 * Pure helper for Flood Card status computation.
 * PRD §9, §22.1, §22.3.
 */
export function computeFloodCardStatus({
  pins = [],
  cell = null,
  userLoc = null,
  mode = 'commuter',
  now = new Date(),
  maxDistM = 1000,
} = {}) {
  const nearby = userLoc
    ? pins.filter(
        (p) =>
          p.status !== 'cleared' &&
          p.type !== 'cooling' &&
          distM(p, userLoc) <= maxDistM,
      )
    : pins.filter((p) => p.status !== 'cleared' && p.type !== 'cooling');

  const precip = cell?.current?.precipitation ?? 0;
  const prob = Array.isArray(cell?.hourly?.precipitation_probability)
    ? Math.max(0, ...cell.hourly.precipitation_probability)
    : 0;
  const maxHourly = Array.isArray(cell?.hourly?.precipitation)
    ? Math.max(0, ...cell.hourly.precipitation)
    : 0;
  const heavyRain = precip >= 2.5 || maxHourly >= 2.5;
  const rainExpected = prob >= 50 || precip > 0;

  let worstPin = null;
  let worstPinSev = 'none';

  for (const pin of nearby) {
    const sev = pinSeverity(pin, { mode, heavyRain });
    if (SEV_RANK[sev] > SEV_RANK[worstPinSev]) {
      worstPinSev = sev;
      worstPin = pin;
    }
  }

  let level = 'green';
  if (SEV_RANK[worstPinSev] >= SEV_RANK.red) {
    level = 'red';
  } else if (SEV_RANK[worstPinSev] >= SEV_RANK.orange) {
    level = 'orange';
  } else if (SEV_RANK[worstPinSev] >= SEV_RANK.yellow) {
    level = 'yellow';
  } else if (heavyRain || rainExpected) {
    level = 'yellow';
  }

  let actionKey = 'advice.normalDay';
  if (level === 'red') actionKey = 'red.doNotEnter';
  else if (level === 'orange') actionKey = 'severity.orange';
  else if (level === 'yellow') actionKey = 'severity.yellow';

  let evidence = null;
  if (worstPin) {
    const ageMin = Math.max(
      0,
      Math.round((now.getTime() - Date.parse(worstPin.createdAt)) / 60000),
    );
    evidence = {
      confirmations: (worstPin.confirmations ?? 0) + 1,
      ageMin,
      near: worstPin.near ?? worstPin.name ?? null,
    };
  }

  return {
    level,
    actionKey,
    actionVars: {},
    decidingPin: worstPin,
    evidence,
    heavyRain,
    rainExpected,
  };
}

/**
 * Pure helper for Heat Card status computation.
 * PRD §21, §22.1, §22.2, §23.
 */
export function computeHeatCardStatus({
  cell = null,
  workType = 'moderate',
  newToHeat = false,
  isMaharashtra = true,
  now = new Date(),
  cfg = undefined,
} = {}) {
  const current = cell?.current;
  const t = current?.temperature_2m ?? 30;
  const tw = current?.wet_bulb_temperature_2m ?? 18;
  const sr = current?.shortwave_radiation ?? 500;

  const wbgtRes = estimateWBGT({ t, tw, sr }, cfg);
  const wbgt = wbgtRes.sun;

  const assessment = assessWork({ wbgt, workType, newToHeat }, cfg);
  let safeAgain = safeAgainTime(
    { hourly: cell?.hourly, now, workType, newToHeat },
    cfg,
  );

  const isHot = assessment.level === 'orange' || assessment.level === 'red';
  const showNdma = isHot;
  let showMhSop = false;

  if (isHot && isMaharashtra) {
    showMhSop = true;
    // PRD §23: never show safe-again earlier than 16:00
    if (safeAgain?.at && safeAgain.at < '16:00') {
      safeAgain = {
        ...safeAgain,
        at: '16:00',
        vars: { time: '16:00' },
      };
    }
  }

  return {
    level: assessment.level,
    actionKey: assessment.i18nKey,
    actionVars: assessment.vars,
    wbgt,
    temp: t,
    safeAgain,
    showNdma,
    showMhSop,
    workAssessment: assessment,
  };
}
