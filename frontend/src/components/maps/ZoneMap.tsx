import { useEffect } from 'react';
import { CircleMarker, MapContainer, Popup, TileLayer, useMap } from 'react-leaflet';
import { useTranslation } from 'react-i18next';
import type { Facility, Location } from '../../schemas/contracts';
import { locationSchema } from '../../schemas/contracts';
function Recenter({ location }: { location: Location }) {
  const map = useMap();
  useEffect(() => {
    map.setView([location.latitude, location.longitude], 13);
  }, [map, location]);
  return null;
}
export default function ZoneMap({
  facilities,
  location,
}: {
  facilities: Facility[];
  location: Location;
}) {
  const { t } = useTranslation();
  return (
    <MapContainer
      className="zone-map"
      center={[location.latitude, location.longitude]}
      zoom={13}
      scrollWheelZoom={false}
    >
      <Recenter location={location} />
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {facilities
        .filter(
          (facility) =>
            locationSchema
              .pick({ latitude: true, longitude: true })
              .safeParse({ latitude: facility.latitude, longitude: facility.longitude }).success,
        )
        .map((facility) => (
          <CircleMarker
            key={facility.id}
            center={[facility.latitude, facility.longitude]}
            radius={10}
            pathOptions={{
              color: facility.verificationStatus === 'DEMO' ? '#92400e' : '#0f766e',
              fillOpacity: 0.7,
            }}
          >
            <Popup>
              <strong>{facility.name}</strong>
              <p>{t(`enum.${facility.category}`)}</p>
              <p>{t(`enum.${facility.verificationStatus}`)}</p>
            </Popup>
          </CircleMarker>
        ))}
    </MapContainer>
  );
}
