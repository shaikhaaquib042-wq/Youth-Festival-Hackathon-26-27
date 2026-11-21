import { useEffect, useRef } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { Sun, ShieldAlert } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useProfile } from '../context/ProfileContext';
import { languages } from '../schemas/contracts';
import type { Language } from '../schemas/contracts';
import { mockMode } from '../services/client';
import { ModeBadge } from '../components/common/Primitives';
const workerLinks = [
  ['/worker/dashboard', 'nav.dashboard'],
  ['/worker/plan', 'nav.plan'],
  ['/safe-zones', 'nav.zones'],
  ['/heatlab', 'nav.heatlab'],
];
function Shell({ enterprise = false }: { enterprise?: boolean }) {
  const { t } = useTranslation();
  const { language, setLanguage, storageWarning } = useProfile();
  const location = useLocation();
  const main = useRef<HTMLElement>(null);
  useEffect(() => {
    if (location.key !== 'default') main.current?.focus();
    window.scrollTo({ top: 0 });
  }, [location.pathname, location.key]);
  return (
    <>
      <a className="skip-link" href="#main-content">
        {t('ui.skip')}
      </a>
      <header className="site-header">
        <Link className="brand" to="/" aria-label="SunShield">
          <span className="brand-icon">
            <Sun aria-hidden="true" />
          </span>
          <strong>SunShield</strong>
        </Link>
        <nav className="desktop-nav" aria-label={t('nav.dashboard')}>
          {workerLinks.map(([path, label]) => (
            <NavLink key={path} to={path}>
              {t(label)}
            </NavLink>
          ))}
        </nav>
        <div className="header-actions">
          <label className="language">
            <span className="sr-only">{t('ui.language')}</span>
            <select
              aria-label={t('ui.language')}
              value={language}
              onChange={(e) => setLanguage(e.target.value as Language)}
            >
              {languages.map((value) => (
                <option key={value} value={value}>
                  {{ en: 'English', hi: 'हिंदी', mr: 'मराठी' }[value]}
                </option>
              ))}
            </select>
          </label>
          <Link className="button sos-link" to="/sos">
            <ShieldAlert size={18} aria-hidden="true" />
            <span>{t('nav.sos')}</span>
          </Link>
        </div>
      </header>
      <div className="utility-nav">
        <Link to="/worker/profile">{t('nav.profile')}</Link>
        <Link to="/enterprise/dashboard">{t('nav.enterprise')}</Link>
        {mockMode() && <ModeBadge mode="MOCK" />}
      </div>
      {storageWarning && (
        <p role="status" className="feedback warning">
          {t('ui.storageWarning')}
        </p>
      )}
      <main className="main" id="main-content" tabIndex={-1} ref={main}>
        {enterprise && (
          <nav className="enterprise-nav" aria-label={t('nav.enterprise')}>
            <NavLink to="/enterprise/dashboard">{t('page.enterprise')}</NavLink>
            <NavLink to="/enterprise/planner">{t('page.draft')}</NavLink>
          </nav>
        )}
        <Outlet />
      </main>
      <footer className="site-footer">
        <strong>SunShield</strong>
        <span>{t('brand.tagline')}</span>
        <p>{t('limit.NOT_MEDICALLY_VALIDATED')}</p>
      </footer>
      <nav className="mobile-nav" aria-label={t('nav.dashboard')}>
        {workerLinks.map(([path, label]) => (
          <NavLink key={path} to={path}>
            {t(label)}
          </NavLink>
        ))}
      </nav>
    </>
  );
}
export function PublicLayout() {
  return <Shell />;
}
export function WorkerLayout() {
  return <Shell />;
}
export function EnterpriseLayout() {
  return <Shell enterprise />;
}
