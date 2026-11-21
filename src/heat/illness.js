/**
 * Heat Illness Signs & Triage module for Sajag (PRD §21.4).
 *
 * NEW I18N KEYS (for the orchestrator to add to src/i18n/en.js and translate):
 * - 'unwell.sign.confusion': 'Confusion or strange behaviour'
 * - 'unwell.sign.slurredSpeech': 'Slurred speech'
 * - 'unwell.sign.fainting': 'Fainting or collapse'
 * - 'unwell.sign.seizure': 'Seizure'
 * - 'unwell.sign.hotSkin': 'Very hot skin'
 * - 'unwell.sign.nonsense': 'Stopped making sense'
 * - 'unwell.sign.heavySweating': 'Heavy sweating'
 * - 'unwell.sign.clammySkin': 'Cold clammy skin'
 * - 'unwell.sign.dizziness': 'Dizziness'
 * - 'unwell.sign.headache': 'Headache'
 * - 'unwell.sign.nausea': 'Nausea or vomiting'
 * - 'unwell.sign.cramps': 'Muscle cramps'
 * - 'unwell.sign.weakness': 'Weakness'
 * - 'unwell.sign.fastPulse': 'Fast pulse'
 */

/**
 * RED FLAGS — Heat Stroke, Emergency (Call 108 immediately).
 */
export const RED_FLAGS = [
  { id: 'confusion', i18nKey: 'unwell.sign.confusion' },
  { id: 'slurred_speech', i18nKey: 'unwell.sign.slurredSpeech' },
  { id: 'fainting', i18nKey: 'unwell.sign.fainting' },
  { id: 'seizure', i18nKey: 'unwell.sign.seizure' },
  { id: 'hot_skin', i18nKey: 'unwell.sign.hotSkin' },
  { id: 'nonsense', i18nKey: 'unwell.sign.nonsense' },
];

/**
 * WARNING SIGNS — Heat Exhaustion (Stop work, cool down, rest in shade).
 */
export const WARNING_SIGNS = [
  { id: 'heavy_sweating', i18nKey: 'unwell.sign.heavySweating' },
  { id: 'clammy_skin', i18nKey: 'unwell.sign.clammySkin' },
  { id: 'dizziness', i18nKey: 'unwell.sign.dizziness' },
  { id: 'headache', i18nKey: 'unwell.sign.headache' },
  { id: 'nausea', i18nKey: 'unwell.sign.nausea' },
  { id: 'cramps', i18nKey: 'unwell.sign.cramps' },
  { id: 'weakness', i18nKey: 'unwell.sign.weakness' },
  { id: 'fast_pulse', i18nKey: 'unwell.sign.fastPulse' },
];

const RED_FLAG_IDS = new Set(RED_FLAGS.map((item) => item.id));
const WARNING_SIGN_IDS = new Set(WARNING_SIGNS.map((item) => item.id));

/**
 * Triages reported symptom IDs into urgency categories.
 *
 * @param {string[]|Set<string>} selectedIds - List or Set of selected symptom IDs
 * @returns {'emergency'|'exhaustion'|'ok'}
 */
export function triage(selectedIds) {
  if (!selectedIds) return 'ok';
  const ids = Array.isArray(selectedIds) ? selectedIds : Array.from(selectedIds);
  if (ids.length === 0) return 'ok';

  for (const id of ids) {
    if (RED_FLAG_IDS.has(id)) {
      return 'emergency';
    }
  }

  for (const id of ids) {
    if (WARNING_SIGN_IDS.has(id)) {
      return 'exhaustion';
    }
  }

  return 'ok';
}
