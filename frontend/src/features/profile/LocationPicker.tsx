import { useEffect, useId, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { cities } from '../../constants/options';
import { locationSchema } from '../../schemas/contracts';
import type { Location } from '../../schemas/contracts';
import { Button } from '../../components/common/Primitives';

export function LocationPicker({
  value,
  onChange,
}: {
  value: Location | null;
  onChange: (value: Location) => void;
}) {
  const { t, i18n } = useTranslation();
  const id = useId();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const generation = useRef(0);
  const latestOnChange = useRef(onChange);
  useEffect(() => {
    latestOnChange.current = onChange;
  }, [onChange]);
  useEffect(
    () => () => {
      generation.current++;
    },
    [],
  );
  const locate = () => {
    const current = ++generation.current;
    if (!navigator.geolocation) {
      setError('location.unavailable');
      return;
    }
    setPending(true);
    setError('');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (current !== generation.current) return;
        const candidate = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          city: i18n.t('location.current'),
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        };
        if (locationSchema.safeParse(candidate).success) latestOnChange.current(candidate);
        else setError('location.unavailable');
        setPending(false);
      },
      (reason) => {
        if (current !== generation.current) return;
        setPending(false);
        setError(
          reason.code === 1
            ? 'location.denied'
            : reason.code === 3
              ? 'location.timeout'
              : 'location.unavailable',
        );
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 300_000 },
    );
  };
  const selected =
    cities.find((city) => city.latitude === value?.latitude && city.longitude === value?.longitude)
      ?.city ?? '';
  return (
    <div className="location-picker">
      <div className="field">
        <label htmlFor={id}>{t('field.city')}</label>
        <select
          id={id}
          value={selected}
          onChange={(e) => {
            const next = cities.find((city) => city.city === e.target.value);
            if (next) {
              generation.current++;
              setPending(false);
              setError('');
              onChange(next);
            }
          }}
        >
          <option value="">{t('field.chooseCity')}</option>
          {cities.map((city) => (
            <option key={city.city} value={city.city}>
              {city.city}
            </option>
          ))}
        </select>
      </div>
      <p className="small">{t('ui.defaultCoordinates')}</p>
      <p className="small">{t('field.gpsReason')}</p>
      <Button onClick={locate} disabled={pending}>
        {pending ? t('ui.loading') : t('field.gps')}
      </Button>
      {error && <p role="alert">{t(error)}</p>}
      {value && (
        <p role="status">
          {value.city} · {value.latitude.toFixed(4)}, {value.longitude.toFixed(4)} ·{' '}
          {value.timezone}
        </p>
      )}
    </div>
  );
}
