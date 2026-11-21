import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Card,
  Button,
  ErrorPanel,
  Field,
  Loading,
  ModeBadge,
} from '../../components/common/Primitives';
import { AssessmentPanel } from '../../components/safety/AssessmentPanel';
import { WorkFields } from '../profile/WorkFields';
import {
  constructionScenario,
  vendorScenario,
  demoConditions,
  presets,
} from '../../constants/options';
import { conditionsSchema, workerSchema } from '../../schemas/contracts';
import type { Conditions, WorkerProfile } from '../../schemas/contracts';
import { evaluateSimulation, healthOptions } from '../../services/queries';
import { useProfile } from '../../context/ProfileContext';

function ScenarioCard({
  initial,
  conditions,
  name,
  trigger,
  resetVersion,
}: {
  initial: WorkerProfile;
  conditions: Conditions;
  name: string;
  trigger: number;
  resetVersion: number;
}) {
  const { t } = useTranslation();
  const { language } = useProfile();
  const [worker, setWorker] = useState(initial);
  const [validation, setValidation] = useState(false);
  const active = useRef<AbortController | null>(null);
  const mutation = useMutation({
    mutationFn: ({
      profile,
      weather,
      signal,
    }: {
      profile: WorkerProfile;
      weather: Conditions;
      signal: AbortSignal;
    }) => evaluateSimulation(profile, weather, { signal }),
  });
  const [result, setResult] = useState<Awaited<ReturnType<typeof evaluateSimulation>> | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [pending, setPending] = useState(false);
  const latest = useRef({ worker, conditions, language });
  latest.current = { worker, conditions, language };
  const evaluate = () => {
    active.current?.abort();
    const controller = new AbortController();
    active.current = controller;
    setResult(null);
    setError(null);
    const current = latest.current;
    if (
      !conditionsSchema.safeParse(current.conditions).success ||
      !workerSchema.safeParse({ ...current.worker, language: current.language }).success
    ) {
      setValidation(true);
      return;
    }
    setValidation(false);
    setPending(true);
    mutation.mutate(
      {
        profile: { ...current.worker, language: current.language },
        weather: current.conditions,
        signal: controller.signal,
      },
      {
        onSuccess: (response) => {
          if (!controller.signal.aborted) setResult(response);
        },
        onError: (next) => {
          if (!controller.signal.aborted) setError(next);
        },
        onSettled: () => {
          if (!controller.signal.aborted) setPending(false);
        },
      },
    );
  };
  const evaluateRef = useRef(evaluate);
  evaluateRef.current = evaluate;
  useEffect(() => {
    if (trigger > 0) evaluateRef.current();
  }, [trigger]);
  useEffect(() => {
    active.current?.abort();
    setWorker(initial);
    setValidation(false);
    setResult(null);
    setError(null);
    setPending(false);
  }, [resetVersion, initial]);
  useEffect(() => {
    active.current?.abort();
    setResult(null);
    setError(null);
    setPending(false);
  }, [conditions, worker, language]);
  useEffect(() => () => active.current?.abort(), []);
  return (
    <section className="scenario" aria-label={name}>
      <Card title={name}>
        <WorkFields value={worker} onChange={(next) => setWorker({ ...worker, ...next })} />
        <p className="small">
          {t('plan.schedule')}: {worker.workStart}–{worker.workEnd} · {worker.location.city}
        </p>
        <p className="small">{t('ui.sameDay')}</p>
        <Button className="primary full" onClick={evaluate} disabled={pending}>
          {t('page.evaluateOne')}
        </Button>
        {validation && <p role="alert">{t('ui.required')}</p>}
      </Card>
      {pending && <Loading />}
      {error != null && <ErrorPanel error={error} retry={evaluate} />}
      {result && <AssessmentPanel response={result} />}
    </section>
  );
}
export default function HeatLabPage() {
  const { t } = useTranslation();
  const [conditions, setConditions] = useState<Conditions>(demoConditions);
  const [trigger, setTrigger] = useState(0);
  const [resetVersion, setResetVersion] = useState(0);
  const [preset, setPreset] = useState('comparison');
  const health = useQuery(healthOptions());
  return (
    <>
      <div className="page-heading">
        <div>
          <ModeBadge mode="SIMULATION" />
          <h1>{t('page.heatlab')}</h1>
          <p>{t('page.heatlabBody')}</p>
        </div>
        <Link className="button" to="/worker/dashboard">
          {t('page.backToLive')}
        </Link>
      </div>
      {health.isError && <ErrorPanel error={health.error} retry={() => void health.refetch()} />}
      <Card title={t('page.sharedWeather')}>
        <div className="form-grid weather-controls">
          <div className="field">
            <label htmlFor="preset">{t('page.preset')}</label>
            <select
              id="preset"
              value={preset}
              onChange={(e) => {
                setPreset(e.target.value);
                setConditions({ ...presets[e.target.value] });
              }}
            >
              {Object.keys(presets).map((key) => (
                <option key={key} value={key}>
                  {t(`preset.${key}`)}
                </option>
              ))}
            </select>
          </div>
          {(['temperatureC', 'humidityPercent', 'windSpeedKmh'] as const).map((key, index) => (
            <div key={key}>
              <Field
                label={`${t(['field.temperature', 'field.humidity', 'field.wind'][index])} (${['°C', '%', 'km/h'][index]})`}
                type="number"
                min={[-90, 0, 0][index]}
                max={[65, 100, 500][index]}
                step="1"
                value={Number.isFinite(conditions[key]) ? conditions[key] : ''}
                onChange={(e) =>
                  setConditions({
                    ...conditions,
                    [key]: e.target.value === '' ? Number.NaN : Number(e.target.value),
                  })
                }
              />
              <input
                type="range"
                aria-label={`${t(['field.temperature', 'field.humidity', 'field.wind'][index])} · ${['°C', '%', 'km/h'][index]}`}
                min={[-90, 0, 0][index]}
                max={[65, 100, 500][index]}
                value={Number.isFinite(conditions[key]) ? conditions[key] : 0}
                onChange={(e) => setConditions({ ...conditions, [key]: Number(e.target.value) })}
              />
            </div>
          ))}
        </div>
        <div className="row wrap">
          <Button className="primary" onClick={() => setTrigger((value) => value + 1)}>
            {t('page.evaluate')}
          </Button>
          <Button
            onClick={() => {
              setConditions({ ...demoConditions });
              setPreset('comparison');
              setTrigger(0);
              setResetVersion((value) => value + 1);
            }}
          >
            {t('ui.reset')}
          </Button>
        </div>
      </Card>
      <div className="comparison">
        <ScenarioCard
          name={t('page.scenarioA')}
          initial={constructionScenario}
          conditions={conditions}
          trigger={trigger}
          resetVersion={resetVersion}
        />
        <ScenarioCard
          name={t('page.scenarioB')}
          initial={vendorScenario}
          conditions={conditions}
          trigger={trigger}
          resetVersion={resetVersion}
        />
      </div>
    </>
  );
}
