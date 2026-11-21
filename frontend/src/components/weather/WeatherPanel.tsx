import { lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import type { WeatherResponse } from '../../schemas/contracts';
import { Card, Empty, ModeBadge } from '../common/Primitives';
import { displayTime } from '../../utils/safety';
const ForecastChart = lazy(() => import('./ForecastChart'));
export function WeatherPanel({ weather }: { weather: WeatherResponse }) {
  const { t, i18n } = useTranslation();
  const current = weather.current;
  const stale = current && Date.now() - Date.parse(current.observedAt) > 3_600_000;
  return (
    <Card title={t('weather.current')}>
      <ModeBadge mode={weather.dataMode} />
      {current ? (
        <>
          <div className="temperature">
            {current.temperatureC}
            <span>°C</span>
          </div>
          <div className="metrics">
            <div>
              <span>{t('weather.feelsLike')}</span>
              <strong>
                {current.apparentTemperatureC == null ? '—' : `${current.apparentTemperatureC}°C`}
              </strong>
            </div>
            <div>
              <span>{t('field.humidity')}</span>
              <strong>{current.humidityPercent}%</strong>
            </div>
            <div>
              <span>{t('field.wind')}</span>
              <strong>{current.windSpeedKmh == null ? '—' : `${current.windSpeedKmh} km/h`}</strong>
            </div>
          </div>
          {stale && <p className="feedback warning">{t('weather.stale')}</p>}
        </>
      ) : (
        <Empty>{t('weather.noCurrent')}</Empty>
      )}
      <p className="small">
        {t('weather.source')}: {weather.source}
      </p>
      <p className="small">
        {t('weather.observed')}: {displayTime(current?.observedAt, weather.timezone, i18n.language)}
      </p>
      <p className="small">
        {t('weather.fetched')}: {displayTime(weather.fetchedAt, weather.timezone, i18n.language)}
      </p>
      <h3>{t('weather.forecast')}</h3>
      {weather.hourly.length ? (
        <>
          <Suspense fallback={<p>{t('ui.loading')}</p>}>
            <ForecastChart weather={weather} />
          </Suspense>
          <details>
            <summary>{t('ui.details')}</summary>
            <ul className="forecast-list">
              {weather.hourly.map((hour) => (
                <li key={hour.time}>
                  {displayTime(hour.time, weather.timezone, i18n.language)} · {hour.temperatureC}°C
                </li>
              ))}
            </ul>
          </details>
        </>
      ) : (
        <Empty>{t('weather.noForecast')}</Empty>
      )}
    </Card>
  );
}
