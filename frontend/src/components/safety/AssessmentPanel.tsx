import { useEffect, useState } from 'react';
import { AlertTriangle, Volume2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Card, Button, ModeBadge } from '../common/Primitives';
import type { AssessmentResponse, Assessment } from '../../schemas/contracts';
import { displayTime } from '../../utils/safety';

const ranks = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
export function Recommendations({
  recommendations,
}: {
  recommendations: Assessment['recommendations'];
}) {
  const { t, i18n } = useTranslation();
  return (
    <ol className="recommendations">
      {[...recommendations]
        .sort((a, b) => ranks[a.priority] - ranks[b.priority])
        .map((item, index) => (
          <li
            key={`${item.code}-${index}`}
            className={item.priority === 'CRITICAL' ? 'urgent' : ''}
          >
            <span className="priority">{t(`priority.${item.priority}`)}</span>
            <strong>
              {t(
                i18n.exists(`recommendation.${item.code}`)
                  ? `recommendation.${item.code}`
                  : 'assessment.unknownCode',
              )}
            </strong>
          </li>
        ))}
    </ol>
  );
}
export function Limitations({ codes }: { codes: string[] }) {
  const { t, i18n } = useTranslation();
  return (
    <ul className="limitations">
      {[...new Set(codes)].map((code) => (
        <li key={code}>
          {t(i18n.exists(`limit.${code}`) ? `limit.${code}` : 'assessment.unknownLimitation')}
        </li>
      ))}
    </ul>
  );
}
export function SpeechButton({ assessment }: { assessment: Assessment }) {
  const { t, i18n } = useTranslation();
  const [speaking, setSpeaking] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  useEffect(
    () => () => {
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    },
    [],
  );
  const speak = () => {
    if (!('speechSynthesis' in window)) {
      setUnavailable(true);
      return;
    }
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }
    const voice = window.speechSynthesis
      .getVoices()
      .find((item) => item.lang.toLowerCase().startsWith(i18n.language));
    if (!voice) {
      setUnavailable(true);
      return;
    }
    const text = [...assessment.recommendations]
      .sort((a, b) => ranks[a.priority] - ranks[b.priority])
      .map((item) =>
        t(
          i18n.exists(`recommendation.${item.code}`)
            ? `recommendation.${item.code}`
            : 'assessment.unknownCode',
        ),
      )
      .join('. ');
    const utterance = new SpeechSynthesisUtterance(
      `${text}. ${t('limit.HYDRATION_ONLY_WHEN_CONSCIOUS_AND_ABLE_TO_SWALLOW')}. ${t('limit.NOT_PERMISSION_TO_CONTINUE_WORK')}`,
    );
    utterance.voice = voice;
    utterance.lang = voice.lang;
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => {
      setSpeaking(false);
      setUnavailable(true);
    };
    setUnavailable(false);
    window.speechSynthesis.speak(utterance);
    setSpeaking(true);
  };
  return (
    <>
      <Button onClick={speak}>
        <Volume2 size={18} aria-hidden="true" />
        {t(speaking ? 'assessment.stopVoice' : 'assessment.listen')}
      </Button>
      {unavailable && <p role="status">{t('assessment.voiceUnavailable')}</p>}
    </>
  );
}
export function AssessmentPanel({
  response,
  title,
}: {
  response: AssessmentResponse;
  title?: string;
}) {
  const { t, i18n } = useTranslation();
  const a = response.assessment;
  const e = a.environmentalIndicators;
  return (
    <Card
      title={title ?? t('assessment.title')}
      className={`assessment severity-${a.advisoryLevel.toLowerCase()}`}
    >
      <div className="row wrap">
        <ModeBadge mode={response.dataMode} />
        <span className="badge">
          {t('assessment.engine')}: {a.engineVersion}
        </span>
      </div>
      <div className="advisory-heading" role={a.advisoryLevel === 'CRITICAL' ? 'alert' : 'status'}>
        <AlertTriangle aria-hidden="true" />
        <h3>{t(`advisory.${a.advisoryLevel}`)}</h3>
      </div>
      <p className="safety-note">{t('limit.NOT_PERMISSION_TO_CONTINUE_WORK')}</p>
      <div className="metrics">
        <div>
          <span>{t('weather.heatIndex')}</span>
          <strong>{e.heatIndexC === null ? '—' : `${e.heatIndexC}°C`}</strong>
        </div>
        <div>
          <span>{t('assessment.environmental')}</span>
          <strong>{t(`advisory.${e.environmentalAdvisoryLevel}`)}</strong>
        </div>
        <div>
          <span>{t('field.temperature')}</span>
          <strong>{e.temperatureC === null ? '—' : `${e.temperatureC}°C`}</strong>
        </div>
      </div>
      <h3>{t('assessment.recommendations')}</h3>
      <Recommendations recommendations={a.recommendations} />
      <SpeechButton assessment={a} />
      <h3>{t('assessment.factors')}</h3>
      {a.factors.length ? (
        <ul className="chips">
          {a.factors.map((factor) => (
            <li key={factor}>
              {t(i18n.exists(`factor.${factor}`) ? `factor.${factor}` : 'assessment.unknownFactor')}
            </li>
          ))}
        </ul>
      ) : (
        <p>{t('assessment.noFactors')}</p>
      )}
      <h3>{t('assessment.limitations')}</h3>
      <Limitations codes={[a.disclaimerCode, ...a.limitations]} />
      <p className="small">
        {t('weather.source')}: {a.source ?? '—'} · {t('weather.observed')}:{' '}
        {displayTime(a.observedAt, undefined, i18n.language)}
      </p>
    </Card>
  );
}
