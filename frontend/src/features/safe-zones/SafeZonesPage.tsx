import { lazy, Suspense, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useProfile } from '../../context/ProfileContext';
import { categories, verificationStatuses } from '../../schemas/contracts';
import type { WorkerProfile } from '../../schemas/contracts';
import { facilitiesOptions } from '../../services/queries';
import { mockMode } from '../../services/client';
import {
  Card,
  Button,
  ErrorPanel,
  Field,
  Loading,
  ModeBadge,
  Empty,
} from '../../components/common/Primitives';
import { FacilityCard } from './FacilityCard';
import { FacilityDetails } from './FacilityDetails';
const ZoneMap = lazy(() => import('../../components/maps/ZoneMap'));
function SafeZones({ profile }: { profile: WorkerProfile }) {
  const { t } = useTranslation();
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [radius, setRadius] = useState(5);
  const [verification, setVerification] = useState('');
  const [includeDemo, setIncludeDemo] = useState(false);
  const [availableOnly, setAvailableOnly] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const category = categories.find((value) => value === params.get('category')) ?? '';
  const query = useQuery(
    facilitiesOptions({
      location: profile.location,
      radiusKm: radius,
      ...(category ? { category } : {}),
      includeDemo,
    }),
  );
  const facilities = (query.data?.facilities ?? [])
    .filter(
      (facility) =>
        (!verification || facility.verificationStatus === verification) &&
        (verification !== 'VERIFIED' || Boolean(facility.lastVerifiedAt)) &&
        (!category || facility.category === category) &&
        facility.distanceKm <= radius &&
        facility.name.toLocaleLowerCase().includes(search.toLocaleLowerCase()),
    )
    .sort((a, b) => a.distanceKm - b.distanceKm);
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>{t('page.zones')}</h1>
          <p>
            {profile.location.city} · {t('zones.distance')}
          </p>
        </div>
        <Link className="button primary" to="/safe-zones/add">
          {t('page.addZone')}
        </Link>
      </div>
      {mockMode() && <ModeBadge mode="MOCK" />}
      <Card>
        <div className="form-grid">
          <Field
            label={t('ui.search')}
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="field">
            <label htmlFor="category-filter">{t('field.category')}</label>
            <select
              id="category-filter"
              value={category}
              onChange={(e) => setParams(e.target.value ? { category: e.target.value } : {})}
            >
              <option value="">{t('ui.all')}</option>
              {categories.map((value) => (
                <option key={value} value={value}>
                  {t(`enum.${value}`)}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="verification-filter">{t('field.verification')}</label>
            <select
              id="verification-filter"
              value={verification}
              onChange={(e) => setVerification(e.target.value)}
            >
              <option value="">{t('ui.all')}</option>
              {verificationStatuses.map((value) => (
                <option key={value} value={value}>
                  {t(`enum.${value}`)}
                </option>
              ))}
            </select>
          </div>
          <Field
            label={t('field.radius')}
            type="number"
            min={0}
            max={100}
            value={radius}
            onChange={(e) => {
              const value = Number(e.target.value);
              if (Number.isFinite(value) && value >= 0 && value <= 100) setRadius(value);
            }}
          />
        </div>
        <div className="row wrap">
          <label className="checkbox">
            <input
              type="checkbox"
              checked={includeDemo}
              onChange={(e) => setIncludeDemo(e.target.checked)}
            />
            {t('zones.demoInclude')}
          </label>
          <label className="checkbox">
            <input
              type="checkbox"
              checked={availableOnly}
              onChange={(e) => setAvailableOnly(e.target.checked)}
            />
            {t('field.availableOnly')}
          </label>
          <Button
            onClick={() => {
              setSearch('');
              setVerification('');
              setRadius(5);
              setIncludeDemo(false);
              setAvailableOnly(false);
              setParams({});
            }}
          >
            {t('ui.clear')}
          </Button>
        </div>
        <p className="small">{t('zones.unsupportedAvailability')}</p>
      </Card>
      {selected && <FacilityDetails key={selected} id={selected} close={() => setSelected(null)} />}
      {query.isPending ? (
        <Loading />
      ) : query.isError ? (
        <ErrorPanel error={query.error} retry={() => void query.refetch()} />
      ) : availableOnly ? (
        <Empty>{t('zones.unsupportedAvailability')}</Empty>
      ) : (
        <div className="map-list">
          <div>
            <Suspense fallback={<Loading />}>
              <ZoneMap facilities={facilities} location={profile.location} />
            </Suspense>
          </div>
          <section aria-label={t('page.zones')}>
            {facilities.length ? (
              facilities.map((facility) => (
                <FacilityCard
                  key={facility.id}
                  facility={facility}
                  origin={profile.location}
                  onDetails={() => setSelected(facility.id)}
                />
              ))
            ) : (
              <Empty>{t('ui.noMatches')}</Empty>
            )}
          </section>
        </div>
      )}
    </>
  );
}
export default function SafeZonesPage() {
  const { profile } = useProfile();
  return profile ? <SafeZones profile={profile} /> : null;
}
