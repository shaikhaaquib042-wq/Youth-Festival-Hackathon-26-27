import { beforeEach, describe, expect, it, vi } from 'vitest';
import { prisma } from '../src/config/database.js';
import { searchSafeZones } from '../src/services/safezone.service.js';
import type { SafeZone } from '../generated/prisma/client.js';

vi.mock('../src/config/database.js', () => ({
  prisma: { safeZone: { findMany: vi.fn() } },
}));

const findMany = vi.mocked(prisma.safeZone.findMany);

function zone(idNumber: number, latitude: number, longitude: number, overrides: Partial<SafeZone> = {}): SafeZone {
  return {
    id: `00000000-0000-4000-8000-${idNumber.toString(16).padStart(12, '0')}`,
    name: `Facility ${idNumber}`,
    category: 'DRINKING_WATER',
    latitude,
    longitude,
    address: 'Test address',
    waterAvailable: true,
    shadeAvailable: false,
    seatingAvailable: false,
    openingHours: null,
    verificationStatus: 'VERIFIED',
    availabilityStatus: 'AVAILABLE',
    lastVerifiedAt: new Date('2026-11-21T08:00:00.000Z'),
    createdAt: new Date('2026-11-21T08:00:00.000Z'),
    updatedAt: new Date('2026-11-21T08:00:00.000Z'),
    ...overrides,
  };
}

describe('SafeZone discovery service', () => {
  beforeEach(() => findMany.mockReset());

  it('does not drop a nearby facility after the first database page', async () => {
    const firstPage = Array.from({ length: 500 }, (_, index) => zone(index + 1, 0, 0.01));
    const nearby = zone(501, 0, 0);
    findMany.mockResolvedValueOnce(firstPage).mockResolvedValueOnce([nearby]);

    const results = await searchSafeZones({ latitude: 0, longitude: 0, radiusKm: 5, limit: 10 });

    expect(results).toHaveLength(10);
    expect(results[0]?.id).toBe(nearby.id);
    expect(findMany).toHaveBeenCalledTimes(2);
    expect(findMany.mock.calls[0]?.[0]).toMatchObject({ take: 500, orderBy: { id: 'asc' } });
    expect(findMany.mock.calls[1]?.[0]).toMatchObject({ cursor: { id: firstPage.at(-1)?.id }, skip: 1 });
  });

  it('applies exact Haversine radius filtering before returning candidates', async () => {
    findMany.mockResolvedValueOnce([zone(1, 0.008, 0.008)]);

    const results = await searchSafeZones({ latitude: 0, longitude: 0, radiusKm: 1 });

    expect(results).toEqual([]);
  });

  it('sorts by distance and applies the requested result limit after filtering', async () => {
    findMany.mockResolvedValueOnce([
      zone(1, 0.02, 0),
      zone(2, 0.01, 0),
      zone(3, 0.015, 0),
    ]);

    const results = await searchSafeZones({ latitude: 0, longitude: 0, radiusKm: 5, limit: 2 });

    expect(results.map((result) => result.id)).toEqual([zone(2, 0.01, 0).id, zone(3, 0.015, 0).id]);
    expect(results[0]?.distanceKm).toBeCloseTo(1.11195, 3);
  });

  it('builds a date-line-aware database window and includes nearby points across the date line', async () => {
    findMany.mockResolvedValueOnce([zone(1, 0, -179.999)]);

    const results = await searchSafeZones({ latitude: 0, longitude: 179.999, radiusKm: 1 });
    const where = findMany.mock.calls[0]?.[0]?.where;

    expect(results).toHaveLength(1);
    expect(results[0]?.distanceKm).toBeCloseTo(0.2224, 3);
    expect(where).toHaveProperty('OR');
  });

  it('excludes demo and rejected facilities by default and includes only demos when explicitly requested', async () => {
    findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([]);

    await searchSafeZones({ latitude: 18.5, longitude: 73.8 });
    await searchSafeZones({ latitude: 18.5, longitude: 73.8, includeDemo: true });

    expect(findMany.mock.calls[0]?.[0]?.where).toMatchObject({
      verificationStatus: { notIn: ['REJECTED', 'DEMO'] },
    });
    expect(findMany.mock.calls[1]?.[0]?.where).toMatchObject({
      verificationStatus: { notIn: ['REJECTED'] },
    });
  });

  it('rejects invalid limits instead of silently returning zero or an unbounded result set', async () => {
    await expect(searchSafeZones({ latitude: 0, longitude: 0, limit: 101 })).rejects.toThrow(RangeError);
    expect(findMany).not.toHaveBeenCalled();
  });
});
