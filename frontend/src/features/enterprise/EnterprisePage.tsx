import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, Link } from 'react-router-dom';
import { Card, Button, Field, Select } from '../../components/common/Primitives';
import { workloads, accessLevels } from '../../schemas/contracts';
export default function EnterprisePage() {
  const { t } = useTranslation();
  const planner = useLocation().pathname.endsWith('/planner');
  const [site, setSite] = useState('');
  const [count, setCount] = useState(20);
  const [workload, setWorkload] = useState('HEAVY');
  const [water, setWater] = useState('LIMITED');
  const [shade, setShade] = useState('UNAVAILABLE');
  const [reviewed, setReviewed] = useState(false);
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="badge">{t('page.draft')}</span>
          <h1>{t('page.enterprise')}</h1>
          <p>{t('page.enterpriseBody')}</p>
        </div>
      </div>
      <Card title={planner ? t('page.draft') : t('nav.dashboard')}>
        <p className="feedback warning">{t('page.draftNotice')}</p>
        {planner ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setReviewed(true);
            }}
          >
            <div className="form-grid">
              <Field
                label={t('field.worksite')}
                value={site}
                required
                maxLength={150}
                onChange={(e) => {
                  setSite(e.target.value);
                  setReviewed(false);
                }}
              />
              <Field
                label={t('field.workforce')}
                type="number"
                min={1}
                max={100000}
                required
                value={count}
                onChange={(e) => {
                  setCount(Number(e.target.value));
                  setReviewed(false);
                }}
              />
              <Select
                label={t('field.workload')}
                values={workloads}
                value={workload}
                onChange={(e) => setWorkload(e.target.value)}
              />
              <Select
                label={t('field.waterAccess')}
                values={accessLevels}
                value={water}
                onChange={(e) => setWater(e.target.value)}
              />
              <Select
                label={t('field.shadeAccess')}
                values={accessLevels}
                value={shade}
                onChange={(e) => setShade(e.target.value)}
              />
            </div>
            <Button type="submit">{t('ui.review')}</Button>
            {reviewed && (
              <div role="status">
                <h3>{site}</h3>
                <p>
                  {t('field.workforce')}: {count} · {t(`enum.${workload}`)} · {t(`enum.${water}`)} /{' '}
                  {t(`enum.${shade}`)}
                </p>
                <p>{t('page.draftNotice')}</p>
              </div>
            )}
          </form>
        ) : (
          <>
            <p>{t('ui.pending')}</p>
            <Link className="button" to="/enterprise/planner">
              {t('page.draft')}
            </Link>
          </>
        )}
      </Card>
    </>
  );
}
