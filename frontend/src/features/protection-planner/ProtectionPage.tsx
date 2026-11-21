import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useProfile } from '../../context/ProfileContext';
import type { WorkerProfile } from '../../schemas/contracts';
import { protectionOptions } from '../../services/queries';
import { Card, Loading, ErrorPanel, ModeBadge } from '../../components/common/Primitives';
import {
  AssessmentPanel,
  Limitations,
  Recommendations,
} from '../../components/safety/AssessmentPanel';
import { displayTime } from '../../utils/safety';
function Protection({ profile }: { profile: WorkerProfile }) {
  const { t, i18n } = useTranslation();
  const query = useQuery(protectionOptions(profile));
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>{t('page.plan')}</h1>
          <p>
            {t('plan.schedule')}: {profile.workStart}–{profile.workEnd} ·{' '}
            {profile.location.timezone}
          </p>
          <p>{t(profile.scheduleFlexibility === 'FLEXIBLE' ? 'plan.flexible' : 'plan.fixed')}</p>
        </div>
      </div>
      {query.isPending ? (
        <Loading />
      ) : query.isError ? (
        <ErrorPanel error={query.error} retry={() => void query.refetch()} />
      ) : (
        <>
          <ModeBadge mode={query.data.dataMode} />
          <p>{query.data.workDate}</p>
          <div className="timeline">
            {query.data.timeline.map((period) => (
              <Card
                key={period.start}
                className={`period severity-${period.advisoryLevel.toLowerCase()}`}
              >
                <div className="row wrap">
                  <h2>
                    {displayTime(period.start, query.data.timezone, i18n.language)} –{' '}
                    {displayTime(period.end, query.data.timezone, i18n.language)}
                  </h2>
                  <span className="badge">{t(`advisory.${period.advisoryLevel}`)}</span>
                </div>
                <p>{period.temperatureC === null ? '—' : `${period.temperatureC}°C`}</p>
                {period.availability === 'UNAVAILABLE' && (
                  <p className="feedback warning">{t('plan.gap')}</p>
                )}
                <Recommendations
                  recommendations={period.assessment.recommendations.filter(
                    (item) => item.priority === 'CRITICAL' || item.code === 'STOP_UNSAFE_ACTIVITY',
                  )}
                />
                <details>
                  <summary>{t('ui.details')}</summary>
                  <AssessmentPanel
                    response={{ dataMode: query.data.dataMode, assessment: period.assessment }}
                  />
                </details>
              </Card>
            ))}
          </div>
          <Limitations codes={[query.data.disclaimerCode, ...query.data.limitations]} />
        </>
      )}
    </>
  );
}
export default function ProtectionPage() {
  const { profile } = useProfile();
  return profile ? <Protection profile={profile} /> : null;
}
