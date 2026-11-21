import type { AdvisoryLevel, WorkerProfile } from '../types/index.js';
import { HEAT_RULES, LEVELS } from '../constants/heat-rules.js';

export function occupationalAssessment(profile: WorkerProfile, environmentalLevel: AdvisoryLevel, temperatureC: number | null) {
  const factors: string[] = [];
  if (profile.workload === 'HEAVY') factors.push('HEAVY_WORKLOAD');
  if (profile.workload === 'MODERATE') factors.push('MODERATE_WORKLOAD');
  if (profile.environment === 'DIRECT_SUNLIGHT') factors.push('DIRECT_SUNLIGHT');
  if (profile.environment === 'PARTIAL_SHADE') factors.push('PARTIAL_SHADE');
  if (profile.waterAccess === 'LIMITED') factors.push('LIMITED_WATER');
  if (profile.waterAccess === 'UNAVAILABLE') factors.push('NO_WATER');
  if (profile.shadeAccess === 'LIMITED') factors.push('LIMITED_SHADE');
  if (profile.shadeAccess === 'UNAVAILABLE') factors.push('NO_SHADE');
  if (profile.scheduleFlexibility === 'FIXED') factors.push('FIXED_SCHEDULE');
  if (profile.scheduleFlexibility === 'EMPLOYER_CONTROLLED') factors.push('EMPLOYER_CONTROLLED_SCHEDULE');
  if (environmentalLevel === 'UNKNOWN') return { factors, advisoryLevel: 'UNKNOWN' as const };
  // One-step escalation for heavy/direct-sun work, or joint lack of water and shade.
  // Schedule/economic constraints never reduce exposure; protections never subtract a level.
  const escalate = temperatureC !== null && temperatureC >= HEAT_RULES.occupationalEscalationStartsC &&
    (profile.workload === 'HEAVY' || profile.environment === 'DIRECT_SUNLIGHT' ||
      (profile.waterAccess !== 'AVAILABLE' && profile.shadeAccess !== 'AVAILABLE'));
  const index = LEVELS.indexOf(environmentalLevel);
  const advisoryLevel = LEVELS[Math.min(index + (escalate ? 1 : 0), LEVELS.length - 1)]!;
  return { factors, advisoryLevel };
}
