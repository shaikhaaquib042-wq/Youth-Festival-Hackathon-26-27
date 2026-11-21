import { HEAT_RULES } from '../constants/heat-rules.js';

/** NWS Rothfusz with Steadman screening and humidity adjustments.
 * https://www.wpc.ncep.noaa.gov/html/heatindex_equation.shtml
 * null means outside the reporting envelope, never an absence of heat concerns.
 */
export function heatIndexC(temperatureC: number, humidityPercent: number): number | null {
  if (!Number.isFinite(temperatureC) || temperatureC < -90 || temperatureC > 65 ||
      !Number.isFinite(humidityPercent) || humidityPercent < 0 || humidityPercent > 100) {
    throw new RangeError('Invalid temperature or humidity');
  }
  const t = temperatureC * 9 / 5 + 32;
  const r = humidityPercent;
  const simple = 0.5 * (t + 61 + (t - 68) * 1.2 + r * 0.094);
  if ((simple + t) / 2 < 80 || t < HEAT_RULES.minRegressionF || t > HEAT_RULES.maxRegressionF) return null;
  let hi = -42.379 + 2.04901523 * t + 10.14333127 * r - 0.22475541 * t * r
    - 0.00683783 * t * t - 0.05481717 * r * r + 0.00122874 * t * t * r
    + 0.00085282 * t * r * r - 0.00000199 * t * t * r * r;
  if (r < 13 && t >= 80 && t <= 112) hi -= ((13 - r) / 4) * Math.sqrt((17 - Math.abs(t - 95)) / 17);
  if (r > 85 && t >= 80 && t <= 87) hi += ((r - 85) / 10) * ((87 - t) / 5);
  return hi >= 80 && hi <= HEAT_RULES.maxReportedHeatIndexF ? (hi - 32) * 5 / 9 : null;
}
