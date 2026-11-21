import 'dotenv/config';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const enabled = process.env.RUN_DATABASE_INTEGRATION_TESTS === 'true';
let database: typeof import('../src/config/database.js') | undefined;
let safeZoneService: typeof import('../src/services/safezone.service.js') | undefined;

describe.skipIf(!enabled)('read-only Supabase SafeZone integration', () => {
  beforeAll(async () => {
    database = await import('../src/config/database.js');
    safeZoneService = await import('../src/services/safezone.service.js');
    await database.prisma.$connect();
  });
  afterAll(async () => {
    if (database) await database.prisma.$disconnect();
  });

  it('connects through the Prisma client and reads existing facility/report data', async () => {
    if (!database || !safeZoneService) throw new Error('Database integration not initialized');
    const { prisma } = database;
    const { getSafeZone, searchSafeZones } = safeZoneService;
    const [connection, facilityCount, reportCount, verificationCounts, existingFacility, verifiedFacility, demoFacilities] = await Promise.all([
      prisma.$queryRaw<Array<{ connected: number }>>`SELECT 1 AS connected`,
      prisma.safeZone.count(),
      prisma.safeZoneReport.count(),
      prisma.safeZone.groupBy({ by: ['verificationStatus'], _count: { _all: true } }),
      prisma.safeZone.findFirst({
        where: { verificationStatus: { not: 'REJECTED' } },
        select: { id: true, latitude: true, longitude: true },
      }),
      prisma.safeZone.findFirst({
        where: { verificationStatus: 'VERIFIED' },
        select: { id: true, latitude: true, longitude: true },
      }),
      prisma.safeZone.findMany({
        where: { verificationStatus: 'DEMO' },
        select: { id: true, latitude: true, longitude: true },
      }),
    ]);
    expect(Number(connection[0]?.connected)).toBe(1);
    expect(facilityCount).toBeGreaterThanOrEqual(0);
    expect(reportCount).toBeGreaterThanOrEqual(0);
    console.info('Read-only Supabase counts', JSON.stringify({
      facilities: facilityCount,
      reports: reportCount,
      verificationStatuses: verificationCounts.map(({ verificationStatus, _count }) => ({ status: verificationStatus, count: _count._all })),
    }));

    if (existingFacility) {
      const details = await getSafeZone(existingFacility.id);
      expect(details).toMatchObject({
        id: existingFacility.id,
        latitude: existingFacility.latitude,
        longitude: existingFacility.longitude,
      });
      expect(details?.name).toEqual(expect.any(String));
      expect(details?.category).toEqual(expect.any(String));
      expect(details?.address).toEqual(expect.any(String));
      expect(details?.verificationStatus).toEqual(expect.any(String));
    }

    if (verifiedFacility) {
      const nearby = await searchSafeZones({
        latitude: verifiedFacility.latitude,
        longitude: verifiedFacility.longitude,
        radiusKm: 0.1,
        limit: 100,
      });
      expect(nearby.some((facility) => facility.id === verifiedFacility.id)).toBe(true);
      expect((await getSafeZone(verifiedFacility.id))?.id).toBe(verifiedFacility.id);
    }

    for (const demo of demoFacilities) {
      const [publicResults, demoInclusiveResults, details] = await Promise.all([
        searchSafeZones({ latitude: demo.latitude, longitude: demo.longitude, radiusKm: 1, includeDemo: false }),
        searchSafeZones({ latitude: demo.latitude, longitude: demo.longitude, radiusKm: 1, includeDemo: true }),
        getSafeZone(demo.id),
      ]);
      expect(publicResults.every((facility) => facility.verificationStatus !== 'DEMO')).toBe(true);
      expect(demoInclusiveResults.some((facility) => facility.id === demo.id && facility.verificationStatus === 'DEMO')).toBe(true);
      expect(details).toMatchObject({
        id: demo.id,
        latitude: demo.latitude,
        longitude: demo.longitude,
        verificationStatus: 'DEMO',
      });
      expect(details?.name).toEqual(expect.any(String));
      expect(details?.category).toEqual(expect.any(String));
      expect(details?.address).toEqual(expect.any(String));
    }
    console.info('Read-only Safe Zone checks', JSON.stringify({
      demoFacilities: demoFacilities.length,
      publicDiscoveryExcludesDemo: true,
      demoInclusiveDiscoveryIncludesEachDemo: true,
      existingFacilityDetailsLookup: Boolean(existingFacility),
    }));
  });
});
