// Spoken-help detector (voice reporting, step V+). Pure: transcript text → is this a cry for help?
// Rule: be GENEROUS. Opening the Help sheet by mistake is harmless; missing a real cry is not.
// The same words go to Deepgram Nova-3 as `keyterm`s so they are heard more reliably.
// mr / hi / kn / te words are machine-written — native-speaker review pending (HANDOFF §3).

const WORDS = {
  en: ['help', 'help me', 'sos', 'emergency', 'ambulance', 'accident', 'injured', 'hurt', 'bleeding', 'drowning',
    'trapped', 'stuck', 'faint', 'fainted', 'unconscious', 'collapsed', 'dizzy', 'heart attack', "can't breathe",
    'cannot breathe', 'save me', 'save us'], // not 'police' / 'closed' — common in normal road reports
  // Latin transliterations Deepgram may emit for code-switched speech.
  latin: ['madat', 'madad', 'bachao', 'bachaao', 'bachav', 'vachva', 'wachva', 'sahaya', 'sahayam', 'kapadandi',
    'kapadi', 'chakkar', 'behosh', 'beshuddh'],
  mr: ['मदत', 'वाचवा', 'वाचव', 'अपघात', 'रुग्णवाहिका', 'ॲम्ब्युलन्स', 'अॅम्ब्युलन्स', 'बेशुद्ध', 'चक्कर', 'अडकलो',
    'अडकले', 'अडकला', 'बुडत', 'जखमी', 'रक्त'],
  hi: ['मदद', 'बचाओ', 'बचाइए', 'दुर्घटना', 'एक्सीडेंट', 'एम्बुलेंस', 'एंबुलेंस', 'बेहोश', 'फंस', 'फँस', 'डूब',
    'घायल', 'खून', 'चोट'],
  kn: ['ಸಹಾಯ', 'ಕಾಪಾಡಿ', 'ಅಪಘಾತ', 'ಆಂಬ್ಯುಲೆನ್ಸ್', 'ಪ್ರಜ್ಞೆ', 'ತಲೆಸುತ್ತು', 'ಮುಳುಗ', 'ಗಾಯ', 'ರಕ್ತ'],
  te: ['సహాయం', 'సాయం', 'కాపాడండి', 'కాపాడు', 'ప్రమాదం', 'అంబులెన్స్', 'స్పృహ', 'కళ్ళు తిరుగు', 'మునిగ', 'గాయ', 'రక్తం'],
};

// Emergency numbers in Latin or Devanagari digits, spoken or formatted ("1 0 8", "one zero eight").
const NUMBERS = /(^|\D)(1\s?0\s?8|1\s?1\s?2|१\s?०\s?८|१\s?१\s?२)(\D|$)|one\s+(zero|oh|o)\s+eight|one\s+one\s+two/;

const LATIN = new Set([...WORDS.en, ...WORDS.latin]);
const ALL = Object.values(WORDS).flat();

/** @returns {{help:boolean, matched:string|null}} */
export function detectHelp(text) {
  const s = ` ${String(text ?? '').toLowerCase().replace(/[.,!?;:"“”‘’()]+/g, ' ').replace(/\s+/g, ' ').trim()} `;
  if (!s.trim()) return { help: false, matched: null };
  const num = s.match(NUMBERS);
  if (num) return { help: true, matched: num[0].trim() };
  for (const w of ALL) {
    // Latin words: whole-word match (s is space-padded, punctuation stripped) so "fire" ≠ "firefly".
    // Indic words: substring match — stems carry suffixes (मदतीला, ಸಹಾಯಮಾಡಿ…).
    const hit = LATIN.has(w) ? s.includes(` ${w} `) : s.includes(w);
    if (hit) return { help: true, matched: w };
  }
  return { help: false, matched: null };
}

/** Short list for Deepgram `keyterm` prompting (keep it small — long lists slow recognition). */
export function sosKeyterms(lang = 'en') {
  const own = WORDS[lang] ?? [];
  return [...new Set(['help', 'ambulance', 'emergency', ...own.slice(0, 6)])];
}
