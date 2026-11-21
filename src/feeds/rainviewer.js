// RainViewer radar feed (PRD §7, §12).
// Free API limits since 1 Jan 2026: past frames only (no future/nowcast), raster tiles maxzoom 7.
// Required attribution: "Weather data by RainViewer" linking to rainviewer.com while layer is on.
import { CONFIG } from '../../config.js';

const WEATHER_MAPS_URL = 'https://api.rainviewer.com/public/weather-maps.json';
export const RAINVIEWER_MAXZOOM = CONFIG?.RAINVIEWER_MAXZOOM ?? 7;
export const RAINVIEWER_ATTRIBUTION = '<a href="https://www.rainviewer.com" target="_blank" rel="noopener">Weather data by RainViewer</a>';

let cachedTileUrl = null;
let refreshTimer = null;
const listeners = new Set();

/**
 * Fetches the latest past radar tile URL template from RainViewer.
 * Format: host + radar.past[last].path + "/256/{z}/{x}/{y}/2/1_1.png"
 */
export async function fetchRadarTileUrl() {
  try {
    const res = await fetch(WEATHER_MAPS_URL);
    if (!res.ok) throw new Error(`RainViewer HTTP ${res.status}`);
    const data = await res.json();
    const past = data.radar?.past;
    if (!Array.isArray(past) || past.length === 0) {
      throw new Error('No past radar frames available');
    }
    const last = past[past.length - 1];
    const host = data.host || 'https://tilecache.rainviewer.com';
    const tileUrl = `${host}${last.path}/256/{z}/{x}/{y}/2/1_1.png`;
    cachedTileUrl = tileUrl;
    listeners.forEach((fn) => fn(tileUrl));
    return tileUrl;
  } catch (err) {
    console.warn('[rainviewer] fetch failed:', err.message);
    return cachedTileUrl;
  }
}

/**
 * Returns last fetched radar tile URL (or null if not yet fetched).
 */
export const getRadarTileUrl = () => cachedTileUrl;

/**
 * Subscribe to radar tile URL updates.
 */
export function onRadarTileUrl(fn) {
  listeners.add(fn);
  if (cachedTileUrl) fn(cachedTileUrl);
  return () => listeners.delete(fn);
}

/**
 * Starts automatic 10-minute refresh of RainViewer radar frames.
 */
export function startRadarFeed(callback) {
  if (callback) onRadarTileUrl(callback);
  fetchRadarTileUrl();
  if (refreshTimer) clearInterval(refreshTimer);
  refreshTimer = setInterval(fetchRadarTileUrl, 10 * 60 * 1000);
  return () => {
    if (refreshTimer) clearInterval(refreshTimer);
    refreshTimer = null;
  };
}
