import { describe, expect, it } from 'vitest';
import { createProtectionPlan } from '../src/services/protection.service.js';
import { now, profile, weather } from './fixtures.js';

describe('protection timeline', () => {
  it('clips partial-hour boundaries and preserves complete coverage', () => {
    const plan = createProtectionPlan({ ...profile, workStart: '09:15', workEnd: '11:45' }, weather(), now);
    expect(plan.timeline).toHaveLength(3);
    expect(plan.timeline[0]!.start).toBe('2026-11-21T09:15:00.000+05:30');
    expect(plan.timeline.at(-1)!.end).toBe('2026-11-21T11:45:00.000+05:30');
    expect(plan.timeline.every(p => p.availability === 'AVAILABLE')).toBe(true);
    for (let i = 1; i < plan.timeline.length; i++) expect(plan.timeline[i]!.start).toBe(plan.timeline[i - 1]!.end);
  });
  it('marks missing forecast periods unavailable without filling weather', () => {
    const input = weather(); input.hourly = input.hourly.filter(row => !row.time.includes('T10:'));
    const plan = createProtectionPlan({ ...profile, workEnd: '12:00' }, input, now);
    const missing = plan.timeline.find(p => p.start.includes('T10:'))!;
    expect(missing.availability).toBe('UNAVAILABLE');
    expect(missing.advisoryLevel).toBe('UNKNOWN');
    expect(missing.temperatureC).toBeNull();
  });
  it('handles empty, invalid and duplicate forecast periods conservatively', () => {
    const empty = createProtectionPlan(profile, { ...weather(), hourly: [] }, now);
    expect(empty.timeline).toHaveLength(1);
    expect(empty.timeline[0]!.availability).toBe('UNAVAILABLE');
    const input = weather(); input.hourly.push({ ...input.hourly[9]! });
    const plan = createProtectionPlan(profile, input, now);
    expect(plan.timeline.find(p => p.start.includes('T09:'))!.availability).toBe('UNAVAILABLE');
    input.hourly[10]!.temperatureC = 100;
    expect(createProtectionPlan(profile, input, now).timeline.find(p => p.start.includes('T10:'))!.availability).toBe('UNAVAILABLE');
  });
  it('rejects stale forecasts while permitting future forecast periods', () => {
    const input = weather(); input.fetchedAt = '2026-11-20T23:00:00Z';
    expect(createProtectionPlan(profile, input, now).timeline.every(p => p.advisoryLevel === 'UNKNOWN')).toBe(true);
    expect(createProtectionPlan(profile, weather(), now).timeline.at(-1)!.advisoryLevel).not.toBe('UNKNOWN');
  });
  it('only offers optional schedule advice to flexible workers', () => {
    expect(createProtectionPlan(profile, weather(), now).optionalScheduleAdvice).toEqual([]);
    expect(createProtectionPlan({ ...profile, scheduleFlexibility: 'FLEXIBLE' }, weather(), now).optionalScheduleAdvice).toHaveLength(1);
  });
  it('uses the worker local date rather than the UTC date', () => {
    const localNow = new Date('2026-11-20T20:00:00Z');
    const input = weather(); input.fetchedAt = localNow.toISOString();
    expect(createProtectionPlan(profile, input, localNow).workDate).toBe('2026-11-21');
  });
  it('converts offset-bearing forecasts from another timezone', () => {
    const input = weather(); input.timezone = 'UTC';
    input.hourly = [{ time: '2026-11-21T03:30:00Z', temperatureC: 32, humidityPercent: 50 }];
    const plan = createProtectionPlan({ ...profile, workEnd: '10:00' }, input, now);
    expect(plan.timeline[0]!.availability).toBe('AVAILABLE');
  });
  it('rejects nonexistent and ambiguous DST schedule boundaries', () => {
    const dstProfile = { ...profile, workStart: '02:30', workEnd: '04:00', location: { ...profile.location, timezone: 'America/New_York' } };
    expect(() => createProtectionPlan(dstProfile, weather(), new Date('2026-03-08T06:00:00Z'))).toThrow('ambiguous');
    expect(() => createProtectionPlan({ ...dstProfile, workStart: '01:30' }, weather(), new Date('2026-11-01T05:00:00Z'))).toThrow('ambiguous');
  });
});
