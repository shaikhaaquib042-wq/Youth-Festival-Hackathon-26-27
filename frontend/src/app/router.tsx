import { lazy, Suspense, Component } from 'react';
import type { ReactNode } from 'react';
import { BrowserRouter, Link, Route, Routes, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PublicLayout, WorkerLayout, EnterpriseLayout } from '../layouts/Layouts';
import { Loading, Card } from '../components/common/Primitives';
import { useProfile } from '../context/ProfileContext';
const Landing = lazy(() => import('../pages/LandingPage'));
const Onboarding = lazy(() => import('../features/onboarding/OnboardingPage'));
const Dashboard = lazy(() => import('../features/worker-dashboard/DashboardPage'));
const Protection = lazy(() => import('../features/protection-planner/ProtectionPage'));
const Zones = lazy(() => import('../features/safe-zones/SafeZonesPage'));
const Submission = lazy(() => import('../features/safe-zones/SubmissionPage'));
const Emergency = lazy(() => import('../features/emergency/EmergencyPage'));
const HeatLab = lazy(() => import('../features/heatlab/HeatLabPage'));
const Enterprise = lazy(() => import('../features/enterprise/EnterprisePage'));
function MissingProfile({ children }: { children: ReactNode }) {
  const { profile } = useProfile();
  const { t } = useTranslation();
  return profile ? (
    children
  ) : (
    <Card title={t('ui.noProfile')}>
      <Link className="button primary" to="/onboarding">
        {t('nav.onboarding')}
      </Link>
      <Link className="button" to="/sos">
        {t('nav.sos')}
      </Link>
    </Card>
  );
}
function ErrorFallback() {
  const { t } = useTranslation();
  return (
    <div className="main" role="alert">
      <h1>{t('ui.unexpected')}</h1>
      <a className="button" href="/sos">
        {t('nav.sos')}
      </a>
      <a className="button" href="/">
        {t('nav.home')}
      </a>
    </div>
  );
}
class RouteBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? <ErrorFallback /> : this.props.children;
  }
}
function NotFound() {
  const { t } = useTranslation();
  return (
    <>
      <h1>404</h1>
      <p>{t('ui.notFound')}</p>
      <Link className="button" to="/">
        {t('nav.home')}
      </Link>
    </>
  );
}
function RouteContent() {
  const location = useLocation();
  return (
    <RouteBoundary key={location.pathname}>
      <Suspense fallback={<Loading />}>
        <Routes>
          <Route element={<PublicLayout />}>
            <Route index element={<Landing />} />
            <Route path="onboarding" element={<Onboarding />} />
            <Route path="sos" element={<Emergency />} />
            <Route path="heatlab" element={<HeatLab />} />
            <Route path="*" element={<NotFound />} />
          </Route>
          <Route element={<WorkerLayout />}>
            <Route
              path="worker/dashboard"
              element={
                <MissingProfile>
                  <Dashboard />
                </MissingProfile>
              }
            />
            <Route
              path="worker/plan"
              element={
                <MissingProfile>
                  <Protection />
                </MissingProfile>
              }
            />
            <Route path="worker/profile" element={<Onboarding />} />
            <Route
              path="safe-zones"
              element={
                <MissingProfile>
                  <Zones />
                </MissingProfile>
              }
            />
            <Route path="safe-zones/add" element={<Submission />} />
          </Route>
          <Route element={<EnterpriseLayout />}>
            <Route path="enterprise/dashboard" element={<Enterprise />} />
            <Route path="enterprise/planner" element={<Enterprise />} />
          </Route>
        </Routes>
      </Suspense>
    </RouteBoundary>
  );
}
export function AppRouter() {
  return (
    <BrowserRouter>
      <RouteContent />
    </BrowserRouter>
  );
}
