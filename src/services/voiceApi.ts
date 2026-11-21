import type { Language, VoiceGender } from '../app/types';

const languageCodes: Record<Language, string> = {
  English: 'en',
  Hindi: 'hi',
  Marathi: 'mr',
};

const configuredBaseUrl = (import.meta.env.VITE_VOICE_API_BASE_URL || '').trim().replace(/\/+$/, '');
const baseUrl = configuredBaseUrl || 'http://127.0.0.1:8000';

export function voiceApiId(language: Language, gender: VoiceGender): string {
  return `${languageCodes[language]}_${gender}`;
}

export function voiceApiBaseUrl(): string {
  return baseUrl;
}

export async function synthesizeWithVoiceApi({
  text,
  language,
  gender,
  speed,
  pitch,
  signal,
}: {
  text: string;
  language: Language;
  gender: VoiceGender;
  speed: number;
  pitch: number;
  signal?: AbortSignal;
}): Promise<Blob> {
  const response = await fetch(`${baseUrl}/synthesize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'audio/wav' },
    body: JSON.stringify({
      text,
      voice: voiceApiId(language, gender),
      speed,
      pitch,
      energy: 0.9,
      normalize: true,
    }),
    signal,
  });

  if (!response.ok) {
    throw new Error('Voice service could not synthesize this result.');
  }

  const contentType = response.headers.get('content-type')?.toLowerCase() ?? '';
  if (!contentType.includes('audio/wav')) {
    throw new Error('Voice service returned an unsupported audio format.');
  }

  const audio = await response.blob();
  if (!audio.size) {
    throw new Error('Voice service returned an empty audio file.');
  }
  return audio;
}
