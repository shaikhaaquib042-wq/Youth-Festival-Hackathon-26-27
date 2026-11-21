import { LngLatBounds } from 'maplibre-gl';
import { classifyPost, matchPlaces } from '../engine/gazetteer.js';
import { makePin } from '../engine/pin.js';
import { onLang, t } from '../i18n/index.js';
import { addLocalPin, gazetteer, now } from '../store.js';

let sheet, post, source, preview, placesList, message, readButton, addButton;
let places = [], guess;

export function openPaste() {
  post.value = '';
  source.value = source.defaultValue;
  clearPreview();
  sheet.hidden = false;
  post.focus();
}

function closePaste() {
  sheet.hidden = true;
  document.getElementById('more-btn')?.focus();
}

function clearPreview() {
  places = [];
  guess = null;
  placesList.replaceChildren();
  preview.hidden = true;
  message.textContent = '';
  readButton.disabled = !post.value.trim();
}

function checkedPlaces() {
  return [...placesList.querySelectorAll('input:checked')].map((box) => places[Number(box.value)]);
}

function localize() {
  for (const label of sheet.querySelectorAll('[data-paste-label]')) {
    label.textContent = t(label.dataset.pasteLabel);
  }
  const usingDefault = source.value === source.defaultValue;
  source.defaultValue = t('paste.defaultSource');
  if (usingDefault) source.value = source.defaultValue;

  if (!guess) return;
  message.textContent = places.length ? '' : t('paste.noMatches');
  const details = [
    t(guess.type === 'clog' ? 'action.reportClog' : 'action.reportFlood'),
    guess.depthKnown ? t('depth.' + guess.depth) : t('paste.depthUnknown', { depth: t('depth.' + guess.depth) }),
    ...(guess.closed ? [t('paste.closed')] : []),
    ...(guess.underpass ? [t('pin.underpass')] : []),
  ].join(' · ');
  for (const detail of placesList.querySelectorAll('small')) detail.textContent = details;
}

function readPost() {
  places = matchPlaces(post.value, gazetteer);
  guess = classifyPost(post.value);
  placesList.replaceChildren(...places.map((place, index) => {
    const row = document.createElement('label');
    row.className = 'paste-place';
    const box = document.createElement('input');
    box.type = 'checkbox';
    box.value = index;
    box.checked = true;
    const text = document.createElement('span');
    text.textContent = place.name;
    text.append(document.createElement('small'));
    row.append(box, text);
    return row;
  }));
  preview.hidden = places.length === 0;
  addButton.disabled = preview.hidden;
  localize();
}

function addToMap(map) {
  const selected = checkedPlaces();
  if (!selected.length) return;
  const clockTime = now();
  const sourceName = source.value.trim() || t('paste.defaultSource');
  const bounds = new LngLatBounds();
  for (const { name, lat, lng } of selected) {
    const pin = makePin({
      name, lat, lng,
      type: guess.type,
      depth: guess.depth,
      inUnderpass: guess.underpass,
      passable: { bike: !guess.closed, car: !guess.closed },
      source: { kind: 'media', name: `Pasted: ${sourceName}` },
      status: 'unverified',
      createdAt: clockTime.toISOString(),
      simulated: false,
    });
    addLocalPin(pin, { clockTime });
    bounds.extend([lng, lat]);
  }
  if (document.body.dataset.hazard !== 'flood') {
    window.dispatchEvent(new CustomEvent('sajag:set-hazard', { detail: { hazard: 'flood' } }));
  }
  map.fitBounds(bounds, { padding: 60, maxZoom: 15 });
  closePaste();
  document.dispatchEvent(new CustomEvent('sajag:toast', {
    detail: t('paste.added', { n: selected.length }),
  }));
}

export function initPaste(map) {
  sheet = document.createElement('div');
  sheet.className = 'sheet-backdrop';
  sheet.hidden = true;
  sheet.innerHTML = `<section class="sheet paste-sheet" role="dialog" aria-modal="true" aria-labelledby="paste-title">
    <div class="rp-head">
      <h2 id="paste-title" data-paste-label="paste.title"></h2>
      <button type="button" class="btn btn-ghost" data-paste-label="paste.close"></button>
    </div>
    <textarea rows="5" aria-labelledby="paste-title"></textarea>
    <button type="button" class="btn btn-primary" data-paste-label="paste.read" disabled></button>
    <p class="muted" role="status"></p>
    <div class="paste-preview" hidden>
      <div class="paste-places"></div>
      <label class="field">
        <span data-paste-label="paste.sourceName"></span>
        <input type="text">
      </label>
      <button type="button" class="btn btn-primary" data-paste-label="paste.add"></button>
    </div>
    <p class="muted" data-paste-label="disclaimer"></p>
  </section>`;
  document.body.append(sheet);
  post = sheet.querySelector('textarea');
  source = sheet.querySelector('input[type=text]');
  preview = sheet.querySelector('.paste-preview');
  placesList = sheet.querySelector('.paste-places');
  message = sheet.querySelector('[role=status]');
  readButton = sheet.querySelector('[data-paste-label="paste.read"]');
  addButton = sheet.querySelector('[data-paste-label="paste.add"]');
  sheet.querySelector('[data-paste-label="paste.close"]').addEventListener('click', closePaste);
  sheet.addEventListener('click', (event) => { if (event.target === sheet) closePaste(); });
  sheet.addEventListener('keydown', (event) => { if (event.key === 'Escape') closePaste(); });
  post.addEventListener('input', clearPreview);
  readButton.addEventListener('click', readPost);
  placesList.addEventListener('change', () => { addButton.disabled = !checkedPlaces().length; });
  addButton.addEventListener('click', () => addToMap(map));
  onLang(localize);
}
