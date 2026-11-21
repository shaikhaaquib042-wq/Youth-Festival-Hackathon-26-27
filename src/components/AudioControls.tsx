import { useEffect, useRef, useState } from 'react';
import { LoaderCircle, Pause, Play, RotateCcw, Square, Volume2 } from 'lucide-react';
import type { Language, VerificationReport, VoiceGender } from '../app/types';
import { t } from '../app/preferences';
import { createSpokenSummary } from '../core/spokenSummary';
import { speak, speechAction } from '../services/speech';
import { synthesizeWithVoiceApi } from '../services/voiceApi';

type PlaybackState = 'idle' | 'loading' | 'speaking' | 'paused' | 'stopped';
type PlaybackSource = 'voice-api' | 'browser' | null;

const languages: Language[] = ['English', 'Hindi', 'Marathi'];

export default function AudioControls({
  report,
  language,
}: {
  report: VerificationReport;
  language: Language;
}) {
  const [speechLanguage, setSpeechLanguage] = useState(language);
  const [gender, setGender] = useState<VoiceGender>('female');
  const [speed, setSpeed] = useState(0.95);
  const [pitch, setPitch] = useState(1.1);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [playback, setPlayback] = useState<PlaybackState>('idle');
  const playRequest = useRef(0);
  const abortController = useRef<AbortController | null>(null);
  const audioElement = useRef<HTMLAudioElement | null>(null);
  const audioUrl = useRef<string | null>(null);
  const source = useRef<PlaybackSource>(null);
  const label = (key: string) => t(key, language);
  const text = createSpokenSummary(report, speechLanguage);

  function releaseAudio() {
    const audio = audioElement.current;
    if (audio) {
      audio.onplay = null;
      audio.onpause = null;
      audio.onended = null;
      audio.onerror = null;
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
      audioElement.current = null;
    }
    if (audioUrl.current) {
      URL.revokeObjectURL(audioUrl.current);
      audioUrl.current = null;
    }
  }

  function stopCurrentPlayback() {
    playRequest.current++;
    abortController.current?.abort();
    abortController.current = null;
    releaseAudio();
    source.current = null;
    speechAction('stop');
  }

  useEffect(() => {
    setSpeechLanguage(language);
  }, [language]);

  useEffect(() => {
    stopCurrentPlayback();
    setPlayback('idle');
    setError('');
    setNotice('');
    return stopCurrentPlayback;
  }, [text, speechLanguage, gender, speed, pitch]);

  async function play() {
    stopCurrentPlayback();
    const request = playRequest.current;
    const isCurrent = () => request === playRequest.current;
    const controller = new AbortController();
    abortController.current = controller;
    const timeout = window.setTimeout(() => controller.abort(), 90_000);

    setError('');
    setNotice('');
    setPlayback('loading');

    try {
      const audioBlob = await synthesizeWithVoiceApi({
        text,
        language: speechLanguage,
        gender,
        speed,
        pitch,
        signal: controller.signal,
      });
      if (!isCurrent()) return;

      const url = URL.createObjectURL(audioBlob);
      audioUrl.current = url;
      const audio = new Audio(url);
      audioElement.current = audio;
      source.current = 'voice-api';
      audio.onplay = () => {
        if (isCurrent()) setPlayback('speaking');
      };
      audio.onpause = () => {
        if (isCurrent()) setPlayback('paused');
      };
      audio.onended = () => {
        if (isCurrent()) setPlayback('idle');
        releaseAudio();
      };
      audio.onerror = () => {
        if (!isCurrent()) return;
        releaseAudio();
        source.current = null;
        setPlayback('idle');
        setError(label('audioUnavailable'));
      };
      await audio.play();
      if (isCurrent()) setPlayback('speaking');
      return;
    } catch {
      releaseAudio();
      source.current = null;
      if (!isCurrent()) return;

      setNotice(label('audioServiceNotice'));
      try {
        const utterance = await speak(text, speechLanguage, gender, { pitch, rate: speed }, {
          onstart: () => {
            if (isCurrent()) setPlayback('speaking');
          },
          onpause: () => {
            if (isCurrent()) setPlayback('paused');
          },
          onresume: () => {
            if (isCurrent()) setPlayback('speaking');
          },
          onend: () => {
            if (isCurrent()) setPlayback('idle');
            source.current = null;
          },
          onerror: event => {
            if (event.error === 'canceled' || event.error === 'interrupted') return;
            if (isCurrent()) {
              setPlayback('idle');
              setError(label('audioUnavailable'));
            }
            source.current = null;
          },
        });
        if (!utterance || !isCurrent()) return;
        source.current = 'browser';
        setPlayback('speaking');
      } catch {
        if (isCurrent()) {
          setPlayback('idle');
          setError(label('audioUnavailable'));
        }
      }
    } finally {
      window.clearTimeout(timeout);
      if (abortController.current === controller) abortController.current = null;
    }
  }

  function pause() {
    if (source.current === 'voice-api') audioElement.current?.pause();
    else if (source.current === 'browser') speechAction('pause');
    setPlayback('paused');
  }

  function resume() {
    if (source.current === 'voice-api') {
      void audioElement.current?.play().catch(() => {
        setPlayback('idle');
        setError(label('audioUnavailable'));
      });
    } else if (source.current === 'browser') {
      speechAction('resume');
    }
    setPlayback('speaking');
  }

  function stop() {
    stopCurrentPlayback();
    setPlayback('stopped');
  }

  const statusText = playback === 'speaking'
    ? label('audioPlaying')
    : playback === 'loading'
      ? label('audioLoading')
      : playback === 'paused'
        ? label('audioPaused')
        : playback === 'stopped'
          ? label('audioStopped')
          : '';

  return <section className={`audio-box${playback === 'speaking' ? ' audio-speaking' : ''}`} aria-labelledby="audio-title">
    <h3 className="audio-title" id="audio-title"><Volume2 size={21} aria-hidden="true" />{label('listenTitle')}</h3>
    <p className="spoken-preview" lang={speechLanguage === 'Hindi' ? 'hi' : speechLanguage === 'Marathi' ? 'mr' : 'en'}>{text}</p>
    <p className="audio-help">{label('controlsHint')}</p>

    <fieldset className="voice-settings">
      <legend>{label('audioLanguage')}</legend>
      <div className="voice-language-buttons" role="group" aria-label={label('audioLanguage')}>
        {languages.map(value => <button
          key={value}
          type="button"
          aria-pressed={speechLanguage === value}
          className={speechLanguage === value ? 'selected' : ''}
          onClick={() => setSpeechLanguage(value)}
        >{value === 'Hindi' ? 'हिंदी' : value === 'Marathi' ? 'मराठी' : 'English'}</button>)}
      </div>
    </fieldset>

    <fieldset className="voice-settings">
      <legend>{label('voiceGender')}</legend>
      <div className="voice-language-buttons" role="group" aria-label={label('voiceGender')}>
        {(['male', 'female'] as VoiceGender[]).map(value => <button
          key={value}
          type="button"
          aria-pressed={gender === value}
          className={gender === value ? 'selected' : ''}
          onClick={() => setGender(value)}
        >{label(value === 'male' ? 'maleVoice' : 'femaleVoice')}</button>)}
      </div>
    </fieldset>

    <div className="voice-range-settings">
      <label>
        <span>{label('speakingSpeed')} <output>{speed.toFixed(2)}×</output></span>
        <input type="range" min="0.75" max="1.25" step="0.05" value={speed}
          aria-label={label('speakingSpeed')} onChange={event => setSpeed(Number(event.target.value))} />
      </label>
      <label>
        <span>{label('speechPitch')} <output>{pitch.toFixed(2)}×</output></span>
        <input type="range" min="0.8" max="1.4" step="0.05" value={pitch}
          aria-label={label('speechPitch')} onChange={event => setPitch(Number(event.target.value))} />
      </label>
    </div>

    <p className="audio-service-privacy">{label('audioServicePrivacy')}</p>
    <div className="audio-buttons" role="group" aria-label={label('listen')}>
      <button type="button" onClick={() => void play()} disabled={playback === 'loading'}>
        {playback === 'loading' ? <LoaderCircle className="spin" size={18} aria-hidden="true" /> : <Play size={18} aria-hidden="true" />}
        {label('play')}
      </button>
      <button type="button" onClick={pause} disabled={playback !== 'speaking'}><Pause size={18} aria-hidden="true" />{label('pause')}</button>
      <button type="button" onClick={resume} disabled={playback !== 'paused'}><RotateCcw size={18} aria-hidden="true" />{label('resume')}</button>
      <button type="button" onClick={() => void play()} disabled={playback === 'loading'}><RotateCcw size={18} aria-hidden="true" />{label('replay')}</button>
      <button type="button" onClick={stop} disabled={playback === 'idle' || playback === 'stopped'}><Square size={17} aria-hidden="true" />{label('stop')}</button>
    </div>
    {playback === 'speaking' && <p className="audio-playing-indicator" aria-hidden="true"><span className="audio-playing-dot" />{label('audioPlaying')}</p>}
    <p className="audio-status" role="status" aria-live="polite">{error || statusText}</p>
    {notice && <p className="audio-fallback-notice" role="status">{notice}</p>}
    <details className="audio-transcript">
      <summary>{label('transcript')}</summary>
      <p>{text}</p>
    </details>
  </section>;
}
