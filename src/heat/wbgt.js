/**
 * WBGT (Wet-Bulb Globe Temperature) estimation module for Sajag.
 *
 * Pure functions for calculating heat stress metrics from weather data.
 */

/**
 * Default configuration matching CONFIG.HEAT in config.js.
 */
export const DEFAULT_CFG = {
  SUN_SR_WM2: 600,
  SUN_WBGT_ADD_C: 2,
  UNACCLIMATISED_OFFSET_C: 2.5,
  HYDRATION_MIN: 20,
};

/**
 * Estimates Wet-Bulb Globe Temperature (WBGT) in shade and full sun.
 *
 * Formula:
 * - WBGT_shade = 0.7 * Tw + 0.3 * T
 * - WBGT_sun = WBGT_shade + cfg.SUN_WBGT_ADD_C (when sr > cfg.SUN_SR_WM2, else shade)
 * Values are rounded to 1 decimal place.
 *
 * @param {{ t: number, tw: number, sr: number }} weather - Air temperature (°C), wet-bulb temperature (°C), shortwave radiation (W/m²)
 * @param {typeof DEFAULT_CFG} [cfg=DEFAULT_CFG] - Tunable heat configuration
 * @returns {{ shade: number, sun: number, inSun: boolean }} WBGT values and sun status
 */
export function estimateWBGT({ t, tw, sr }, cfg = DEFAULT_CFG) {
  const srThreshold = cfg?.SUN_SR_WM2 ?? DEFAULT_CFG.SUN_SR_WM2;
  const sunAdd = cfg?.SUN_WBGT_ADD_C ?? DEFAULT_CFG.SUN_WBGT_ADD_C;

  const rawShade = 0.7 * tw + 0.3 * t;
  const shade = Number(rawShade.toFixed(1));
  const inSun = sr > srThreshold;
  const rawSun = inSun ? shade + sunAdd : shade;
  const sun = Number(rawSun.toFixed(1));

  return { shade, sun, inSun };
}
