import { describe, expect, it } from 'vitest';
import {
  assessmentResponseSchema,
  conditionsSchema,
  facilitySchema,
  submissionSchema,
  weatherSchema,
  workerSchema,
} from '../src/schemas/contracts';
import { constructionScenario } from '../src/constants/options';
import { restoreProfile, PROFILE_STORAGE_KEY } from '../src/utils/storage';
import { directionsUrl, safeExternalUrl } from '../src/utils/safety';
import en from '../src/locales/en.json';
import hi from '../src/locales/hi.json';
import mr from '../src/locales/mr.json';
import heavy from '../../backend/examples/integration/heatlab-heavy.response.json';
import { demoFacilities } from '../src/mocks/demo';

describe('runtime contract boundaries', () => {
  it('accepts the real backend assessment without inventing fields', () => {
    expect(assessmentResponseSchema.parse(heavy).assessment.advisoryLevel).toBe('CRITICAL');
  });
  it('preserves nullable and absent weather metrics without turning them into zero', () => {
    const value = weatherSchema.parse({
      dataMode: 'CACHED',
      source: 'Provider',
      timezone: 'Asia/Kolkata',
      fetchedAt: '2026-11-21T09:00:00Z',
      current: null,
      hourly: [{ time: '2026-11-21T10:00', temperatureC: 35, humidityPercent: 50 }],
    });
    expect(value.current).toBeNull();
    expect(value.hourly[0].windSpeedKmh).toBeUndefined();
  });
  it.each([
    { workEnd: '08:00' },
    { workEnd: '09:00' },
    { workStart: '25:00' },
    { occupation: 'INVALID' },
    { location: null },
  ])('rejects incomplete/invalid worker input %j', (change) => {
    expect(workerSchema.safeParse({ ...constructionScenario, ...change }).success).toBe(false);
  });
  it.each([
    { temperatureC: 70, humidityPercent: 50, windSpeedKmh: 5 },
    { temperatureC: 35, humidityPercent: 101, windSpeedKmh: 5 },
    { temperatureC: 35, humidityPercent: 50, windSpeedKmh: -1 },
  ])('rejects invalid simulations', (input) =>
    expect(conditionsSchema.safeParse(input).success).toBe(false),
  );
  it('accepts canonical category and rejects invalid marker coordinates', () => {
    expect(
      facilitySchema.safeParse({ ...demoFacilities[0], category: 'SHADED_REST_AREA' }).success,
    ).toBe(true);
    expect(facilitySchema.safeParse({ ...demoFacilities[0], latitude: 91 }).success).toBe(false);
  });
  it('rejects public verification assignment', () => {
    expect(
      submissionSchema.safeParse({
        name: 'Water',
        category: 'DRINKING_WATER',
        latitude: 18,
        longitude: 73,
        address: 'Pune',
        waterAvailable: true,
        shadeAvailable: false,
        seatingAvailable: false,
        verificationStatus: 'VERIFIED',
      }).success,
    ).toBe(false);
  });
});
describe('storage and URL safety', () => {
  it('restores only a complete validated profile', () => {
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(constructionScenario));
    expect(restoreProfile(localStorage)).toEqual(constructionScenario);
    localStorage.setItem(PROFILE_STORAGE_KEY, '{}');
    expect(restoreProfile(localStorage)).toBeNull();
  });
  it('tolerates corrupted or blocked storage', () => {
    localStorage.setItem(PROFILE_STORAGE_KEY, '{');
    expect(restoreProfile(localStorage)).toBeNull();
    expect(
      restoreProfile({
        getItem: () => {
          throw new Error('blocked');
        },
      }),
    ).toBeNull();
  });
  it.each([
    'javascript:alert(1)',
    'data:text/html,evil',
    'https://evil.test/',
    'https://evil@www.openstreetmap.org/',
  ])('rejects unsafe external URL %s', (value) => expect(safeExternalUrl(value)).toBeUndefined());
  it('builds directions from real coordinates only', () => {
    expect(directionsUrl(constructionScenario.location, { latitude: 19, longitude: 73 })).toMatch(
      /^https:\/\/www.openstreetmap.org\/directions/,
    );
    expect(
      directionsUrl(constructionScenario.location, { latitude: NaN, longitude: 73 }),
    ).toBeUndefined();
  });
});
describe('translation completeness', () => {
  it.each([hi, mr])('contains the same complete key inventory as English', (resource) =>
    expect(Object.keys(resource).sort()).toEqual(Object.keys(en).sort()),
  );
  it.each([en, hi, mr])(
    'has explicit critical, hydration, factor and limitation text',
    (resource) => {
      expect(resource['recommendation.STOP_UNSAFE_ACTIVITY']).toBeTruthy();
      expect(resource['recommendation.MAINTAIN_HYDRATION']).toBeTruthy();
      expect(resource['factor.DIRECT_SUNLIGHT']).toBeTruthy();
      expect(resource['limit.NOT_PERMISSION_TO_CONTINUE_WORK']).toBeTruthy();
    },
  );
});
