// Weather grid layers (PRD §7, §21, §22.1).
// Flood side: regional rainfall cells + RainViewer radar (maxzoom 7).
// Heat side: regional temperature cells with IMD colour bands (CONFIG.HEAT.MAP_BANDS_C).
// Cell polygons: square of pack.grid.cellDeg around each point.
// Inserted BELOW pin layers (sj-hotspots).
import { CONFIG, cityPack } from '../../config.js';
import { getGrid, onGrid } from '../feeds/openmeteo.js';
import { startRadarFeed, RAINVIEWER_MAXZOOM, RAINVIEWER_ATTRIBUTION } from '../feeds/rainviewer.js';
import { t, onLang } from '../i18n/index.js';

export const WEATHER_LAYERS = {
  flood: [
    'sj-radar',
    'sj-rain-cells',
    'sj-rain-cells-sim-outline',
    'sj-rain-cells-label',
    'sj-rain-cells-sim-label',
  ],
  heat: [
    'sj-heat-cells',
    'sj-heat-cells-sim-outline',
    'sj-heat-cells-label',
    'sj-heat-cells-sim-label',
  ],
};

let currentMap = null;
let currentHazard = 'flood';
let radarEnabled = false;
let radarControlBtn = null;
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
  if (precip >= 7.5 || maxHourly >= 7.5) return 'rgba(24, 100, 171, 0.45)';
  if (precip >= 2.5 || maxHourly >= 2.5 || prob >= 80) return 'rgba(34, 139, 230, 0.35)';
  if (precip > 0 || prob >= 50) return 'rgba(116, 192, 252, 0.25)';
  return 'rgba(0, 0, 0, 0)';
}

function getHeatColor(temp = 0, bands = CONFIG.HEAT.MAP_BANDS_C) {
  const b = bands ?? { amber: 37, red: 40, severe: 45 };
  if (temp >= b.severe) return 'rgba(201, 42, 42, 0.45)';
  if (temp >= b.red) return 'rgba(214, 40, 40, 0.38)';
  if (temp >= b.amber) return 'rgba(240, 113, 15, 0.30)';
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
        label: `${precip} mm`,
        color: getRainColor(precip, maxProb, maxHourlyPrecip),
      },
    });

    heatFeats.push({
      type: 'Feature',
      geometry: { type: 'Polygon', coordinates: [poly] },
      properties: {
        temp,
        sim,
        label: `${Math.round(temp)}°`,
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
  radarEnabled = visible;
  if (radarControlBtn) {
    radarControlBtn.setAttribute('aria-pressed', String(radarEnabled));
    radarControlBtn.classList.toggle('active', radarEnabled);
  }
  if (map?.getLayer('sj-radar')) {
    map.setLayoutProperty('sj-radar', 'visibility', (radarEnabled && currentHazard === 'flood') ? 'visible' : 'none');
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
          map.setLayoutProperty(id, 'visibility', (isFlood && radarEnabled) ? 'visible' : 'none');
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
    if (radarControlBtn) {
      radarControlBtn.style.display = isFlood ? '' : 'none';
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

  // Radar MapControl (top-right)
  class RadarControl {
    onAdd() {
      const el = document.createElement('div');
      el.className = 'maplibregl-ctrl maplibregl-ctrl-group';
      const btn = document.createElement('button');
      btn.className = 'sj-radar-toggle';
      btn.type = 'button';
      btn.setAttribute('aria-label', 'Radar');
      btn.setAttribute('aria-pressed', 'false');
      btn.title = t('radar.toggle');
      btn.innerHTML = '📡';
      btn.onclick = () => setRadarVisible(map, !radarEnabled);
      radarControlBtn = btn;
      if (currentHazard !== 'flood') btn.style.display = 'none';
      el.appendChild(btn);
      return el;
    }
    onRemove() {
      radarControlBtn = null;
    }
  }
  map.addControl(new RadarControl(), 'top-right');

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

    // Rain cell layers
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
            'line-width': 2.5,
            'line-dasharray': [2, 2],
          },
        },
        beforeId,
      );
    }

    if (!map.getLayer('sj-rain-cells-label')) {
      map.addLayer(
        {
          id: 'sj-rain-cells-label',
          type: 'symbol',
          source: 'sj-rain-cells',
          minzoom: 10,
          layout: {
            'text-field': ['get', 'label'],
            'text-size': 11,
            'text-font': ['Noto Sans Regular'],
          },
          paint: {
            'text-color': '#1864ab',
            'text-halo-color': '#ffffff',
            'text-halo-width': 1.5,
          },
        },
        beforeId,
      );
    }

    if (!map.getLayer('sj-rain-cells-sim-label')) {
      map.addLayer(
        {
          id: 'sj-rain-cells-sim-label',
          type: 'symbol',
          source: 'sj-rain-cells',
          filter: ['==', ['get', 'sim'], 1],
          minzoom: 10,
          layout: {
            'text-field': 'SIM',
            'text-size': 9,
            'text-offset': [0, -1.3],
            'text-font': ['Noto Sans Medium'],
          },
          paint: {
            'text-color': '#7b2cbf',
            'text-halo-color': '#ffffff',
            'text-halo-width': 1.5,
          },
        },
        beforeId,
      );
    }

    // Heat cell layers
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
            'line-width': 2.5,
            'line-dasharray': [2, 2],
          },
        },
        beforeId,
      );
    }

    if (!map.getLayer('sj-heat-cells-label')) {
      map.addLayer(
        {
          id: 'sj-heat-cells-label',
          type: 'symbol',
          source: 'sj-heat-cells',
          minzoom: 10,
          layout: {
            'text-field': ['get', 'label'],
            'text-size': 11,
            'text-font': ['Noto Sans Regular'],
          },
          paint: {
            'text-color': '#c92a2a',
            'text-halo-color': '#ffffff',
            'text-halo-width': 1.5,
          },
        },
        beforeId,
      );
    }

    if (!map.getLayer('sj-heat-cells-sim-label')) {
      map.addLayer(
        {
          id: 'sj-heat-cells-sim-label',
          type: 'symbol',
          source: 'sj-heat-cells',
          filter: ['==', ['get', 'sim'], 1],
          minzoom: 10,
          layout: {
            'text-field': 'SIM',
            'text-size': 9,
            'text-offset': [0, -1.3],
            'text-font': ['Noto Sans Medium'],
          },
          paint: {
            'text-color': '#7b2cbf',
            'text-halo-color': '#ffffff',
            'text-halo-width': 1.5,
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
    onLang(() => {
      if (radarControlBtn) radarControlBtn.title = t('radar.toggle');
    });

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
