/**
 * Work / rest guidance module for Sajag.
 *
 * Simplified from the ACGIH heat-stress TLV table (acclimatised workers, WBGT °C, per hour).
 * Status colours: GREEN normal · YELLOW 45/15 · ORANGE 30/30 · RED 15/45 or STOP.
 */

import { DEFAULT_CFG } from './wbgt.js';

/**
 * ACGIH-based work/rest threshold guidance table from PRD §21.2.
 * All thresholds are in Wet-Bulb Globe Temperature (WBGT) °C.
 *
 * | Work type (examples) | Normal work below | 45 work / 15 rest | 30 / 30 | 15 / 45 | STOP heavy work above |
 * | Light — street vendor | 31.0              | 31.0              | 32.0    | 32.5    | 32.5                  |
 * | Moderate — delivery   | 28.0              | 29.0              | 30.0    | 31.5    | 31.5                  |
 * | Heavy — construction  | 27.5 (45/15 from) | 27.5              | 29.0    | 30.5    | 30.5                  |
 */
export const WORK_REST = {
  light: {
    normalBelow: 31.0,
    work45_rest15: 31.0,
    work30_rest30: 32.0,
    work15_rest45: 32.5,
    stopAbove: 32.5,
    // Level shorthands
    normal: 31.0,
    yellow: 31.0,
    orange: 32.0,
    red: 32.5,
    stop: 32.5,
  },
  moderate: {
    normalBelow: 28.0,
    work45_rest15: 29.0,
    work30_rest30: 30.0,
    work15_rest45: 31.5,
    stopAbove: 31.5,
    // Level shorthands
    normal: 28.0,
    yellow: 29.0,
    orange: 30.0,
    red: 31.5,
    stop: 31.5,
  },
  heavy: {
    normalBelow: 27.5,
    work45_rest15: 27.5,
    work30_rest30: 29.0,
    work15_rest45: 30.5,
    stopAbove: 30.5,
    // Level shorthands
    normal: 27.5,
    yellow: 27.5,
    orange: 29.0,
    red: 30.5,
    stop: 30.5,
  },
};

/**
 * Assesses work/rest schedule based on WBGT, workload type, and acclimatisation status.
 *
 * - green: Normal work (work: 60, rest: 0, stop: false, i18nKey: 'heat.normal', vars: { n: cfg.HYDRATION_MIN })
 * - yellow: 45 work / 15 rest (work: 45, rest: 15, stop: false, i18nKey: 'heat.cycle', vars: { work: 45, rest: 15 })
 * - orange: 30 work / 30 rest (work: 30, rest: 30, stop: false, i18nKey: 'heat.cycle', vars: { work: 30, rest: 30 })
 * - red: 15 work / 45 rest (work: 15, rest: 45, stop: false, i18nKey: 'heat.cycle', vars: { work: 15, rest: 45 })
 *        OR STOP when above stop threshold (work: 0, rest: 60, stop: true, i18nKey: 'heat.stop', vars: {})
 *
 * Workers new to the heat subtract cfg.UNACCLIMATISED_OFFSET_C from every threshold.
 *
 * @param {{ wbgt: number, workType?: 'light'|'moderate'|'heavy', newToHeat?: boolean }} params
 * @param {typeof DEFAULT_CFG} [cfg=DEFAULT_CFG] - Tunable heat configuration
 * @returns {{
 *   level: 'green'|'yellow'|'orange'|'red',
 *   work: number,
 *   rest: number,
 *   stop: boolean,
 *   i18nKey: string,
 *   vars: Record<string, any>
 * }}
 */
export function assessWork({ wbgt, workType = 'moderate', newToHeat = false }, cfg = DEFAULT_CFG) {
  const row = WORK_REST[workType] || WORK_REST.moderate;
  const offset = newToHeat ? (cfg?.UNACCLIMATISED_OFFSET_C ?? DEFAULT_CFG.UNACCLIMATISED_OFFSET_C) : 0;
  const hydrationMin = cfg?.HYDRATION_MIN ?? DEFAULT_CFG.HYDRATION_MIN;

  const normal = row.normal - offset;
  const yellow = row.yellow - offset;
  const orange = row.orange - offset;
  const stop = row.stop - offset;

  if (wbgt < normal) {
    return {
      level: 'green',
      work: 60,
      rest: 0,
      stop: false,
      i18nKey: 'heat.normal',
      vars: { n: hydrationMin },
    };
  }

  if (wbgt > stop) {
    return {
      level: 'red',
      work: 0,
      rest: 60,
      stop: true,
      i18nKey: 'heat.stop',
      vars: {},
    };
  }

  if (wbgt > orange) {
    return {
      level: 'red',
      work: 15,
      rest: 45,
      stop: false,
      i18nKey: 'heat.cycle',
      vars: { work: 15, rest: 45 },
    };
  }

  if (wbgt > yellow) {
    return {
      level: 'orange',
      work: 30,
      rest: 30,
      stop: false,
      i18nKey: 'heat.cycle',
      vars: { work: 30, rest: 30 },
    };
  }

  return {
    level: 'yellow',
    work: 45,
    rest: 15,
    stop: false,
    i18nKey: 'heat.cycle',
    vars: { work: 45, rest: 15 },
  };
}
