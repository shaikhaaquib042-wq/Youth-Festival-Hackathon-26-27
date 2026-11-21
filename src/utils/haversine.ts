const EARTH_RADIUS_KM = 6371.0088;

function validateCoordinate(latitude: number, longitude: number): void {
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
    throw new RangeError("Latitude must be between -90 and 90");
  }
  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    throw new RangeError("Longitude must be between -180 and 180");
  }
}

export function calculateDistanceKm(
  latitude1: number,
  longitude1: number,
  latitude2: number,
  longitude2: number,
): number {
  validateCoordinate(latitude1, longitude1);
  validateCoordinate(latitude2, longitude2);
  const radians = (degrees: number) => degrees * Math.PI / 180;
  const dLat = radians(latitude2 - latitude1);
  const dLon = radians(longitude2 - longitude1);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(radians(latitude1)) * Math.cos(radians(latitude2)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(Math.min(1, Math.max(0, a))));
}
