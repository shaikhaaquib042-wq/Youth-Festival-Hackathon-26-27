import { useTranslation } from 'react-i18next';
import type { Facility, Location } from '../../schemas/contracts';
import { Card, Button } from '../../components/common/Primitives';
import { directionsUrl, displayTime } from '../../utils/safety';
export function FacilityCard({
  facility,
  origin,
  onDetails,
}: {
  facility: Facility;
  origin: Location;
  onDetails?: () => void;
}) {
  const { t, i18n } = useTranslation();
  const url = directionsUrl(origin, facility);
  return (
    <Card className="facility">
      <span className={`badge verification-${facility.verificationStatus.toLowerCase()}`}>
        {t(`enum.${facility.verificationStatus}`)}
      </span>
      <h3>{facility.name}</h3>
      <p>{t(`enum.${facility.category}`)}</p>
      <p className="small">
        {t('zones.distance')}: {facility.distanceKm.toFixed(2)} km
      </p>
      <ul className="chips">
        <li>
          {t('field.waterAccess')}:{' '}
          {t(facility.waterAvailable ? 'enum.AVAILABLE' : 'enum.UNAVAILABLE')}
        </li>
        <li>
          {t('field.shadeAccess')}:{' '}
          {t(facility.shadeAvailable ? 'enum.AVAILABLE' : 'enum.UNAVAILABLE')}
        </li>
      </ul>
      <p className="small">
        {t('zones.lastVerified')}:{' '}
        {displayTime(facility.lastVerifiedAt, origin.timezone, i18n.language)}
      </p>
      <div className="row wrap">
        {url && (
          <a className="button" href={url} target="_blank" rel="noopener noreferrer">
            {t('zones.directions')}
          </a>
        )}
        {onDetails && <Button onClick={onDetails}>{t('ui.details')}</Button>}
      </div>
    </Card>
  );
}
