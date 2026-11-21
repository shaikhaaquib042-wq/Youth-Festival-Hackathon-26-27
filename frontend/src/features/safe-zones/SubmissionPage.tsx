import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useProfile } from '../../context/ProfileContext';
import { categories, submissionSchema } from '../../schemas/contracts';
import type { Submission } from '../../schemas/contracts';
import { submitFacility } from '../../services/queries';
import {
  Card,
  Button,
  ErrorPanel,
  Field,
  Loading,
  Select,
} from '../../components/common/Primitives';
export default function SubmissionPage() {
  const { t } = useTranslation();
  const { profile } = useProfile();
  const [draft, setDraft] = useState<Submission>({
    name: '',
    category: 'DRINKING_WATER',
    latitude: profile?.location.latitude ?? Number.NaN,
    longitude: profile?.location.longitude ?? Number.NaN,
    address: '',
    waterAvailable: false,
    shadeAvailable: false,
    seatingAvailable: false,
    openingHours: '',
  });
  const [invalid, setInvalid] = useState(false);
  const mutation = useMutation({ mutationFn: submitFacility });
  const set = <K extends keyof Submission>(key: K, value: Submission[K]) =>
    setDraft({ ...draft, [key]: value });
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>{t('page.addZone')}</h1>
          <p>{t('zones.pendingNotice')}</p>
        </div>
      </div>
      <Card>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const result = submissionSchema.safeParse(draft);
            setInvalid(!result.success);
            if (result.success && !mutation.isPending && !mutation.isSuccess)
              mutation.mutate(result.data);
          }}
        >
          <div className="form-grid">
            <Field
              label={t('field.name')}
              required
              maxLength={150}
              value={draft.name}
              onChange={(e) => set('name', e.target.value)}
            />
            <Select
              label={t('field.category')}
              values={categories}
              value={draft.category}
              onChange={(e) => set('category', e.target.value as Submission['category'])}
            />
            <Field
              label={t('field.address')}
              required
              value={draft.address}
              onChange={(e) => set('address', e.target.value)}
            />
            <Field
              label={t('field.openingHours')}
              maxLength={1000}
              value={draft.openingHours ?? ''}
              onChange={(e) => set('openingHours', e.target.value)}
            />
            <Field
              label={t('field.latitude')}
              type="number"
              required
              min={-90}
              max={90}
              step="any"
              value={Number.isFinite(draft.latitude) ? draft.latitude : ''}
              onChange={(e) =>
                set('latitude', e.target.value === '' ? Number.NaN : Number(e.target.value))
              }
            />
            <Field
              label={t('field.longitude')}
              type="number"
              required
              min={-180}
              max={180}
              step="any"
              value={Number.isFinite(draft.longitude) ? draft.longitude : ''}
              onChange={(e) =>
                set('longitude', e.target.value === '' ? Number.NaN : Number(e.target.value))
              }
            />
          </div>
          {(['waterAvailable', 'shadeAvailable', 'seatingAvailable'] as const).map((key, index) => (
            <label className="checkbox" key={key}>
              <input
                type="checkbox"
                checked={draft[key]}
                onChange={(e) => set(key, e.target.checked)}
              />
              {t(['field.waterAccess', 'field.shadeAccess', 'field.seating'][index])}
            </label>
          ))}
          {invalid && <p role="alert">{t('ui.required')}</p>}
          <Button
            type="submit"
            className="primary"
            disabled={mutation.isPending || mutation.isSuccess}
          >
            {t('zones.submit')}
          </Button>
          {mutation.isPending && <Loading />}
          {mutation.isError && <ErrorPanel error={mutation.error} />}{' '}
          {mutation.isSuccess && <p role="status">{t('ui.confirmPending')}</p>}
        </form>
      </Card>
    </>
  );
}
