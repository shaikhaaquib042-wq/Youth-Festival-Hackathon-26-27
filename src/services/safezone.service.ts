import { AvailabilityStatus, SafeZoneCategory, VerificationStatus } from "../../generated/prisma/client.js";
import { prisma } from "../config/database.js";
import { calculateDistanceKm } from "../utils/haversine.js";

const MAX_SEARCH_RESULTS = 100;
const SEARCH_PAGE_SIZE = 500;
const EARTH_RADIUS_KM = 6371.0088;

type LongitudeBounds = { min: number; max: number; wrapsDateline: boolean } | null;

function toDegrees(radians: number): number {
  return radians * 180 / Math.PI;
}

function longitudeBounds(latitude: number, longitude: number, radiusKm: number): LongitudeBounds {
  const angularRadius = radiusKm / EARTH_RADIUS_KM;
  const latitudeRadians = latitude * Math.PI / 180;
  const distanceToPole = Math.PI / 2 - Math.abs(latitudeRadians);
  if (angularRadius >= distanceToPole) return null;

  const ratio = Math.sin(angularRadius) / Math.cos(latitudeRadians);
  if (ratio >= 1) return null;
  const longitudeDelta = toDegrees(Math.asin(Math.max(-1, Math.min(1, ratio))));
  const rawMin = longitude - longitudeDelta;
  const rawMax = longitude + longitudeDelta;
  if (rawMin < -180) return { min: rawMin + 360, max: rawMax, wrapsDateline: true };
  if (rawMax > 180) return { min: rawMin, max: rawMax - 360, wrapsDateline: true };
  return { min: rawMin, max: rawMax, wrapsDateline: false };
}

export type SafeZoneSearch = {
  latitude: number;
  longitude: number;
  radiusKm?: number;
  category?: SafeZoneCategory;
  availabilityStatus?: AvailabilityStatus;
  includeDemo?: boolean;
  limit?: number;
};

export async function searchSafeZones(input: SafeZoneSearch) {
  const radiusKm = input.radiusKm ?? 5;
  if (!Number.isFinite(radiusKm) || radiusKm < 0 || radiusKm > 100) {
    throw new RangeError("radiusKm must be between 0 and 100");
  }
  calculateDistanceKm(input.latitude, input.longitude, input.latitude, input.longitude);
  const limit = input.limit ?? MAX_SEARCH_RESULTS;
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_SEARCH_RESULTS) {
    throw new RangeError(`limit must be an integer between 1 and ${MAX_SEARCH_RESULTS}`);
  }
  const latitudeDelta = toDegrees(radiusKm / EARTH_RADIUS_KM);
  const minLatitude = Math.max(-90, input.latitude - latitudeDelta);
  const maxLatitude = Math.min(90, input.latitude + latitudeDelta);
  const longitudes = longitudeBounds(input.latitude, input.longitude, radiusKm);
  const where = {
    verificationStatus: {
      notIn: input.includeDemo
        ? [VerificationStatus.REJECTED]
        : [VerificationStatus.REJECTED, VerificationStatus.DEMO],
    },
    ...(input.category ? { category: input.category } : {}),
    ...(input.availabilityStatus ? { availabilityStatus: input.availabilityStatus } : {}),
    latitude: { gte: minLatitude, lte: maxLatitude },
    ...(longitudes === null ? {} : longitudes.wrapsDateline
      ? { OR: [{ longitude: { gte: longitudes.min } }, { longitude: { lte: longitudes.max } }] }
      : { longitude: { gte: longitudes.min, lte: longitudes.max } }),
  };

  const matching: Array<{
    id: string;
    name: string;
    category: SafeZoneCategory;
    latitude: number;
    longitude: number;
    distanceKm: number;
    waterAvailable: boolean;
    shadeAvailable: boolean;
    verificationStatus: VerificationStatus;
    availabilityStatus: AvailabilityStatus;
    lastVerifiedAt: Date | null;
  }> = [];
  let cursor: string | undefined;

  // Page through every spatial candidate. The output limit is applied only
  // after exact-radius filtering and nearest-first ordering.
  while (true) {
    const records = await prisma.safeZone.findMany({
      where,
      orderBy: { id: "asc" },
      take: SEARCH_PAGE_SIZE,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });
    for (const zone of records) {
      const distanceKm = calculateDistanceKm(input.latitude, input.longitude, zone.latitude, zone.longitude);
      if (distanceKm > radiusKm) continue;
      matching.push({
        id: zone.id,
        name: zone.name,
        category: zone.category,
        latitude: zone.latitude,
        longitude: zone.longitude,
        distanceKm,
        waterAvailable: zone.waterAvailable,
        shadeAvailable: zone.shadeAvailable,
        verificationStatus: zone.verificationStatus,
        availabilityStatus: zone.availabilityStatus,
        lastVerifiedAt: zone.lastVerifiedAt,
      });
    }
    matching.sort((a, b) => a.distanceKm - b.distanceKm || a.id.localeCompare(b.id));
    if (matching.length > limit) matching.length = limit;
    if (records.length < SEARCH_PAGE_SIZE) break;
    cursor = records[records.length - 1]?.id;
    if (!cursor) break;
  }

  return matching;
}

export async function getSafeZone(id: string) {
  return prisma.safeZone.findFirst({ where: { id, verificationStatus: { not: VerificationStatus.REJECTED } } });
}

export type NewSafeZoneInput = {
  name: string;
  category: SafeZoneCategory;
  latitude: number;
  longitude: number;
  address: string;
  waterAvailable?: boolean;
  shadeAvailable?: boolean;
  seatingAvailable?: boolean;
  openingHours?: string | null;
};

export async function submitSafeZone(input: NewSafeZoneInput) {
  return prisma.safeZone.create({
    data: {
      ...input,
      verificationStatus: VerificationStatus.PENDING,
      availabilityStatus: AvailabilityStatus.UNKNOWN,
      lastVerifiedAt: null,
    },
  });
}
