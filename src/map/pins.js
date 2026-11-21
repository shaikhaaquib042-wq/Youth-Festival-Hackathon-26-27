// Pin layers (PRD §5, §6, §21.5, §22.3): hotspots, live/simulated reports, cooling points.
// Colour = severity; every popup shows source + age + evidence. Layers are grouped by hazard (Flood | Heat).
import maplibregl from 'maplibre-gl';
import { getPins, subscribe, now } from '../store.js';
import { pinSeverity, minutesLeft } from '../engine/lifecycle.js';
import { CONFIG } from '../../config.js';
import { t, onLang } from '../i18n/index.js';

export const SEV_COLOR = { red: '#d62828', orange: '#f0710f', yellow: '#e5b400', green: '#1f9d55', grey: '#8a94a3', none: '#8a94a3' };
const AMENITY_COLOR = { water: '#1c7ed6', ors: '#9c36b5', clinic: '#e03131', shade: '#2f9e44', toilet: '#495057', cool_room: '#0c8599' };

export const LAYERS = {
  flood: ['sj-hotspots', 'sj-hotspots-label', 'sj-reports-halo', 'sj-reports', 'sj-reports-label'],
  heat: ['sj-cool-clusters', 'sj-cool-count', 'sj-cooling'],
};

const fc = (features) => ({ type: 'FeatureCollection', features });
const pt = (p, props) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [p.lng, p.lat] }, properties: { id: p.id, ...props } });

let mode = 'commuter';
export const setMode = (m) => { mode = m; };

function build() {
  const pins = getPins();
  const hot = [], rep = [], cool = [];
  for (const p of pins) {
    if (p.type === 'hotspot') hot.push(pt(p, { name: p.name, under: p.inUnderpass }));
    else if (p.type === 'cooling') cool.push(pt(p, { a: p.amenities?.[0] ?? 'water' }));
    else if (p.status !== 'cleared') {
      const sev = pinSeverity(p, { mode });
      rep.push(pt(p, { color: SEV_COLOR[sev], sev, status: p.status, sim: p.simulated ? 1 : 0, type: p.type }));
    }
  }
  return { hot: fc(hot), rep: fc(rep), cool: fc(cool), byId: new Map(pins.map((p) => [p.id, p])) };
}

/**
 * Adds all pin layers. `actions` = { onVote(pin, 'still'|'cleared') } from the UI (login-gated there).
 */
export function addPinLayers(map, actions = {}) {
  let index = new Map();
  const setup = () => {
    const d = build(); index = d.byId;
    map.addSource('sj-hotspots', { type: 'geojson', data: d.hot });
    map.addSource('sj-reports', { type: 'geojson', data: d.rep });
    map.addSource('sj-cooling', { type: 'geojson', data: d.cool, cluster: true, clusterMaxZoom: 14, clusterRadius: 40 });

    map.addLayer({ id: 'sj-hotspots', type: 'circle', source: 'sj-hotspots', paint: {
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 9, 4, 14, 9], 'circle-color': 'rgba(138,148,163,0.25)',
      'circle-stroke-color': '#5b6470', 'circle-stroke-width': ['case', ['get', 'under'], 2.5, 1.5] } });
    map.addLayer({ id: 'sj-hotspots-label', type: 'symbol', source: 'sj-hotspots', minzoom: 13, layout: {
      'text-field': ['get', 'name'], 'text-size': 11, 'text-offset': [0, 1.2], 'text-anchor': 'top', 'text-font': ['Noto Sans Regular'] },
      paint: { 'text-color': '#5b6470', 'text-halo-color': '#fff', 'text-halo-width': 1.2 } });

    map.addLayer({ id: 'sj-reports-halo', type: 'circle', source: 'sj-reports', filter: ['==', ['get', 'sev'], 'red'], paint: {
      'circle-radius': 22, 'circle-color': '#d62828', 'circle-opacity': 0.18 } });
    map.addLayer({ id: 'sj-reports', type: 'circle', source: 'sj-reports', paint: {
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 9, 6, 14, 11], 'circle-color': ['get', 'color'],
      'circle-opacity': ['match', ['get', 'status'], 'stale', 0.35, 'unverified', 0.75, 1],
      'circle-stroke-color': ['case', ['==', ['get', 'sim'], 1], '#7b2cbf', '#ffffff'],
      'circle-stroke-width': ['case', ['==', ['get', 'sim'], 1], 3, 2] } });
    map.addLayer({ id: 'sj-reports-label', type: 'symbol', source: 'sj-reports', filter: ['==', ['get', 'sim'], 1], layout: {
      'text-field': 'SIM', 'text-size': 9, 'text-offset': [0, -1.6], 'text-font': ['Noto Sans Medium'] },
      paint: { 'text-color': '#7b2cbf', 'text-halo-color': '#fff', 'text-halo-width': 1.5 } });

    map.addLayer({ id: 'sj-cool-clusters', type: 'circle', source: 'sj-cooling', filter: ['has', 'point_count'], paint: {
      'circle-color': '#0c8599', 'circle-opacity': 0.8, 'circle-radius': ['step', ['get', 'point_count'], 12, 20, 16, 100, 22] } });
    map.addLayer({ id: 'sj-cool-count', type: 'symbol', source: 'sj-cooling', filter: ['has', 'point_count'], layout: {
      'text-field': ['get', 'point_count_abbreviated'], 'text-size': 11, 'text-font': ['Noto Sans Medium'] }, paint: { 'text-color': '#fff' } });
    map.addLayer({ id: 'sj-cooling', type: 'circle', source: 'sj-cooling', filter: ['!', ['has', 'point_count']], paint: {
      'circle-radius': 6, 'circle-color': ['match', ['get', 'a'], ...Object.entries(AMENITY_COLOR).flat(), '#0c8599'],
      'circle-stroke-color': '#fff', 'circle-stroke-width': 1.5 } });

    const refresh = () => {
      const n = build(); index = n.byId;
      map.getSource('sj-hotspots')?.setData(n.hot);
      map.getSource('sj-reports')?.setData(n.rep);
      map.getSource('sj-cooling')?.setData(n.cool);
    };
    subscribe(refresh);
    onLang(refresh);

    for (const id of ['sj-reports', 'sj-hotspots', 'sj-cooling']) {
      map.on('click', id, (e) => {
        const p = index.get(e.features[0].properties.id);
        if (p) new maplibregl.Popup({ maxWidth: '300px' }).setLngLat([p.lng, p.lat]).setDOMContent(popup(p, actions)).addTo(map);
      });
      map.on('mouseenter', id, () => { map.getCanvas().style.cursor = 'pointer'; });
      map.on('mouseleave', id, () => { map.getCanvas().style.cursor = ''; });
    }
    map.on('click', 'sj-cool-clusters', async (e) => {
      const f = e.features[0];
      const z = await map.getSource('sj-cooling').getClusterExpansionZoom(f.properties.cluster_id);
      map.easeTo({ center: f.geometry.coordinates, zoom: z });
    });
  };
  if (map.isStyleLoaded()) setup(); else map.once('load', setup);
}

/** Show only the layers for one hazard. */
export function showHazard(map, hazard) {
  const apply = () => {
    for (const [h, ids] of Object.entries(LAYERS)) for (const id of ids) {
      if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', h === hazard ? 'visible' : 'none');
    }
  };
  if (map.getLayer('sj-reports')) apply(); else map.once('idle', apply);
}

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function popup(p, actions) {
  const el = document.createElement('div');
  el.className = 'pin-popup';
  const ageMin = Math.max(0, Math.round((now() - Date.parse(p.createdAt)) / 60000));
  const sev = pinSeverity(p, { mode });
  const title = p.type === 'hotspot' ? t('hotspot.known')
    : p.type === 'cooling' ? t('cooling.point')
    : p.type === 'clog' ? t('action.reportClog') : t('action.reportFlood');
  const lines = [];
  if (p.simulated) lines.push(`<span class="tag-sim">${esc(t('tag.simulated'))}</span>`);
  if (p.name || p.near) lines.push(`<b>${esc(p.name ?? t('report.near', { name: p.near }))}</b>`);
  if (p.type === 'flood') lines.push(`${esc(t('depth.' + p.depth) || '')}${p.inUnderpass ? ' · ' + esc(t('pin.underpass')) : ''}`);
  if (p.type === 'cooling') lines.push(esc((p.amenities ?? []).map((a) => t('amenity.' + a)).join(' · ')));
  if (p.type === 'flood' || p.type === 'clog') {
    lines.push(`<span class="sev sev-${sev}">${esc(t('status.' + p.status))}</span>`);
    lines.push(esc(t('report.evidence', { n: p.confirmations + 1, age: ageMin })));
    const left = minutesLeft(p, now(), CONFIG);
    if (left != null && p.status !== 'stale') lines.push(`<small>${esc(t('pin.expiresIn', { n: left }))}</small>`);
    if (p.nearHotspot) lines.push(`<small>${esc(t('pin.knownSpot'))}</small>`);
  }
  lines.push(`<small>${esc(t('pin.source', { name: p.source.name }))}${p.type !== 'hotspot' && p.type !== 'cooling' ? '' : ''}</small>`);
  if (p.source.url) lines.push(`<small><a href="${esc(p.source.url)}" target="_blank" rel="noopener">↗</a></small>`);
  if (p.photo) lines.push(`<img src="${esc(p.photo)}" alt="" class="pin-photo">`);
  el.innerHTML = `<div class="pin-title">${esc(title)}</div>${lines.map((l) => `<div>${l}</div>`).join('')}`;

  if ((p.type === 'flood' || p.type === 'clog') && !p.simulated && actions.onVote) {
    const row = document.createElement('div');
    row.className = 'vote-row';
    for (const v of ['still', 'cleared']) {
      const b = document.createElement('button');
      b.textContent = t(v === 'still' ? 'action.stillThere' : 'action.cleared');
      b.onclick = () => actions.onVote(p, v);
      row.append(b);
    }
    el.append(row);
  }
  return el;
}
