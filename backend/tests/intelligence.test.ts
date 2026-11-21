import { describe, expect, it } from 'vitest';
import { heatIndexC } from '../src/utils/heat-index.js';
import { assessHeat } from '../src/services/heat-engine.service.js';
import { evaluateSimulation } from '../src/services/simulation.service.js';
import { workerProfileSchema, weatherResponseSchema, assessmentResponseSchema } from '../src/schemas/shared.schema.js';
import { simulationRequestSchema } from '../src/schemas/simulation.schema.js';
import { now, profile, weather } from './fixtures.js';

describe('shared contracts', () => {
  it('validates the TRD profile and weather fixture', () => {
    expect(workerProfileSchema.parse(profile)).toEqual(profile);
    expect(weatherResponseSchema.parse(weather())).toEqual(weather());
  });
  it.each([
    { workStart: '25:00' }, { workEnd: '08:00' }, { workEnd: '09:00' },
    { workload: 'EXTREME' }, { language: 'fr' }, { extra: true },
    { location: { ...profile.location, latitude: 91 } },
    { location: { ...profile.location, timezone: 'Invalid/Zone' } },
  ])('rejects invalid profile %j', change => {
    expect(workerProfileSchema.safeParse({ ...profile, ...change }).success).toBe(false);
  });
  it.each([
    { temperatureC: 100, humidityPercent: 50, windSpeedKmh: 5 },
    { temperatureC: 40, humidityPercent: -1, windSpeedKmh: 5 },
    { temperatureC: 40, humidityPercent: 101, windSpeedKmh: 5 },
    { temperatureC: 40, humidityPercent: 50, windSpeedKmh: -1 },
  ])('rejects invalid simulated weather %j', weatherOverride => {
    expect(simulationRequestSchema.safeParse({ profile, weatherOverride }).success).toBe(false);
  });
});

describe('NWS heat index', () => {
  const celsius = (f: number) => (f - 32) * 5 / 9;
  it('matches the NWS regression at 90 F / 85% (~117 F)', () => {
    expect(heatIndexC(celsius(90), 85)).toBeCloseTo(celsius(117.47), 1);
  });
  it('applies the low humidity adjustment at 100 F / 10%', () => {
    expect(heatIndexC(celsius(100), 10)).toBeCloseTo(celsius(94.12248), 4);
  });
  it('applies the high humidity adjustment at 85 F / 90%', () => {
    expect(heatIndexC(celsius(85), 90)).toBeCloseTo(celsius(101.78), 1);
  });
  it.each([[20, 50], [26, 100], [45, 50], [35, 100]])('does not extrapolate outside the documented reporting envelope (%s C / %s%%)', (t, rh) => {
    expect(heatIndexC(t, rh)).toBeNull();
  });
  it.each([[NaN, 50], [Infinity, 50], [30, -1], [30, 101], [-100, 20]])('rejects invalid input', (t, rh) => {
    expect(() => heatIndexC(t, rh)).toThrow(RangeError);
  });
  it('uses the simple-temperature average screening at the lower boundary', () => {
    expect(heatIndexC(celsius(80), 0)).toBeNull();
    expect(heatIndexC(celsius(80), 90)).not.toBeNull();
    expect(heatIndexC(celsius(112), 10)).not.toBeNull();
    expect(heatIndexC(celsius(112.01), 10)).toBeNull();
  });
});

describe('adaptive engine', () => {
  const assess = (input = weather()) => assessHeat(profile, input, { now });
  it('is deterministic and conforms to the assessment contract', () => {
    expect(assess()).toEqual(assess());
    expect(assessmentResponseSchema.safeParse(assess()).success).toBe(true);
  });
  it('returns UNKNOWN for missing essential weather', () => {
    expect(assessHeat(profile, null, { now }).assessment.advisoryLevel).toBe('UNKNOWN');
    expect(assess({ ...weather(), current: null }).assessment.advisoryLevel).toBe('UNKNOWN');
  });
  it('returns UNKNOWN for invalid observations', () => {
    const input = weather(); input.current!.humidityPercent = 101;
    expect(assess(input).assessment.advisoryLevel).toBe('UNKNOWN');
  });
  it('rejects stale weather and future observations', () => {
    const input = weather(); input.current!.observedAt = '2026-11-21T02:29:59Z';
    expect(assess(input).assessment.limitations).toContain('STALE_WEATHER');
    input.current!.observedAt = '2026-11-21T03:36:00Z';
    expect(assess(input).assessment.advisoryLevel).toBe('UNKNOWN');
  });
  it('accepts the exact observation-age boundary', () => {
    const input = weather(); input.current!.observedAt = '2026-11-21T02:30:00Z';
    expect(assess(input).assessment.advisoryLevel).not.toBe('UNKNOWN');
  });
  it('never hides an old observation behind a fresh cache fetch', () => {
    const input = weather(); input.dataMode = 'CACHED'; input.current!.observedAt = '2026-11-21T01:00:00Z';
    expect(assess(input).assessment.advisoryLevel).toBe('UNKNOWN');
  });
  it('keeps environmental indicators separate from heavy-work escalation', () => {
    const light = { ...profile, workload: 'LIGHT' as const, environment: 'MOSTLY_SHADED' as const, waterAccess: 'AVAILABLE' as const, shadeAccess: 'AVAILABLE' as const };
    const a = assessHeat(light, weather(30), { now }).assessment;
    const b = assessHeat({ ...light, workload: 'HEAVY' }, weather(30), { now }).assessment;
    expect(a.environmentalIndicators).toEqual(b.environmentalIndicators);
    expect(a.advisoryLevel).toBe('CAUTION');
    expect(b.advisoryLevel).toBe('ELEVATED');
  });
  it('adapts recommendations to water, shade and feasible duties', () => {
    const codes = assess().assessment.recommendations.map(r => r.code);
    expect(codes).toContain('IMPROVE_WATER_ACCESS');
    expect(codes).toContain('ARRANGE_SHADED_RECOVERY');
    expect(codes).not.toContain('CONSIDER_ALTERNATIVE_DUTIES');
    const feasible = assessHeat({ ...profile, alternativeDutiesAvailable: true }, weather(42), { now });
    expect(feasible.assessment.recommendations.map(r => r.code)).toContain('CONSIDER_ALTERNATIVE_DUTIES');
  });
  it('removes access interventions when water and shade are available', () => {
    const protectedProfile = { ...profile, environment: 'MOSTLY_SHADED' as const, waterAccess: 'AVAILABLE' as const, shadeAccess: 'AVAILABLE' as const };
    const codes = assessHeat(protectedProfile, weather(30), { now }).assessment.recommendations.map(r => r.code);
    expect(codes).not.toContain('IMPROVE_WATER_ACCESS');
    expect(codes).not.toContain('ARRANGE_SHADED_RECOVERY');
  });
  it('never lowers exposure for fixed or employer-controlled schedules', () => {
    const flexible = assessHeat({ ...profile, scheduleFlexibility: 'FLEXIBLE' }, weather(), { now });
    expect(assess().assessment.advisoryLevel).toEqual(flexible.assessment.advisoryLevel);
    expect(assess().assessment.recommendations.map(r => r.code)).toContain('ESCALATE_TO_SUPERVISOR');
  });
  it('prioritizes stopping for extreme dry heat even without a heat index', () => {
    const result = assess(weather(50, 10)).assessment;
    expect(result.advisoryLevel).toBe('CRITICAL');
    expect(result.environmentalIndicators.heatIndexC).toBeNull();
    expect(result.recommendations[0]!.code).toBe('STOP_UNSAFE_ACTIVITY');
  });
  it('prioritizes extreme humid heat beyond the regression envelope', () => {
    expect(assess(weather(35, 100)).assessment.advisoryLevel).toBe('CRITICAL');
  });
  it('does not infer symptoms or emergency diagnoses', () => {
    expect(assess(weather(42)).assessment.recommendations.map(r => r.code)).not.toContain('SEEK_EMERGENCY_HELP');
    expect(assess().assessment.limitations).toContain('HYDRATION_ONLY_WHEN_CONSCIOUS_AND_ABLE_TO_SWALLOW');
  });
  it('uses identical assessment logic in LIVE, CACHED and SIMULATION modes', () => {
    const live = assessHeat(profile, weather(42, 65), { now });
    const cached = assessHeat(profile, { ...weather(42, 65), dataMode: 'CACHED' }, { now });
    const sim = evaluateSimulation({ profile, weatherOverride: { temperatureC: 42, humidityPercent: 65, windSpeedKmh: 5 } }, now);
    for (const result of [cached, sim]) {
      expect(result.assessment.advisoryLevel).toEqual(live.assessment.advisoryLevel);
      expect(result.assessment.recommendations).toEqual(live.assessment.recommendations);
      expect(result.assessment.environmentalIndicators).toEqual(live.assessment.environmentalIndicators);
    }
  });
});
