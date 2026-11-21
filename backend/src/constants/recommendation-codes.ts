import type { Recommendation } from '../types/index.js';
export type RecommendationCode = Recommendation['code'];
export const PRIORITY_ORDER: Record<Recommendation['priority'], number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
