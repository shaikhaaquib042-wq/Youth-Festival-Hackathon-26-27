import { useTranslation } from 'react-i18next';
import { Select, Field } from '../../components/common/Primitives';
import {
  occupations,
  workloads,
  environments,
  accessLevels,
  flexibilities,
} from '../../schemas/contracts';
import type { WorkerProfile } from '../../schemas/contracts';
export type WorkDraft = Omit<WorkerProfile, 'location'>;
export function WorkFields({
  value,
  onChange,
  section = 'all',
}: {
  value: WorkDraft;
  onChange: (value: WorkDraft) => void;
  section?: 'work' | 'conditions' | 'all';
}) {
  const { t } = useTranslation();
  const set = <K extends keyof WorkDraft>(key: K, next: WorkDraft[K]) =>
    onChange({ ...value, [key]: next });
  return (
    <div className="form-grid">
      {section !== 'conditions' && (
        <>
          <Select
            label={t('field.occupation')}
            values={occupations}
            value={value.occupation}
            onChange={(e) => set('occupation', e.target.value as WorkDraft['occupation'])}
          />
          <Select
            label={t('field.workload')}
            values={workloads}
            value={value.workload}
            onChange={(e) => set('workload', e.target.value as WorkDraft['workload'])}
          />
          <Field
            label={t('field.workStart')}
            type="time"
            required
            value={value.workStart}
            onChange={(e) => set('workStart', e.target.value)}
          />
          <Field
            label={t('field.workEnd')}
            type="time"
            required
            value={value.workEnd}
            onChange={(e) => set('workEnd', e.target.value)}
          />
        </>
      )}
      {section !== 'work' && (
        <>
          <Select
            label={t('field.environment')}
            values={environments}
            value={value.environment}
            onChange={(e) => set('environment', e.target.value as WorkDraft['environment'])}
          />
          <Select
            label={t('field.waterAccess')}
            values={accessLevels}
            value={value.waterAccess}
            onChange={(e) => set('waterAccess', e.target.value as WorkDraft['waterAccess'])}
          />
          <Select
            label={t('field.shadeAccess')}
            values={accessLevels}
            value={value.shadeAccess}
            onChange={(e) => set('shadeAccess', e.target.value as WorkDraft['shadeAccess'])}
          />
          <Select
            label={t('field.scheduleFlexibility')}
            values={flexibilities}
            value={value.scheduleFlexibility}
            onChange={(e) =>
              set('scheduleFlexibility', e.target.value as WorkDraft['scheduleFlexibility'])
            }
          />
          <label className="checkbox">
            <input
              type="checkbox"
              checked={value.alternativeDutiesAvailable}
              onChange={(e) => set('alternativeDutiesAvailable', e.target.checked)}
            />
            {t('field.alternativeDutiesAvailable')}
          </label>
        </>
      )}
    </div>
  );
}
