/**
 * Safe-Again Time calculation for Sajag (PRD §22.2).
 *
 * Finds the first hourly forecast slot strictly after `now` on the same calendar day
 * (Asia/Kolkata) whose estimated WBGT in sun drops back down to 'green' (normal work).
 */

import { DEFAULT_CFG, estimateWBGT } from './wbgt.js';
import { assessWork } from './workrest.js';

/**
 * Parses a Date, timestamp, or ISO string into epoch milliseconds.
 * Local ISO strings without timezone (e.g. "2026-11-21T14:00") are assumed
 * to be Asia/Kolkata local times (+05:30) per Open-Meteo local format.
 *
 * @param {Date|number|string} input
 * @returns {number} Epoch milliseconds or NaN
 */
function parseToTimestamp(input) {
  if (input instanceof Date) return input.getTime();
  if (typeof input === 'number') return input;
  if (typeof input === 'string') {
    if (!input.endsWith('Z') && !input.includes('+') && !input.match(/-\d{2}:\d{2}$/)) {
      return new Date(input + '+05:30').getTime();
    }
    return new Date(input).getTime();
  }
  return NaN;
}

/**
 * Gets the calendar day string (YYYY-MM-DD) in Asia/Kolkata timezone.
 *
 * @param {Date|number|string} input
 * @returns {string|null}
 */
function getKolkataCalendarDay(input) {
  if (typeof input === 'string') {
    if (/^\d{4}-\d{2}-\d{2}/.test(input) && !input.endsWith('Z')) {
      if (!input.includes('+') && !input.match(/-\d{2}:\d{2}$/)) {
        return input.slice(0, 10);
      }
    }
  }
  const ms = parseToTimestamp(input);
  if (isNaN(ms)) return null;
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date(ms));
}

/**
 * Formats a timestamp or ISO string into local HH:MM in Asia/Kolkata.
 *
 * @param {Date|number|string} input
 * @returns {string} Formatted HH:MM
 */
function formatKolkataTime(input) {
  if (typeof input === 'string') {
    const m = input.match(/T(\d{2}:\d{2})/);
    if (m && !input.endsWith('Z') && !input.includes('+')) {
      return m[1];
    }
  }
  const ms = parseToTimestamp(input);
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(ms));
}

/**
 * Determines the time when conditions are expected to become safe again (green) today.
 *
 * @param {{
 *   hourly: {
 *     time: string[],
 *     temperature_2m: number[],
 *     wet_bulb_temperature_2m: number[],
 *     shortwave_radiation: number[]
 *   },
 *   now: Date|string|number,
 *   workType?: 'light'|'moderate'|'heavy',
 *   newToHeat?: boolean
 * }} params
 * @param {typeof DEFAULT_CFG} [cfg=DEFAULT_CFG] - Heat configuration
 * @returns {{
 *   at: string | null,
 *   i18nKey: 'heat.safeAgain' | 'heat.safeAgainNotToday' | null,
 *   vars: { time: string } | null
 * }}
 */
export function safeAgainTime({ hourly, now, workType = 'moderate', newToHeat = false }, cfg = DEFAULT_CFG) {
  if (!hourly || !Array.isArray(hourly.time) || hourly.time.length === 0 || !now) {
    return { at: null, i18nKey: null, vars: null };
  }

  const tNow = parseToTimestamp(now);
  if (isNaN(tNow)) {
    return { at: null, i18nKey: null, vars: null };
  }

  const nowDay = getKolkataCalendarDay(now);

  // Determine current slot (latest slot at or before `now`, or index 0 if now is before first slot)
  let currIdx = 0;
  for (let i = 0; i < hourly.time.length; i++) {
    const slotMs = parseToTimestamp(hourly.time[i]);
    if (slotMs <= tNow) {
      currIdx = i;
    } else {
      break;
    }
  }

  const currWbgt = estimateWBGT({
    t: hourly.temperature_2m[currIdx],
    tw: hourly.wet_bulb_temperature_2m[currIdx],
    sr: hourly.shortwave_radiation[currIdx],
  }, cfg);

  const currAssessment = assessWork({ wbgt: currWbgt.sun, workType, newToHeat }, cfg);
  if (currAssessment.level === 'green') {
    return { at: null, i18nKey: null, vars: null };
  }

  // Scan future hourly slots strictly after `now` on the same calendar day
  for (let i = 0; i < hourly.time.length; i++) {
    const slotTimeStr = hourly.time[i];
    const slotMs = parseToTimestamp(slotTimeStr);

    if (slotMs <= tNow) {
      continue;
    }

    const slotDay = getKolkataCalendarDay(slotTimeStr);
    if (slotDay !== nowDay) {
      continue;
    }

    const wbgt = estimateWBGT({
      t: hourly.temperature_2m[i],
      tw: hourly.wet_bulb_temperature_2m[i],
      sr: hourly.shortwave_radiation[i],
    }, cfg);

    const assessment = assessWork({ wbgt: wbgt.sun, workType, newToHeat }, cfg);
    if (assessment.level === 'green') {
      const time = formatKolkataTime(slotTimeStr);
      return {
        at: slotTimeStr,
        i18nKey: 'heat.safeAgain',
        vars: { time },
      };
    }
  }

  return {
    at: null,
    i18nKey: 'heat.safeAgainNotToday',
    vars: null,
  };
}
