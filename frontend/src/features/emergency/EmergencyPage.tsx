import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PhoneCall, ShieldAlert, Snowflake } from 'lucide-react';
import { Card } from '../../components/common/Primitives';
export default function EmergencyPage() {
  const { t } = useTranslation();
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">SunShield / 112</span>
          <h1>{t('sos.title')}</h1>
          <p>{t('sos.subtitle')}</p>
        </div>
      </div>
      <div className="dashboard-grid">
        <Card title={t('sos.warningSigns')} className="emergency-card">
          <ShieldAlert aria-hidden="true" />
          <p className="lead">{t('sos.signs')}</p>
          <a className="button sos-link full" href="tel:112">
            <PhoneCall aria-hidden="true" />
            {t('sos.callAction')}
          </a>
        </Card>
        <Card title={t('sos.cool')}>
          <Snowflake aria-hidden="true" />
          <p className="lead">{t('sos.coolText')}</p>
          <p className="feedback warning">{t('sos.fluids')}</p>
        </Card>
      </div>
      <p className="safety-note">{t('sos.notice')}</p>
      <Link className="button" to="/">
        {t('nav.home')}
      </Link>
    </>
  );
}
