import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Sun, ShieldCheck, FlaskConical, MapPin } from 'lucide-react';
export default function LandingPage() {
  const { t } = useTranslation();
  return (
    <>
      <section className="landing-hero">
        <div>
          <span className="eyebrow">SunShield / {t('brand.tagline')}</span>
          <h1>{t('page.welcome')}</h1>
          <p className="lead">{t('page.welcomeBody')}</p>
          <div className="row wrap">
            <Link className="button primary" to="/onboarding">
              {t('nav.onboarding')}
            </Link>
            <Link className="button" to="/heatlab">
              {t('nav.heatlab')}
            </Link>
          </div>
          <p className="small">{t('limit.NOT_PERMISSION_TO_CONTINUE_WORK')}</p>
        </div>
        <div className="solar-panel">
          <Sun size={56} aria-hidden="true" />
          <span>SunShield</span>
          <strong>{t('brand.tagline')}</strong>
          <div className="signal-lines" aria-hidden="true">
            <i />
            <i />
            <i />
            <i />
            <i />
            <i />
            <i />
          </div>
        </div>
      </section>
      <div className="card-grid landing-links">
        {[
          ['/worker/dashboard', 'assessment.title', ShieldCheck],
          ['/heatlab', 'nav.heatlab', FlaskConical],
          ['/safe-zones', 'nav.zones', MapPin],
        ].map(([path, label, Icon]) => {
          const Symbol = Icon as typeof Sun;
          return (
            <Link key={String(path)} className="card" to={String(path)}>
              <Symbol aria-hidden="true" />
              <h2>{t(String(label))}</h2>
            </Link>
          );
        })}
      </div>
    </>
  );
}
