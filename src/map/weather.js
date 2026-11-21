// Weather grid layers (PRD §7, §21, §22.1).
// Flood side: regional rainfall cells (soft fill, opacity ≤ 0.25) + RainViewer radar (maxzoom 7).
// Heat side: regional temperature cells (soft fill, opacity ≤ 0.25) with IMD colour bands (CONFIG.HEAT.MAP_BANDS_C).
// Live mode: NO cell outlines, NO value labels.
// Scenario mode: thin dashed purple outline on simulated cells only.
// Radar toggle exported for More menu; radar attribution credit preserved.
import { CONFIG, cityPack } from '../../config.js';
import { getGrid, onGrid } from '../feeds/openmeteo.js';
import { startRadarFeed, RAINVIEWER_MAXZOOM, RAINVIEWER_ATTRIBUTION } from '../feeds/rainviewer.js';

export const WEATHER_LAYERS = {
  flood: [
    'sj-radar',
    'sj-rain-cells',
    'sj-rain-cells-sim-outline',
  ],
  heat: [
    'sj-heat-cells',
    'sj-heat-cells-sim-outline',
  ],
};

let currentMap = null;
let currentHazard = 'flood';
let radarEnabled = false;
let radarCreditEl = null;

function makePolygon(lng, lat, cellDeg) {
  const half = cellDeg / 2;
  return [
    [lng - half, lat - half],
    [lng + half, lat - half],
    [lng + half, lat + half],
    [lng - half, lat + half],
    [lng - half, lat - half],
  ];
}

function getRainColor(precip = 0, prob = 0, maxHourly = 0) {
  if (precip >= 7.5 || maxHourly >= 7.5) return 'rgba(24, 100, 171, 0.25)';
  if (precip >= 2.5 || maxHourly >= 2.5 || prob >= 80) return 'rgba(34, 139, 230, 0.20)';
  if (precip > 0 || prob >= 50) return 'rgba(116, 192, 252, 0.15)';
  return 'rgba(0, 0, 0, 0)';
}

function getHeatColor(temp = 0, bands = CONFIG.HEAT?.MAP_BANDS_C) {
  const b = bands ?? { amber: 37, red: 40, severe: 45 };
  if (temp >= b.severe) return 'rgba(201, 42, 42, 0.25)';
  if (temp >= b.red) return 'rgba(214, 40, 40, 0.20)';
  if (temp >= b.amber) return 'rgba(240, 113, 15, 0.15)';
  return 'rgba(0, 0, 0, 0)';
}

function buildGridFeatures(pack) {
  const grid = getGrid();
  const cellDeg = pack?.grid?.cellDeg ?? 0.12;
  const rainFeats = [];
  const heatFeats = [];

  for (const cell of grid) {
    const poly = makePolygon(cell.lng, cell.lat, cellDeg);
    const precip = cell.current?.precipitation ?? 0;
    const maxProb = Array.isArray(cell.hourly?.precipitation_probability)
      ? Math.max(0, ...cell.hourly.precipitation_probability)
      : 0;
    const maxHourlyPrecip = Array.isArray(cell.hourly?.precipitation)
      ? Math.max(0, ...cell.hourly.precipitation)
      : 0;
    const temp = cell.current?.temperature_2m ?? 0;
    const sim = cell.simulated ? 1 : 0;

    rainFeats.push({
      type: 'Feature',
      geometry: { type: 'Polygon', coordinates: [poly] },
      properties: {
        precip,
        prob: maxProb,
        sim,
        color: getRainColor(precip, maxProb, maxHourlyPrecip),
      },
    });

    heatFeats.push({
      type: 'Feature',
      geometry: { type: 'Polygon', coordinates: [poly] },
      properties: {
        temp,
        sim,
        color: getHeatColor(temp, CONFIG.HEAT?.MAP_BANDS_C),
      },
    });
  }

  return {
    rain: { type: 'FeatureCollection', features: rainFeats },
    heat: { type: 'FeatureCollection', features: heatFeats },
  };
}

function updateRadarCredit() {
  if (!radarCreditEl) return;
  const visible = radarEnabled && currentHazard === 'flood';
  radarCreditEl.style.display = visible ? 'block' : 'none';
}

export function isRadarVisible() {
  return radarEnabled && currentHazard === 'flood';
}

export function setRadarVisible(map, visible) {
  radarEnabled = Boolean(visible);
  const targetMap = map ?? currentMap;
  if (targetMap?.getLayer('sj-radar')) {
    targetMap.setLayoutProperty(
      'sj-radar',
      'visibility',
      radarEnabled && currentHazard === 'flood' ? 'visible' : 'none',
    );
  }
  updateRadarCredit();
}

/**
 * Show only the weather layers for the active hazard.
 */
export function showWeatherHazard(map, hazard) {
  currentHazard = hazard;
  const apply = () => {
    const isFlood = hazard === 'flood';
    for (const id of WEATHER_LAYERS.flood) {
      if (map.getLayer(id)) {
        if (id === 'sj-radar') {
          map.setLayoutProperty(id, 'visibility', isFlood && radarEnabled ? 'visible' : 'none');
        } else {
          map.setLayoutProperty(id, 'visibility', isFlood ? 'visible' : 'none');
        }
      }
    }
    for (const id of WEATHER_LAYERS.heat) {
      if (map.getLayer(id)) {
        map.setLayoutProperty(id, 'visibility', !isFlood ? 'visible' : 'none');
      }
    }
    updateRadarCredit();
  };

  if (map.isStyleLoaded()) apply();
  else map.once('idle', apply);
}

/**
 * Initializes weather cell layers + RainViewer radar layer on the MapLibre map.
 * Inserted BELOW sj-hotspots.
 */
export function initWeatherLayers(map, pack = cityPack()) {
  currentMap = map;

  // Radar attribution badge
  if (!document.getElementById('rainviewer-credit')) {
    radarCreditEl = document.createElement('div');
    radarCreditEl.id = 'rainviewer-credit';
    radarCreditEl.style.cssText =
      'position:absolute;left:8px;bottom:32px;z-index:2;font-size:10px;line-height:1.2;background:rgba(255,255,255,0.85);padding:2px 6px;border-radius:4px;display:none;';
    radarCreditEl.innerHTML = RAINVIEWER_ATTRIBUTION;
    document.getElementById('app')?.appendChild(radarCreditEl);
  }

  const setup = () => {
    const data = buildGridFeatures(pack);
    const beforeId = map.getLayer('sj-hotspots') ? 'sj-hotspots' : undefined;

    // Sources
    if (!map.getSource('sj-rain-cells')) {
      map.addSource('sj-rain-cells', { type: 'geojson', data: data.rain });
    }
    if (!map.getSource('sj-heat-cells')) {
      map.addSource('sj-heat-cells', { type: 'geojson', data: data.heat });
    }

    // Rain cell layers (soft fill only, no outlines in live, thin dashed outline in scenario)
    if (!map.getLayer('sj-rain-cells')) {
      map.addLayer(
        {
          id: 'sj-rain-cells',
          type: 'fill',
          source: 'sj-rain-cells',
          paint: {
            'fill-color': ['get', 'color'],
            'fill-opacity': 1,
          },
        },
        beforeId,
      );
    }

    if (!map.getLayer('sj-rain-cells-sim-outline')) {
      map.addLayer(
        {
          id: 'sj-rain-cells-sim-outline',
          type: 'line',
          source: 'sj-rain-cells',
          filter: ['==', ['get', 'sim'], 1],
          paint: {
            'line-color': '#7b2cbf',
            'line-width': 1.5,
            'line-dasharray': [2, 2],
          },
        },
        beforeId,
      );
    }

    // Heat cell layers (soft fill only, no outlines in live, thin dashed outline in scenario)
    if (!map.getLayer('sj-heat-cells')) {
      map.addLayer(
        {
          id: 'sj-heat-cells',
          type: 'fill',
          source: 'sj-heat-cells',
          paint: {
            'fill-color': ['get', 'color'],
            'fill-opacity': 1,
          },
        },
        beforeId,
      );
    }

    if (!map.getLayer('sj-heat-cells-sim-outline')) {
      map.addLayer(
        {
          id: 'sj-heat-cells-sim-outline',
          type: 'line',
          source: 'sj-heat-cells',
          filter: ['==', ['get', 'sim'], 1],
          paint: {
            'line-color': '#7b2cbf',
            'line-width': 1.5,
            'line-dasharray': [2, 2],
          },
        },
        beforeId,
      );
    }

    // Refresh grid data on weather updates
    const refreshGrid = () => {
      const d = buildGridFeatures(pack);
      map.getSource('sj-rain-cells')?.setData(d.rain);
      map.getSource('sj-heat-cells')?.setData(d.heat);
    };
    onGrid(refreshGrid);

    // Start RainViewer radar feed and wire raster layer
    startRadarFeed((tileUrl) => {
      if (!tileUrl || !map.isStyleLoaded()) return;
      const bId = map.getLayer('sj-hotspots') ? 'sj-hotspots' : undefined;
      if (!map.getSource('sj-radar')) {
        map.addSource('sj-radar', {
          type: 'raster',
          tiles: [tileUrl],
          tileSize: 256,
          maxzoom: RAINVIEWER_MAXZOOM,
          attribution: RAINVIEWER_ATTRIBUTION,
        });
        map.addLayer(
          {
            id: 'sj-radar',
            type: 'raster',
            source: 'sj-radar',
            layout: {
              visibility: radarEnabled && currentHazard === 'flood' ? 'visible' : 'none',
            },
            paint: {
              'raster-opacity': 0.65,
            },
          },
          bId,
        );
      }
    });

    // Initial visibility apply
    showWeatherHazard(map, currentHazard);
  };

  if (map.isStyleLoaded()) setup();
  else map.once('load', setup);
}
