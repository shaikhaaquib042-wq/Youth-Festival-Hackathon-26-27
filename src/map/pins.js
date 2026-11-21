// Pin layers (PRD §5, §6, §21.5, §22.3): hotspots, live/simulated reports, cooling points.
// Colour = severity; every popup shows evidence first, then source + age.
// Layers grouped by hazard (Flood | Heat). Decluttered for low-literacy users.
import maplibregl from 'maplibre-gl';
import { getPins, subscribe, now } from '../store.js';
import { pinSeverity, minutesLeft } from '../engine/lifecycle.js';
import { getFix } from '../location.js';
import { depthIcon } from '../ui/depthIcons.js';
import { TIERS } from '../engine/pin.js';
import { CONFIG } from '../../config.js';
import { t, onLang } from '../i18n/index.js';
import { showWeatherHazard, WEATHER_LAYERS } from './weather.js';

export { WEATHER_LAYERS, showWeatherHazard };

export const SEV_COLOR = {
  red: '#d62828',
  orange: '#f0710f',
  yellow: '#e5b400',
  green: '#1f9d55',
  grey: '#8a94a3',
  none: '#8a94a3',
};

const AMENITY_COLOR = {
  water: '#1c7ed6',
  ors: '#9c36b5',
  clinic: '#e03131',
  shade: '#2f9e44',
  toilet: '#495057',
  cool_room: '#0c8599',
};

export const LAYERS = {
  flood: ['sj-hotspots', 'sj-hotspots-label', 'sj-reports-halo', 'sj-reports', 'sj-reports-label'],
  heat: ['sj-cool-clusters', 'sj-cool-count', 'sj-cooling'],
};

const fc = (features) => ({ type: 'FeatureCollection', features });

function webUrl(value) {
  if (typeof value !== 'string') return null;
  try {
    const url = new URL(value);
    return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password ? url.href : null;
  } catch {
    return null;
  }
}

function proofPhoto(pin) {
  const value = pin.photo;
  if (typeof value !== 'string' || value.length > 400_000) return null;
  // The local replay ships an SVG placeholder; shared reports only produce JPEG data URLs.
  if (pin.simulated && value.startsWith('data:image/svg+xml,')) return value;
  return /^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/.test(value) && value.trimEnd() === value ? value : null;
}

const pt = (p, props) => ({
  type: 'Feature',
  geometry: { type: 'Point', coordinates: [p.lng, p.lat] },
  properties: { id: p.id, ...props },
});

let mode = 'commuter';
let refreshMapPins = null;
let mapRef = null;
let currentHazard = 'flood';
let coolingVisible = false;
let routeActive = false;

export const setMode = (m) => {
  mode = m;
  if (refreshMapPins) refreshMapPins();
};

function build() {
  const pins = getPins();
  const hot = [], rep = [], cool = [];
  for (const p of pins) {
    if (!p.source?.name || !Number.isFinite(Date.parse(p.createdAt))) continue;
    if (p.type === 'hotspot') {
      hot.push(pt(p, { name: p.name, under: p.inUnderpass }));
    } else if (p.type === 'cooling') {
      cool.push(pt(p, { a: p.amenities?.[0] ?? 'water' }));
    } else if (p.status !== 'cleared') {
      const sev = pinSeverity(p, { mode });
      rep.push(
        pt(p, {
          color: SEV_COLOR[sev],
          sev,
          status: p.status,
          sim: p.simulated ? 1 : 0,
          type: p.type,
        }),
      );
    }
  }
  return { hot: fc(hot), rep: fc(rep), cool: fc(cool), byId: new Map(pins.map((p) => [p.id, p])) };
}

function updateHotspotsZoom() {
  if (!mapRef) return;
  const minz = routeActive ? 0 : 12;
  if (mapRef.getLayer('sj-hotspots')) {
    mapRef.setLayerZoomRange('sj-hotspots', minz, 24);
  }
  if (mapRef.getLayer('sj-hotspots-label')) {
    mapRef.setLayerZoomRange('sj-hotspots-label', minz, 24);
  }
}

function updateCoolingVisibility() {
  if (!mapRef) return;
  const isVisible = currentHazard === 'heat' && coolingVisible;
  for (const id of LAYERS.heat) {
    if (mapRef.getLayer(id)) {
      mapRef.setLayoutProperty(id, 'visibility', isVisible ? 'visible' : 'none');
    }
  }
}

/**
 * Adds all pin layers. `actions` = { onVote(pin, 'still'|'cleared') } from the UI (login-gated there).
 */
export function addPinLayers(map, actions = {}) {
  mapRef = map;
  let index = new Map();
  let openPopup = null, popupPinId = null;

  const setup = () => {
    const d = build();
    index = d.byId;
    map.addSource('sj-hotspots', { type: 'geojson', data: d.hot });
    map.addSource('sj-reports', { type: 'geojson', data: d.rep });
    map.addSource('sj-cooling', {
      type: 'geojson',
      data: d.cool,
      cluster: true,
      clusterMaxZoom: 14,
      clusterRadius: 40,
    });

    // Hotspot rings + labels: minzoom 12 by default (or zoom 0 if sajag:route is active)
    map.addLayer({
      id: 'sj-hotspots',
      type: 'circle',
      source: 'sj-hotspots',
      minzoom: routeActive ? 0 : 12,
      paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 9, 4, 14, 9],
        'circle-color': 'rgba(138,148,163,0.25)',
        'circle-stroke-color': '#5b6470',
        'circle-stroke-width': ['case', ['get', 'under'], 2.5, 1.5],
      },
    });

    map.addLayer({
      id: 'sj-hotspots-label',
      type: 'symbol',
      source: 'sj-hotspots',
      minzoom: routeActive ? 0 : 12,
      layout: {
        'text-field': ['get', 'name'],
        'text-size': 11,
        'text-offset': [0, 1.2],
        'text-anchor': 'top',
        'text-font': ['Noto Sans Regular'],
      },
      paint: {
        'text-color': '#5b6470',
        'text-halo-color': '#fff',
        'text-halo-width': 1.2,
      },
    });

    // Reports: always visible; purple ring on simulated; drop SIM text at zoom < 12
    map.addLayer({
      id: 'sj-reports-halo',
      type: 'circle',
      source: 'sj-reports',
      filter: ['==', ['get', 'sev'], 'red'],
      paint: {
        'circle-radius': 22,
        'circle-color': '#d62828',
        'circle-opacity': 0.18,
      },
    });

    map.addLayer({
      id: 'sj-reports',
      type: 'circle',
      source: 'sj-reports',
      paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 9, 6, 14, 11],
        'circle-color': ['get', 'color'],
        'circle-opacity': ['match', ['get', 'status'], 'stale', 0.35, 'unverified', 0.75, 1],
        'circle-stroke-color': ['case', ['==', ['get', 'sim'], 1], '#7b2cbf', '#ffffff'],
        'circle-stroke-width': ['case', ['==', ['get', 'sim'], 1], 3, 2],
      },
    });

    map.addLayer({
      id: 'sj-reports-label',
      type: 'symbol',
      source: 'sj-reports',
      filter: ['==', ['get', 'sim'], 1],
      minzoom: 12, // Drop SIM text label at zoom < 12 (keep purple ring)
      layout: {
        'text-field': 'SIM',
        'text-size': 9,
        'text-offset': [0, -1.6],
        'text-font': ['Noto Sans Medium'],
      },
      paint: {
        'text-color': '#7b2cbf',
        'text-halo-color': '#fff',
        'text-halo-width': 1.5,
      },
    });

    // Cooling layers: hidden by default
    map.addLayer({
      id: 'sj-cool-clusters',
      type: 'circle',
      source: 'sj-cooling',
      filter: ['has', 'point_count'],
      layout: { visibility: 'none' },
      paint: {
        'circle-color': '#0c8599',
        'circle-opacity': 0.8,
        'circle-radius': ['step', ['get', 'point_count'], 12, 20, 16, 100, 22],
      },
    });

    map.addLayer({
      id: 'sj-cool-count',
      type: 'symbol',
      source: 'sj-cooling',
      filter: ['has', 'point_count'],
      layout: {
        visibility: 'none',
        'text-field': ['get', 'point_count_abbreviated'],
        'text-size': 11,
        'text-font': ['Noto Sans Medium'],
      },
      paint: { 'text-color': '#fff' },
    });

    map.addLayer({
      id: 'sj-cooling',
      type: 'circle',
      source: 'sj-cooling',
      filter: ['!', ['has', 'point_count']],
      layout: { visibility: 'none' },
      paint: {
        'circle-radius': 6,
        'circle-color': ['match', ['get', 'a'], ...Object.entries(AMENITY_COLOR).flat(), '#0c8599'],
        'circle-stroke-color': '#fff',
        'circle-stroke-width': 1.5,
      },
    });

    const refresh = () => {
      const n = build();
      index = n.byId;
      map.getSource('sj-hotspots')?.setData(n.hot);
      map.getSource('sj-reports')?.setData(n.rep);
      map.getSource('sj-cooling')?.setData(n.cool);
      const p = index.get(popupPinId);
      if (!p || p.status === 'cleared') openPopup?.remove();
    };
    refreshMapPins = refresh;
    subscribe(refresh);
    onLang(() => {
      const p = index.get(popupPinId);
      if (p) openPopup?.setDOMContent(popup(p, actions));
    });

    const pinLayers = ['sj-reports', 'sj-hotspots', 'sj-cooling'];
    map.on('click', pinLayers, (e) => {
      const f = e.features.find((feature) => feature.layer.id === 'sj-reports') ?? e.features[0];
      const p = index.get(f.properties.id);
      if (!p) return;
      openPopup?.remove();
      const next = new maplibregl.Popup({ maxWidth: '320px' })
        .setLngLat([p.lng, p.lat])
        .setDOMContent(popup(p, actions))
        .addTo(map);
      openPopup = next;
      popupPinId = p.id;
      next.on('close', () => {
        if (openPopup === next) { openPopup = null; popupPinId = null; }
      });
    });
    for (const id of pinLayers) {
      map.on('mouseenter', id, () => {
        map.getCanvas().style.cursor = 'pointer';
      });
      map.on('mouseleave', id, () => {
        map.getCanvas().style.cursor = '';
      });
    }

    map.on('click', 'sj-cool-clusters', async (e) => {
      const f = e.features[0];
      const z = await map.getSource('sj-cooling').getClusterExpansionZoom(f.properties.cluster_id);
      map.easeTo({ center: f.geometry.coordinates, zoom: z });
    });

    updateHotspotsZoom();
    updateCoolingVisibility();
  };

  if (map.isStyleLoaded()) setup();
  else map.once('load', setup);

  // Listen to route check active state
  window.addEventListener('sajag:route', (e) => {
    routeActive = Boolean(e.detail?.active);
    updateHotspotsZoom();
  });

  // Listen to cooling visibility toggle (Water / shade near me)
  window.addEventListener('sajag:show-cooling', (e) => {
    coolingVisible = Boolean(e.detail?.on);
    if (!coolingVisible && index.get(popupPinId)?.type === 'cooling') openPopup?.remove();
    updateCoolingVisibility();
    if (coolingVisible) {
      const fix = getFix();
      if (fix?.lat != null && fix?.lng != null && mapRef) {
        mapRef.flyTo({ center: [fix.lng, fix.lat], zoom: 15 });
      }
    }
  });

  // Listen to hazard change event
  window.addEventListener('sajag:hazard', (e) => {
    const p = index.get(popupPinId);
    if (p && (p.type === 'cooling' ? 'heat' : 'flood') !== e.detail?.hazard) openPopup?.remove();
    if (e.detail?.hazard && e.detail.hazard !== currentHazard) {
      showHazard(map, e.detail.hazard);
    }
  });
}

/** Show only the layers for one hazard. Cooling layers remain hidden until sajag:show-cooling. */
export function showHazard(map, hazard) {
  mapRef = map;
  currentHazard = hazard;
  coolingVisible = false; // Reset cooling visibility on hazard change

  const apply = () => {
    // Flood layers
    for (const id of LAYERS.flood) {
      if (map.getLayer(id)) {
        map.setLayoutProperty(id, 'visibility', hazard === 'flood' ? 'visible' : 'none');
      }
    }
    // Cooling layers: hidden by default
    updateCoolingVisibility();
    updateHotspotsZoom();
    showWeatherHazard(map, hazard);
  };

  if (map.getLayer('sj-reports')) apply();
  else map.once('idle', apply);
}

const esc = (s) =>
  String(s ?? '').replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]),
  );

function popup(p, actions) {
  const el = document.createElement('div');
  el.className = 'pin-popup';
  const ageMin = Math.max(0, Math.round((now() - Date.parse(p.createdAt)) / 60000));
  const sev = pinSeverity(p, { mode });
  const title =
    p.type === 'hotspot'
      ? t('hotspot.known')
      : p.type === 'cooling'
      ? t('cooling.point')
      : p.type === 'clog'
      ? t('action.reportClog')
      : t('action.reportFlood');

  const lines = [];
  const photo = proofPhoto(p);
  const sourceUrl = webUrl(p.source.url);

  // Simulated badge
  if (p.simulated) {
    lines.push(`<span class="tag-sim">${esc(t('tag.simulated'))}</span>`);
  }

  // Place name or nearest landmark
  if (p.name || p.near) {
    lines.push(`<b>${esc(p.name ?? t('report.near', { name: p.near }))}</b>`);
  }

  // Type specific details
  if (p.type === 'flood') {
    lines.push(
      `<div class="popup-depth-line">${depthIcon(p.depth, 20)} <span>${esc(t('depth.' + p.depth) || '')}${p.inUnderpass ? ' · ' + esc(t('pin.underpass')) : ''}</span></div>`,
    );
  }
  if (p.type === 'cooling') {
    lines.push(esc((p.amenities ?? []).map((a) => t('amenity.' + a)).join(' · ')));
  }

  // PRD §22: Evidence line FIRST, then source + age
  if (p.type === 'flood' || p.type === 'clog') {
    // 1. Evidence line with optional Proof badge
    const proofBadge = photo
      ? ` <span class="badge-proof">📷 ${esc(t('report.proofBadge'))}</span>`
      : '';
    lines.push(
      `<div><b>${esc(t('report.evidence', { n: p.confirmations + 1, age: ageMin }))}</b>${proofBadge}</div>`,
    );

    // 2. Source + age
    lines.push(
      `<small>${esc(t('pin.source', { name: p.source.name }))} · ${esc(t('pin.ageMin', { n: ageMin }))}</small>`,
    );

    // Status and extra metadata
    lines.push(`<span class="sev sev-${sev}">${esc(t('status.' + p.status))}</span>`);
    const left = minutesLeft(p, now(), CONFIG);
    if (left != null && p.status !== 'stale') {
      lines.push(`<small>${esc(t('pin.expiresIn', { n: left }))}</small>`);
    }
    if (p.nearHotspot) {
      lines.push(`<small>${esc(t('pin.knownSpot'))}</small>`);
    }
  } else {
    // Seed entries use the dataset timestamp. Live and simulated reports use their respective clock.
    const age = p.tier === TIERS.SEED
      ? new Intl.DateTimeFormat(document.documentElement.lang, { dateStyle: 'medium', timeZone: 'Asia/Kolkata' }).format(new Date(p.createdAt))
      : t('pin.ageMin', { n: ageMin });
    lines.push(`<small>${esc(t('pin.source', { name: p.source.name }))} · <time datetime="${esc(p.createdAt)}">${esc(age)}</time></small>`);
  }

  if (p.type === 'cooling') {
    // The useful action for a cooling point is getting there. OSM link = where the data comes from.
    if (Number.isFinite(p.lat) && Number.isFinite(p.lng)) {
      lines.push(`<a class="btn btn-primary popup-directions" href="https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}&travelmode=walking" target="_blank" rel="noopener">🧭 ${esc(t('cooling.directions'))}</a>`);
    }
    if (sourceUrl) lines.push(`<small><a href="${esc(sourceUrl)}" target="_blank" rel="noopener">OpenStreetMap ↗</a></small>`);
  } else if (sourceUrl) {
    lines.push(`<small><a href="${esc(sourceUrl)}" target="_blank" rel="noopener">↗</a></small>`);
  }
  if (photo) {
    lines.push(
      `<img src="${esc(photo)}" alt="Proof photo" class="pin-photo pin-photo-clickable" title="Tap to enlarge">`,
    );
  }

  el.innerHTML = `<div class="pin-title">${esc(title)}</div>${lines.map((l) => `<div>${l}</div>`).join('')}`;
  el.querySelector('.pin-photo')?.addEventListener('click', (event) => event.currentTarget.classList.toggle('enlarged'));

  // Big vote buttons with icons (✅ Still there / 🧹 Cleared) ≥ 48 px
  if ((p.type === 'flood' || p.type === 'clog') && !p.simulated && p.source.kind !== 'media' && actions.onVote) {
    const row = document.createElement('div');
    row.className = 'vote-row';

    const bStill = document.createElement('button');
    bStill.type = 'button';
    bStill.innerHTML = `✅ ${esc(t('action.stillThere'))}`;
    bStill.onclick = () => actions.onVote(p, 'still');
    row.append(bStill);

    const bClear = document.createElement('button');
    bClear.type = 'button';
    bClear.innerHTML = `🧹 ${esc(t('action.cleared'))}`;
    bClear.onclick = () => actions.onVote(p, 'cleared');
    row.append(bClear);

    el.append(row);
  }

  return el;
}
