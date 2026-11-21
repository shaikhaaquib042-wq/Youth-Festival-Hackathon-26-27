import type { Language, VoiceGender } from '../app/types';

const locale: Record<Language, string> = {
  English: 'en-IN',
  Hindi: 'hi-IN',
  Marathi: 'mr-IN',
};

export const speechSettings = {
  pitch: 1.1,
  rate: 0.95,
  volume: 1,
} as const;

type VoiceCandidate = Pick<SpeechSynthesisVoice, 'name' | 'lang'> & Partial<Pick<SpeechSynthesisVoice, 'default'>>;
type SpeechCallbacks = Pick<SpeechSynthesisUtterance, 'onstart' | 'onpause' | 'onresume' | 'onend' | 'onerror'>;

const preferredVoiceName = /\b(natural|neural|premium|enhanced|online|siri)\b/i;
const voiceGenderNames: Record<VoiceGender, RegExp> = {
  male: /\b(male|man|david|mark|guy|alex|daniel|george)\b/i,
  female: /\b(female|woman|zira|samantha|jenny|aria|eva|hazel|susan|victoria)\b/i,
};
let speechGeneration = 0;

export function voiceMatchesLanguage(voice: Pick<VoiceCandidate, 'lang'>, language: Language): boolean {
  const requested = locale[language].split('-')[0].toLowerCase();
  return voice.lang.toLowerCase().split('-')[0] === requested;
}

export function selectVoice<T extends VoiceCandidate>(
  voices: readonly T[],
  language: Language,
  gender?: VoiceGender,
): T | undefined {
  const requestedLocale = locale[language].toLowerCase();
  const languageVoices = voices.filter(voice => voiceMatchesLanguage(voice, language));
  const genderVoices = gender
    ? languageVoices.filter(voice => voiceGenderNames[gender].test(voice.name))
    : languageVoices;
  return genderVoices
    .slice()
    .sort((left, right) => {
      const score = (voice: T) =>
        (preferredVoiceName.test(voice.name) ? 3 : 0)
        + (voice.lang.toLowerCase() === requestedLocale ? 2 : 0)
        + (voice.default ? 0.1 : 0);
      return score(right) - score(left);
    })[0];
}

export function getAvailableVoices(language: Language): SpeechSynthesisVoice[] {
  if (!('speechSynthesis' in window)) return [];
  return window.speechSynthesis.getVoices().filter(voice => voiceMatchesLanguage(voice, language));
}

function waitForLanguageVoice(synthesis: SpeechSynthesis, language: Language): Promise<SpeechSynthesisVoice[]> {
  const initialVoices = synthesis.getVoices();
  if (selectVoice(initialVoices, language)) return Promise.resolve(initialVoices);

  return new Promise(resolve => {
    let latestVoices = initialVoices;
    const finish = () => {
      window.clearTimeout(timeout);
      synthesis.removeEventListener('voiceschanged', onVoicesChanged);
      resolve(latestVoices);
    };
    const onVoicesChanged = () => {
      latestVoices = synthesis.getVoices();
      if (selectVoice(latestVoices, language)) finish();
    };
    const timeout = window.setTimeout(finish, 1000);
    synthesis.addEventListener('voiceschanged', onVoicesChanged);
  });
}

export async function speak(
  text: string,
  language: Language,
  gender?: VoiceGender,
  options?: { pitch?: number; rate?: number },
  callbacks?: SpeechCallbacks,
): Promise<SpeechSynthesisUtterance | null> {
  if (!('speechSynthesis' in window)) {
    throw new Error('Speech synthesis is not supported in this browser.');
  }

  const synthesis = window.speechSynthesis;
  const request = ++speechGeneration;
  synthesis.cancel();
  const voices = await waitForLanguageVoice(synthesis, language);
  if (request !== speechGeneration) return null;
  const voice = selectVoice(voices, language, gender);
  if (!voice) {
    const genderText = gender ? ` ${gender}` : '';
    throw new Error(`A matching${genderText} ${language} voice is not available in this browser. The written report is still available.`);
  }

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = voice.lang;
  utterance.voice = voice;
  utterance.pitch = options?.pitch ?? speechSettings.pitch;
  utterance.rate = options?.rate ?? speechSettings.rate;
  utterance.volume = speechSettings.volume;
  if (callbacks) Object.assign(utterance, callbacks);
  synthesis.speak(utterance);
  return utterance;
}

export function speechAction(action: 'pause' | 'resume' | 'stop') {
  if (!('speechSynthesis' in window)) return;
  if (action === 'pause') window.speechSynthesis.pause();
  if (action === 'resume') window.speechSynthesis.resume();
  if (action === 'stop') {
    speechGeneration++;
    window.speechSynthesis.cancel();
  }
}
