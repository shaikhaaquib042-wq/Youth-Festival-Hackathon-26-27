// Basemap: MapLibre + PMTiles + @protomaps/basemaps (PRD §11, §20). Worker extends this file with layers.
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Protocol } from 'pmtiles';
import { layers, namedFlavor } from '@protomaps/basemaps';
import { CONFIG, cityPack } from '../../config.js';

let protocolAdded = false;

export function createMap(container, pack = cityPack()) {
  if (!protocolAdded) {
    maplibregl.addProtocol('pmtiles', new Protocol().tile);
    protocolAdded = true;
  }
  const tilesUrl = new URL(`${CONFIG.TILES_BASE}/${pack.tiles}`, location.href).href;

  const map = new maplibregl.Map({
    container,
    center: pack.center,
    zoom: pack.regionZoom, // Q2 default: open on the region
    // = PMTiles extent (beyond it is blank). Packs cover the wider metro region, so there's room to pan at regionZoom.
    maxBounds: [[pack.bounds[0], pack.bounds[1]], [pack.bounds[2], pack.bounds[3]]],
    minZoom: 8,
    attributionControl: false,
    style: {
      version: 8,
      glyphs: 'https://protomaps.github.io/basemaps-assets/fonts/{fontstack}/{range}.pbf',
      sprite: 'https://protomaps.github.io/basemaps-assets/sprites/v4/light',
      sources: {
        protomaps: {
          type: 'vector',
          url: `pmtiles://${tilesUrl}`,
          attribution: '<a href="https://protomaps.com">Protomaps</a> © <a href="https://openstreetmap.org/copyright">OpenStreetMap</a>',
        },
      },
      layers: layers('protomaps', namedFlavor('light'), { lang: 'en' }),
    },
  });

  // Container can change size after init (split panes, PWA install, rotation) — keep the canvas filling it.
  new ResizeObserver(() => map.resize()).observe(map.getContainer());

  map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');
  map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
  return map;
}
