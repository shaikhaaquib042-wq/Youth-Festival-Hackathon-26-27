import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useProfile } from '../../context/ProfileContext';
import { constructionScenario } from '../../constants/options';
import { workerSchema } from '../../schemas/contracts';
import type { Location } from '../../schemas/contracts';
import { WorkFields } from '../profile/WorkFields';
import { LocationPicker } from '../profile/LocationPicker';
import { Button, Card } from '../../components/common/Primitives';

export default function OnboardingPage() {
  const { profile, language, saveProfile, storageWarning } = useProfile();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [draft, setDraft] = useState(profile ?? constructionScenario);
  const [location, setLocation] = useState<Location | null>(profile?.location ?? null);
  const [step, setStep] = useState(0);
  const [error, setError] = useState('');
  const heading = useRef<HTMLHeadingElement>(null);
  const labels = ['page.work', 'page.conditions', 'page.locationReview'];
  const go = (next: number) => {
    setStep(next);
    setError('');
    requestAnimationFrame(() => heading.current?.focus());
  };
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (
      step === 0 &&
      (!/^([01]\d|2[0-3]):[0-5]\d$/.test(draft.workStart) ||
        !/^([01]\d|2[0-3]):[0-5]\d$/.test(draft.workEnd) ||
        draft.workStart >= draft.workEnd)
    ) {
      setError('ui.sameDay');
      return;
    }
    if (step < 2) {
      go(step + 1);
      return;
    }
    const result = workerSchema.safeParse({ ...draft, language, location });
    if (!result.success) {
      setError(
        result.error.issues.some((issue) => issue.path.includes('workEnd'))
          ? 'ui.sameDay'
          : 'ui.required',
      );
      return;
    }
    saveProfile(result.data);
    navigate('/worker/dashboard');
  };
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">SunShield / {t('nav.profile')}</span>
          <h1>{t('page.onboarding')}</h1>
          <p>{t('ui.sameDay')}</p>
        </div>
      </div>
      <Card>
        <ol className="steps" aria-label={t('ui.review')}>
          {labels.map((label, index) => (
            <li key={label}>
              <Button
                className={step === index ? 'active' : ''}
                aria-current={step === index ? 'step' : undefined}
                onClick={() => go(index)}
              >
                {index + 1}. {t(label)}
              </Button>
            </li>
          ))}
        </ol>
        <form onSubmit={submit}>
          <h2 tabIndex={-1} ref={heading}>
            {t(labels[step])}
          </h2>
          {step < 2 ? (
            <WorkFields
              value={draft}
              onChange={(next) => setDraft({ ...draft, ...next })}
              section={step === 0 ? 'work' : 'conditions'}
            />
          ) : (
            <>
              <LocationPicker value={location} onChange={setLocation} />
              <dl className="review-grid">
                <div>
                  <dt>{t('field.occupation')}</dt>
                  <dd>{t(`enum.${draft.occupation}`)}</dd>
                </div>
                <div>
                  <dt>{t('field.workload')}</dt>
                  <dd>{t(`enum.${draft.workload}`)}</dd>
                </div>
                <div>
                  <dt>{t('plan.schedule')}</dt>
                  <dd>
                    {draft.workStart}–{draft.workEnd}
                  </dd>
                </div>
                <div>
                  <dt>{t('field.waterAccess')}</dt>
                  <dd>{t(`enum.${draft.waterAccess}`)}</dd>
                </div>
                <div>
                  <dt>{t('field.shadeAccess')}</dt>
                  <dd>{t(`enum.${draft.shadeAccess}`)}</dd>
                </div>
              </dl>
            </>
          )}
          {error && (
            <p className="feedback error" role="alert">
              {t(error)}
            </p>
          )}
          {storageWarning && <p role="status">{t('ui.storageWarning')}</p>}
          <div className="row wrap form-actions">
            {step > 0 && <Button onClick={() => go(step - 1)}>{t('ui.back')}</Button>}
            <Button className="primary" type="submit">
              {t(step === 2 ? 'ui.save' : 'ui.continue')}
            </Button>
          </div>
        </form>
      </Card>
    </>
  );
}
