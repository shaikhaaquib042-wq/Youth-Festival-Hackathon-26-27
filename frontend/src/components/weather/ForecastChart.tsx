import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useTranslation } from 'react-i18next';
import type { WeatherResponse } from '../../schemas/contracts';
export default function ForecastChart({ weather }: { weather: WeatherResponse }) {
  const { t, i18n } = useTranslation();
  const hourLabel = (input: unknown) => {
    const value = String(input);
    if (!/Z$|[+-]\d{2}:?\d{2}$/.test(value)) return value.slice(11, 16);
    try {
      return new Intl.DateTimeFormat(i18n.language, {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: weather.timezone,
      }).format(new Date(value));
    } catch {
      return '—';
    }
  };
  return (
    <div className="chart" role="img" aria-label={t('weather.chart')}>
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        <BarChart data={weather.hourly.slice(0, 48)}>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="time" tickFormatter={hourLabel} />
          <YAxis width={35} />
          <Tooltip formatter={(value) => [`${value}°C`, t('field.temperature')]} />
          <Bar
            dataKey="temperatureC"
            fill="var(--amber)"
            radius={[5, 5, 0, 0]}
            isAnimationActive={false}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
