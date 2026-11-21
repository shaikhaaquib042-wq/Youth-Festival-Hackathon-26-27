import type { AdvisoryLevel, Recommendation, WorkerProfile } from '../types/index.js';
import type { RecommendationCode } from '../constants/recommendation-codes.js';
import { PRIORITY_ORDER } from '../constants/recommendation-codes.js';

export function recommendations(profile: WorkerProfile, level: AdvisoryLevel): Recommendation[] {
  const result: Recommendation[] = [];
  const add = (code: RecommendationCode, priority: Recommendation['priority']) => result.push({ code, priority });
  if (level === 'CRITICAL') add('STOP_UNSAFE_ACTIVITY', 'CRITICAL');
  if (level === 'UNKNOWN') add('STOP_UNSAFE_ACTIVITY', 'HIGH');
  add('MONITOR_SYMPTOMS', level === 'CRITICAL' ? 'HIGH' : 'MEDIUM');
  add('MAINTAIN_HYDRATION', 'MEDIUM');
  if (profile.waterAccess !== 'AVAILABLE') add('IMPROVE_WATER_ACCESS', 'HIGH');
  if (profile.shadeAccess !== 'AVAILABLE' || profile.environment === 'DIRECT_SUNLIGHT') add('ARRANGE_SHADED_RECOVERY', 'HIGH');
  if (level === 'HIGH' || level === 'CRITICAL' || level === 'UNKNOWN' || profile.workload === 'HEAVY') {
    add('REDUCE_STRENUOUS_ACTIVITY', 'HIGH');
    if (profile.alternativeDutiesAvailable) add('CONSIDER_ALTERNATIVE_DUTIES', 'HIGH');
  }
  if (profile.scheduleFlexibility !== 'FLEXIBLE' || level === 'HIGH' || level === 'CRITICAL' || level === 'UNKNOWN') {
    add('ESCALATE_TO_SUPERVISOR', 'HIGH');
  }
  if (profile.waterAccess !== 'AVAILABLE' || profile.shadeAccess !== 'AVAILABLE' || level === 'CRITICAL' || level === 'UNKNOWN') add('FIND_COOLING_RESOURCE', 'HIGH');
  // No symptom input is supported: emergency diagnoses or detection must not be inferred.
  return result.sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);
}
