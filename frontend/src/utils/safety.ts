import { locationSchema } from '../schemas/contracts';
export function safeExternalUrl(value: string): string | undefined {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' &&
      url.hostname === 'www.openstreetmap.org' &&
      !url.username &&
      !url.password
      ? url.toString()
      : undefined;
  } catch {
    return undefined;
  }
}
export function directionsUrl(
  origin: { latitude: number; longitude: number },
  destination: { latitude: number; longitude: number },
) {
  for (const point of [origin, destination]) {
    if (
      !locationSchema
        .pick({ latitude: true, longitude: true })
        .safeParse({ latitude: point.latitude, longitude: point.longitude }).success
    )
      return undefined;
  }
  return safeExternalUrl(
    `https://www.openstreetmap.org/directions?engine=fossgis_osrm_foot&route=${encodeURIComponent(`${origin.latitude},${origin.longitude};${destination.latitude},${destination.longitude}`)}`,
  );
}
export function displayTime(value: string | null | undefined, timezone?: string, language = 'en') {
  if (!value) return '—';
  if (!/Z$|[+-]\d{2}:?\d{2}$/.test(value)) return value.replace('T', ' ');
  try {
    return new Intl.DateTimeFormat(language, {
      dateStyle: 'medium',
      timeStyle: 'short',
      ...(timezone ? { timeZone: timezone } : {}),
    }).format(new Date(value));
  } catch {
    return '—';
  }
}
