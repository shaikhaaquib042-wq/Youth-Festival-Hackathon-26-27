import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { availabilityStatuses } from '../../schemas/contracts';
import type { z } from 'zod';
import type { reportInputSchema } from '../../schemas/contracts';
import { facilityOptions, reportFacility } from '../../services/queries';
import {
  Card,
  Loading,
  ErrorPanel,
  Button,
  Field,
  Select,
} from '../../components/common/Primitives';
export function FacilityDetails({ id, close }: { id: string; close: () => void }) {
  const { t } = useTranslation();
  const query = useQuery(facilityOptions(id));
  const client = useQueryClient();
  const [availability, setAvailability] =
    useState<z.infer<typeof reportInputSchema>['availabilityStatus']>('UNKNOWN');
  const [comment, setComment] = useState('');
  const mutation = useMutation({
    mutationFn: () => reportFacility(id, { availabilityStatus: availability, comment }),
    onSuccess: () => void client.invalidateQueries({ queryKey: ['facility', id] }),
  });
  return (
    <Card title={t('zones.details')}>
      <Button onClick={close}>{t('ui.close')}</Button>
      {query.isPending ? (
        <Loading />
      ) : query.isError ? (
        <ErrorPanel error={query.error} retry={() => void query.refetch()} />
      ) : (
        <>
          <h3>{query.data.name}</h3>
          <p>{query.data.address ?? '—'}</p>
          <p>
            {t('field.seating')}:{' '}
            {query.data.seatingAvailable === undefined
              ? '—'
              : t(query.data.seatingAvailable ? 'enum.AVAILABLE' : 'enum.UNAVAILABLE')}
          </p>
          <p>
            {t('field.openingHours')}: {query.data.openingHours ?? '—'}
          </p>
          <p>
            {t('field.availability')}: {t(`enum.${query.data.availabilityStatus ?? 'UNKNOWN'}`)}
          </p>
          <p>{t('zones.pendingNotice')}</p>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              mutation.mutate();
            }}
          >
            <Select
              label={t('field.availability')}
              values={availabilityStatuses}
              value={availability}
              onChange={(event) => setAvailability(event.target.value as typeof availability)}
            />
            <Field
              label={t('field.comment')}
              value={comment}
              maxLength={500}
              onChange={(event) => setComment(event.target.value)}
            />
            <Button type="submit" disabled={mutation.isPending}>
              {t('zones.report')}
            </Button>
            {mutation.isPending && <Loading />}
            {mutation.isError && <ErrorPanel error={mutation.error} />}{' '}
            {mutation.isSuccess && <p role="status">{t('ui.reportSaved')}</p>}
          </form>
        </>
      )}
    </Card>
  );
}
