import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useProfile } from '../../context/ProfileContext';
import type { WorkerProfile } from '../../schemas/contracts';
import { assessmentOptions, facilitiesOptions, weatherOptions } from '../../services/queries';
import { Card, Loading, ErrorPanel, Empty } from '../../components/common/Primitives';
import { AssessmentPanel } from '../../components/safety/AssessmentPanel';
import { WeatherPanel } from '../../components/weather/WeatherPanel';
import { LocationPicker } from '../profile/LocationPicker';
import { FacilityCard } from '../safe-zones/FacilityCard';

function Dashboard({ profile }: { profile: WorkerProfile }) {
  const { t } = useTranslation();
  const { saveProfile } = useProfile();
  const weather = useQuery(weatherOptions(profile.location));
  const assessment = useQuery(assessmentOptions(profile));
  const facilities = useQuery(
    facilitiesOptions({ location: profile.location, radiusKm: 5, includeDemo: false }),
  );
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">
            {t(`enum.${profile.occupation}`)} · {profile.location.city}
          </span>
          <h1>{t('page.dashboard')}</h1>
          <p>
            {profile.workStart}–{profile.workEnd} · {t(`enum.${profile.scheduleFlexibility}`)}
          </p>
        </div>
        <Link className="button" to="/worker/profile">
          {t('ui.edit')}
        </Link>
      </div>
      <div className="dashboard-grid">
        <section aria-label={t('weather.current')}>
          {weather.isPending ? (
            <Loading />
          ) : weather.isError ? (
            <Card title={t('weather.current')}>
              <ErrorPanel error={weather.error} retry={() => void weather.refetch()} />
            </Card>
          ) : (
            <WeatherPanel weather={weather.data} />
          )}
        </section>
        <section aria-label={t('assessment.title')}>
          {assessment.isPending ? (
            <Loading />
          ) : assessment.isError ? (
            <Card title={t('assessment.title')}>
              <ErrorPanel error={assessment.error} retry={() => void assessment.refetch()} />
              <Link className="button" to="/heatlab">
                {t('nav.heatlab')}
              </Link>
            </Card>
          ) : (
            <AssessmentPanel response={assessment.data} />
          )}
        </section>
      </div>
      <Card title={t('page.zones')}>
        {facilities.isPending ? (
          <Loading />
        ) : facilities.isError ? (
          <ErrorPanel error={facilities.error} retry={() => void facilities.refetch()} />
        ) : facilities.data.facilities.length ? (
          <div className="card-grid">
            {facilities.data.facilities.slice(0, 3).map((facility) => (
              <FacilityCard key={facility.id} facility={facility} origin={profile.location} />
            ))}
          </div>
        ) : (
          <Empty>{t('ui.noMatches')}</Empty>
        )}
        <div className="row wrap">
          <Link className="button" to="/safe-zones?category=DRINKING_WATER">
            {t('enum.DRINKING_WATER')}
          </Link>
          <Link className="button" to="/safe-zones?category=SHADED_REST_AREA">
            {t('enum.SHADED_REST_AREA')}
          </Link>
          <Link className="button primary" to="/worker/plan">
            {t('nav.plan')}
          </Link>
        </div>
      </Card>
      <Card title={t('field.location')}>
        <LocationPicker
          value={profile.location}
          onChange={(location) => saveProfile({ ...profile, location })}
        />
      </Card>
    </>
  );
}
export default function DashboardPage() {
  const { profile } = useProfile();
  return profile ? <Dashboard profile={profile} /> : null;
}
